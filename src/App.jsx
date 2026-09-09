import React, { useState, useEffect, useMemo } from "react";
import {
  collection, doc, setDoc, getDocs, deleteDoc, getDoc, query, orderBy,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import "./App.css";

/* ======================================================================
   SIMULADOR FISCAL DIDÁTICO — CEDUP HERMANN HERING
   Emissão simulada de NF-e/NFS-e, manual ou automática, em lote, com
   impressão/PDF real (window.print, funciona normalmente aqui pois é
   site publicado, sem sandbox de artefato) e persistência no Firestore.
   Nenhum documento tem validade fiscal nem é transmitido a órgão oficial.
   ====================================================================== */

/* ---------------- Tributos e transição da Reforma Tributária ---------------- */

const TRIBUTOS_META = {
  icms: { label: "ICMS", tipo: "embutido" },
  ipi: { label: "IPI", tipo: "por_fora" },
  pis: { label: "PIS", tipo: "embutido" },
  cofins: { label: "COFINS", tipo: "embutido" },
  iss: { label: "ISS", tipo: "embutido" },
  cbs: { label: "CBS", tipo: "por_fora" },
  ibs: { label: "IBS", tipo: "por_fora" },
};

const REGIMES_TRANSICAO = [
  {
    id: "2026", rotulo: "2026 — Fase de teste (LC 214/2025)",
    aliquotas: { icms: 18, ipi: 10, pis: 1.65, cofins: 7.6, iss: 5, cbs: 0.9, ibs: 0.1 },
    contabilizar: { icms: true, ipi: true, pis: true, cofins: true, iss: true, cbs: false, ibs: false },
    nota: "CBS (0,9%) e IBS (0,1%) aparecem destacados no documento, mas não geram cobrança nem entram no lançamento contábil neste período — a contabilização segue a sistemática vigente (ICMS, IPI, PIS, COFINS, ISS).",
  },
  {
    id: "2027", rotulo: "2027–2028 — CBS em vigor plena",
    aliquotas: { icms: 18, ipi: 0, pis: 0, cofins: 0, iss: 5, cbs: 8.8, ibs: 0.1 },
    contabilizar: { icms: true, ipi: false, pis: false, cofins: false, iss: true, cbs: true, ibs: false },
    nota: "CBS substitui PIS e COFINS (extintos) em alíquota cheia. IPI é zerado para a maioria dos produtos. ICMS e ISS seguem vigentes. Valores estimados para fins didáticos.",
  },
  {
    id: "2029", rotulo: "2029–2032 — Transição do IBS",
    aliquotas: { icms: 12, ipi: 0, pis: 0, cofins: 0, iss: 3, cbs: 8.8, ibs: 8.85 },
    contabilizar: { icms: true, ipi: false, pis: false, cofins: false, iss: true, cbs: true, ibs: true },
    nota: "ICMS e ISS reduzem gradualmente enquanto o IBS assume parte da carga tributária. Alíquotas estimadas — ajuste conforme o ano exato a simular.",
  },
  {
    id: "2033", rotulo: "2033 — Regime pleno (ICMS e ISS extintos)",
    aliquotas: { icms: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, cbs: 8.8, ibs: 17.7 },
    contabilizar: { icms: false, ipi: false, pis: false, cofins: false, iss: false, cbs: true, ibs: true },
    nota: "ICMS e ISS extintos. CBS e IBS são os únicos tributos sobre o consumo. Alíquota combinada de referência estimada entre 26,5% e 28% — valor oficial definitivo ainda não fixado.",
  },
];
const regimePorId = (id) => REGIMES_TRANSICAO.find((r) => r.id === id) || REGIMES_TRANSICAO[0];

const NIVEIS = {
  basica: { rotulo: "Contabilidade Básica", tributosExtras: [], usaST: false, usaFreteSeguro: false, usaDesconto: false, qtdItens: [1, 2] },
  intermediaria: { rotulo: "Contabilidade Intermediária", tributosExtras: ["ipi", "pis", "cofins"], usaST: false, usaFreteSeguro: true, usaDesconto: true, qtdItens: [2, 3] },
  avancada: { rotulo: "Contabilidade Avançada", tributosExtras: ["ipi", "pis", "cofins"], usaST: true, usaFreteSeguro: true, usaDesconto: true, qtdItens: [3, 4] },
};
const camposNFe = (nivelKey) => ["icms", ...NIVEIS[nivelKey].tributosExtras, "cbs", "ibs"];
const CAMPOS_NFSE = ["iss", "cbs", "ibs"];

/* ---------------- Dados fictícios para geração automática ---------------- */

const EMPRESAS = ["Comercial Boa Vista Ltda", "Distribuidora Sul Mercantil S.A.", "Indústria Cerrado de Alimentos Ltda",
  "Atacado Rio Claro Eireli", "Mercantil Estrela do Sul Ltda", "Comércio Vale Verde S.A.", "Papelaria Nova Era Ltda",
  "Móveis Horizonte Indústria Ltda", "Confecções Bela Vista Ltda", "Ferragens Central Comércio Ltda"];

const PRODUTOS = [["Caneta esferográfica", 3.5, 12.0], ["Caderno universitário 200fls", 12.0, 35.0],
  ["Resma de papel A4", 18.0, 32.0], ["Cadeira de escritório", 180.0, 420.0], ["Mesa de escritório", 320.0, 650.0],
  ["Monitor 24 polegadas", 550.0, 900.0], ["Teclado sem fio", 60.0, 130.0], ["Camiseta algodão", 15.0, 45.0],
  ["Calça jeans", 45.0, 110.0], ["Parafusadeira elétrica", 150.0, 320.0], ["Tinta látex 18L", 90.0, 180.0], ["Pneu aro 15", 220.0, 380.0]];

const SERVICOS = [["Assessoria contábil mensal", 800.0, 3500.0], ["Consultoria em gestão empresarial", 1500.0, 6000.0],
  ["Manutenção de equipamentos de informática", 300.0, 1200.0], ["Auditoria contábil trimestral", 2500.0, 8000.0],
  ["Serviços de limpeza predial", 1200.0, 4000.0]];

const CIDADES = ["São Paulo/SP", "Curitiba/PR", "Belo Horizonte/MG", "Porto Alegre/RS", "Salvador/BA", "Florianópolis/SC"];

const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndFloat = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const escolher = (arr) => arr[rndInt(0, arr.length - 1)];
const amostra = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const cnpjFake = () => { const n = (k) => Array.from({ length: k }, () => rndInt(0, 9)).join(""); return `${n(2)}.${n(3)}.${n(3)}/0001-${n(2)}`; };
const dataRecente = () => { const d = new Date(); d.setDate(d.getDate() - rndInt(0, 25)); return d.toLocaleDateString("pt-BR"); };

/* ---------------- Cálculos fiscais ---------------- */

const fmt = (v) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function calcularItemProduto(item, aliquotas) {
  const base = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
  const valores = {};
  Object.keys(TRIBUTOS_META).forEach((k) => { valores[k] = (base * (Number(aliquotas[k]) || 0)) / 100; });
  return { base, ...valores };
}

function calcularICMSST(baseItem, ipiItem, aliquotaICMS, mvaST) {
  const mva = (Number(mvaST) || 0) / 100;
  const icmsProprio = (baseItem * (Number(aliquotaICMS) || 0)) / 100;
  const baseST = (baseItem + ipiItem) * (1 + mva);
  const icmsSTTotal = (baseST * (Number(aliquotaICMS) || 0)) / 100;
  return Math.max(icmsSTTotal - icmsProprio, 0);
}

function totalizarDocumentoNFe(itens, aliquotas, contabilizar, opts = {}) {
  const { usaST = false, mvaST = 0, descontoPct = 0, frete = 0, seguro = 0 } = opts;
  const tot = { base: 0, icmsST: 0 };
  Object.keys(TRIBUTOS_META).forEach((k) => (tot[k] = 0));
  itens.forEach((item) => {
    const c = calcularItemProduto(item, aliquotas);
    tot.base += c.base;
    Object.keys(TRIBUTOS_META).forEach((k) => (tot[k] += c[k]));
    if (usaST) tot.icmsST += calcularICMSST(c.base, c.ipi, aliquotas.icms, mvaST);
  });
  const valorDesconto = (tot.base * (Number(descontoPct) || 0)) / 100;
  let totalNota = tot.base - valorDesconto;
  Object.keys(TRIBUTOS_META).forEach((k) => { if (TRIBUTOS_META[k].tipo === "por_fora" && contabilizar[k]) totalNota += tot[k]; });
  totalNota += tot.icmsST + (Number(frete) || 0) + (Number(seguro) || 0);
  return { ...tot, valorDesconto, descontoPct: Number(descontoPct) || 0, frete: Number(frete) || 0, seguro: Number(seguro) || 0, mvaST: Number(mvaST) || 0, totalNota };
}

function calcularServicoNFSe(valorServico, aliquotas, contabilizar) {
  const base = Number(valorServico) || 0;
  const iss = (base * (Number(aliquotas.iss) || 0)) / 100;
  const cbs = (base * (Number(aliquotas.cbs) || 0)) / 100;
  const ibs = (base * (Number(aliquotas.ibs) || 0)) / 100;
  let totalNota = base;
  if (contabilizar.cbs) totalNota += cbs;
  if (contabilizar.ibs) totalNota += ibs;
  return { base, iss, cbs, ibs, totalNota };
}

/* ---------------- Geração automática ---------------- */

function gerarDocumentoAutomatico({ tipoDoc, nivelKey, operacao, regimeId, turma, uidCriador }) {
  const regime = regimePorId(regimeId);
  const nivel = NIVEIS[nivelKey];

  if (tipoDoc === "nfse") {
    const prestador = { nome: escolher(EMPRESAS), cnpj: cnpjFake(), cidade: escolher(CIDADES) };
    let tomador = { nome: escolher(EMPRESAS), cnpj: cnpjFake(), cidade: escolher(CIDADES) };
    while (tomador.nome === prestador.nome) tomador = { ...tomador, nome: escolher(EMPRESAS) };
    const [descricao, vmin, vmax] = escolher(SERVICOS);
    const valorServico = rndFloat(vmin, vmax);
    const calc = calcularServicoNFSe(valorServico, regime.aliquotas, regime.contabilizar);
    return { id: uid(), timestamp: Date.now(), data: dataRecente(), tipo: "NFS-e", turma, nivel: nivelKey,
      nivelRotulo: nivel ? nivel.rotulo : "", regimeId, prestador, tomador, servico: descricao, valorServico,
      aliquotas: regime.aliquotas, contabilizar: regime.contabilizar, calc, uidCriador };
  }

  const emitente = { nome: escolher(EMPRESAS), cnpj: cnpjFake(), cidade: escolher(CIDADES) };
  let destinatario = { nome: escolher(EMPRESAS), cnpj: cnpjFake(), cidade: escolher(CIDADES) };
  while (destinatario.nome === emitente.nome) destinatario = { ...destinatario, nome: escolher(EMPRESAS) };

  const [qmin, qmax] = nivel.qtdItens;
  const itens = amostra(PRODUTOS, rndInt(qmin, qmax)).map(([desc, vmin, vmax]) => ({
    id: uid(), descricao: desc, cfop: operacao === "compra" ? "1102" : "5102",
    quantidade: rndInt(2, 20), valorUnitario: rndFloat(vmin, vmax),
  }));

  const descontoPct = nivel.usaDesconto ? escolher([0, 0, 5, 10]) : 0;
  const frete = nivel.usaFreteSeguro && Math.random() > 0.4 ? rndFloat(20, 150) : 0;
  const seguro = nivel.usaST && Math.random() > 0.5 ? rndFloat(10, 60) : 0;
  const mvaST = nivel.usaST ? 40 : 0;

  const totais = totalizarDocumentoNFe(itens, regime.aliquotas, regime.contabilizar, { usaST: nivel.usaST, mvaST, descontoPct, frete, seguro });

  return { id: uid(), timestamp: Date.now(), data: dataRecente(), tipo: "NF-e", operacao, turma, nivel: nivelKey,
    nivelRotulo: nivel.rotulo, regimeId, emitente, destinatario, itens, aliquotas: regime.aliquotas,
    contabilizar: regime.contabilizar, totais, uidCriador };
}

/* ---------------- Firestore ---------------- */

async function salvarDocumento(docObj) {
  try { await setDoc(doc(db, "documentos", docObj.id), docObj); return true; }
  catch (e) { console.error("Erro ao salvar documento:", e); return false; }
}
async function excluirDocumentoFirestore(id) {
  try { await deleteDoc(doc(db, "documentos", id)); return true; } catch (e) { return false; }
}
async function listarDocumentos() {
  try {
    const q = query(collection(db, "documentos"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (e) { console.error("Erro ao listar documentos:", e); return []; }
}
async function salvarCabecalhoFirestore(dataUrl) {
  try { await setDoc(doc(db, "config", "cabecalho"), { dataUrl }); return true; } catch (e) { return false; }
}
async function removerCabecalhoFirestore() {
  try { await deleteDoc(doc(db, "config", "cabecalho")); return true; } catch (e) { return false; }
}
async function carregarCabecalhoFirestore() {
  try { const snap = await getDoc(doc(db, "config", "cabecalho")); return snap.exists() ? snap.data().dataUrl : null; }
  catch (e) { return null; }
}

/* ======================================================================
   COMPONENTES BÁSICOS
   ====================================================================== */

function CampoNumero({ label, value, onChange, suffix, step = "0.01", min = "0" }) {
  return (
    <label className="sf-field">
      <span>{label}</span>
      <div className="sf-input-suffix">
        <input type="number" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}
function CampoTexto({ label, value, onChange, placeholder, required }) {
  return (
    <label className="sf-field">
      <span>{label}{required ? " *" : ""}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/* ---------------- Login (Google, via Firebase Auth) ---------------- */

function TelaLogin() {
  const [erro, setErro] = useState("");
  async function entrar() {
    setErro("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); setErro("Não foi possível entrar com o Google. Tente novamente."); }
  }
  return (
    <div className="sf-login-wrap">
      <div className="sf-login-card">
        <h1>Simulador Fiscal Didático</h1>
        <p className="sf-login-sub">
          CEDUP Hermann Hering — emissão simulada de NF-e e NFS-e para uso em lançamentos contábeis.
          Nenhum documento aqui gerado possui validade fiscal.
        </p>
        <button className="sf-btn-google" onClick={entrar}>Entrar com Google</button>
        {erro && <div className="sf-login-erro">{erro}</div>}
      </div>
    </div>
  );
}

/* ---------------- Regime tributário ---------------- */

function PainelRegimeTributario({ regimeId, setRegimeId, aliquotas, setAliquotas, contabilizar, setContabilizar, campos }) {
  const regime = regimePorId(regimeId);
  function aplicarRegime(id) {
    const r = regimePorId(id);
    setRegimeId(id);
    setAliquotas((prev) => { const novo = { ...prev }; campos.forEach((c) => (novo[c] = r.aliquotas[c])); return novo; });
    setContabilizar((prev) => { const novo = { ...prev }; campos.forEach((c) => (novo[c] = r.contabilizar[c])); return novo; });
  }
  return (
    <fieldset className="sf-aliquotas">
      <legend>Período / regime tributário</legend>
      <label className="sf-field"><span>Cronograma da Reforma Tributária</span>
        <select value={regimeId} onChange={(e) => aplicarRegime(e.target.value)}>
          {REGIMES_TRANSICAO.map((r) => (<option key={r.id} value={r.id}>{r.rotulo}</option>))}
        </select>
      </label>
      <p className="sf-nota">{regime.nota}</p>
      <div className="sf-aliquotas-grid">
        {campos.map((c) => (
          <div className="sf-tributo-campo" key={c}>
            <CampoNumero label={TRIBUTOS_META[c].label} value={aliquotas[c]} onChange={(v) => setAliquotas((prev) => ({ ...prev, [c]: v }))} suffix="%" step="0.01" />
            <label className="sf-checkbox sf-checkbox-tight">
              <input type="checkbox" checked={!!contabilizar[c]} onChange={(e) => setContabilizar((prev) => ({ ...prev, [c]: e.target.checked }))} />
              <span>Contabilizar {TRIBUTOS_META[c].tipo === "por_fora" ? "(somado por fora)" : "(embutido no preço)"}</span>
            </label>
          </div>
        ))}
      </div>
      <p className="sf-nota">Desmarque "contabilizar" para manter um tributo apenas informativo, sem afetar o valor total — é o comportamento padrão de CBS e IBS durante a fase de teste de 2026.</p>
    </fieldset>
  );
}

/* ---------------- Documento simulado (estilo DANFE) ---------------- */

function DanfeSimulado({ docData, cabecalho }) {
  const regime = regimePorId(docData.regimeId || "2026");
  const isServico = docData.tipo === "NFS-e";
  const nivelInfo = docData.nivelRotulo ? ` · ${docData.nivelRotulo}` : "";

  return (
    <div className="sf-danfe">
      <div className="sf-watermark" aria-hidden="true">SIMULAÇÃO — SEM VALOR FISCAL</div>
      {cabecalho && <div className="sf-danfe-cabecalho"><img src={cabecalho} alt="Cabeçalho institucional" /></div>}
      <div className="sf-danfe-header">
        <div>
          <strong>{docData.tipo}{docData.operacao ? ` — ${docData.operacao === "compra" ? "Compra" : "Venda"}` : ""}</strong>
          <div className="sf-danfe-num">Nº simulado {docData.id.slice(-8).toUpperCase()}{nivelInfo}</div>
        </div>
        <div className="sf-danfe-data"><div>Emissão: {docData.data}</div><div className="sf-danfe-regime">{regime.rotulo}</div></div>
      </div>

      {isServico ? (
        <>
          <div className="sf-danfe-linha"><span>Prestador</span><strong>{docData.prestador.nome}</strong></div>
          <div className="sf-danfe-linha"><span>Tomador</span><strong>{docData.tomador.nome}</strong></div>
          <div className="sf-danfe-linha"><span>Serviço</span><strong>{docData.servico}</strong></div>
          <table className="sf-danfe-table"><tbody>
            <tr><td>Valor do serviço</td><td>{fmt(docData.calc.base)}</td></tr>
            {CAMPOS_NFSE.map((c) => (<tr key={c}><td>{TRIBUTOS_META[c].label}{!docData.contabilizar[c] && " (informativo)"}</td><td>{fmt(docData.calc[c])}</td></tr>))}
          </tbody></table>
          <div className="sf-danfe-total">Total: {fmt(docData.calc.totalNota)}</div>
        </>
      ) : (
        <>
          <div className="sf-danfe-linha"><span>{docData.operacao === "compra" ? "Fornecedor" : "Emitente"}</span><strong>{docData.emitente.nome}</strong></div>
          <div className="sf-danfe-linha"><span>Destinatário</span><strong>{docData.destinatario.nome}</strong></div>
          <table className="sf-danfe-table">
            <thead><tr><th>Item</th><th>Qtd.</th><th>Vlr. unit.</th><th>Total</th></tr></thead>
            <tbody>
              {docData.itens.map((it) => (
                <tr key={it.id}><td>{it.descricao || "—"}</td><td>{it.quantidade}</td><td>{fmt(Number(it.valorUnitario))}</td><td>{fmt(Number(it.quantidade) * Number(it.valorUnitario))}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="sf-danfe-table sf-danfe-tributos"><tbody>
            <tr><td>Total dos produtos</td><td>{fmt(docData.totais.base)}</td></tr>
            {docData.totais.descontoPct > 0 && (<tr><td>Desconto ({docData.totais.descontoPct}%)</td><td>- {fmt(docData.totais.valorDesconto)}</td></tr>)}
            {camposNFe(docData.nivel || "avancada").filter((c) => docData.totais[c] !== undefined).map((c) => (
              <tr key={c}><td>{TRIBUTOS_META[c].label}{!docData.contabilizar[c] && " (informativo)"}</td><td>{fmt(docData.totais[c])}</td></tr>
            ))}
            {docData.totais.icmsST > 0 && (<tr><td>ICMS-ST (MVA {docData.totais.mvaST}%)</td><td>{fmt(docData.totais.icmsST)}</td></tr>)}
            {docData.totais.frete > 0 && (<tr><td>Frete</td><td>{fmt(docData.totais.frete)}</td></tr>)}
            {docData.totais.seguro > 0 && (<tr><td>Seguro</td><td>{fmt(docData.totais.seguro)}</td></tr>)}
          </tbody></table>
          <div className="sf-danfe-total">Total da nota: {fmt(docData.totais.totalNota)}</div>
        </>
      )}
      <p className="sf-danfe-rodape">Documento gerado exclusivamente para fins didáticos. Não possui validade fiscal, não substitui documento oficial e não é transmitido a nenhum órgão da Receita Federal, SEFAZ ou prefeitura.</p>
    </div>
  );
}

/* ======================================================================
   ABA: GERAR DOCUMENTOS
   ====================================================================== */

function novoItem() { return { id: uid(), descricao: "", cfop: "5102", quantidade: 1, valorUnitario: 0 }; }

function GerarDocumentos({ turma, uidCriador, onNovosDocumentos, cabecalho }) {
  const [modo, setModo] = useState("automatico");
  const [tipoDoc, setTipoDoc] = useState("nfe");
  const [nivelKey, setNivelKey] = useState("basica");
  const [operacao, setOperacao] = useState("venda");
  const [regimeId, setRegimeId] = useState("2026");
  const [quantidade, setQuantidade] = useState(5);
  const [gerando, setGerando] = useState(false);

  const nivel = NIVEIS[nivelKey];
  const campos = tipoDoc === "nfe" ? camposNFe(nivelKey) : CAMPOS_NFSE;
  const regimeAtual = regimePorId(regimeId);
  const [aliquotas, setAliquotas] = useState({ ...regimeAtual.aliquotas });
  const [contabilizar, setContabilizar] = useState({ ...regimeAtual.contabilizar });
  const [emitente, setEmitente] = useState({ nome: "", cnpj: "", cidade: "" });
  const [destinatario, setDestinatario] = useState({ nome: "", cnpj: "", cidade: "" });
  const [itens, setItens] = useState([novoItem()]);
  const [descontoPct, setDescontoPct] = useState(0);
  const [frete, setFrete] = useState(0);
  const [seguro, setSeguro] = useState(0);
  const [mvaST, setMvaST] = useState(40);
  const [servicoDescricao, setServicoDescricao] = useState("");
  const [valorServico, setValorServico] = useState(0);

  const totaisPrevia = useMemo(() => {
    if (tipoDoc === "nfe") return totalizarDocumentoNFe(itens, aliquotas, contabilizar, { usaST: nivel.usaST, mvaST, descontoPct, frete, seguro });
    return calcularServicoNFSe(valorServico, aliquotas, contabilizar);
  }, [tipoDoc, itens, aliquotas, contabilizar, nivel, mvaST, descontoPct, frete, seguro, valorServico]);

  function atualizarItem(id, campo, valor) { setItens((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it))); }
  function removerItem(id) { setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev)); }

  async function gerarAutomatico() {
    setGerando(true);
    const n = Math.min(Math.max(parseInt(quantidade, 10) || 1, 1), 40);
    const novos = [];
    for (let i = 0; i < n; i++) {
      const op = tipoDoc === "nfe" ? (operacao === "misto" ? (Math.random() > 0.5 ? "venda" : "compra") : operacao) : undefined;
      novos.push(gerarDocumentoAutomatico({ tipoDoc, nivelKey, operacao: op, regimeId, turma, uidCriador }));
    }
    await Promise.all(novos.map(salvarDocumento));
    setGerando(false);
    onNovosDocumentos(novos);
  }

  async function emitirManual() {
    if (tipoDoc === "nfe") {
      if (!emitente.nome.trim() || !destinatario.nome.trim()) { alert("Preencha ao menos o nome do emitente e do destinatário."); return; }
      setGerando(true);
      const totais = totalizarDocumentoNFe(itens, aliquotas, contabilizar, { usaST: nivel.usaST, mvaST, descontoPct, frete, seguro });
      const docObj = { id: uid(), timestamp: Date.now(), data: new Date().toLocaleDateString("pt-BR"), tipo: "NF-e",
        operacao, turma, nivel: nivelKey, nivelRotulo: nivel.rotulo, regimeId, emitente, destinatario, itens,
        aliquotas, contabilizar, totais, uidCriador };
      await salvarDocumento(docObj);
      setGerando(false);
      onNovosDocumentos([docObj]);
    } else {
      if (!emitente.nome.trim() || !destinatario.nome.trim() || !servicoDescricao.trim()) { alert("Preencha prestador, tomador e descrição do serviço."); return; }
      setGerando(true);
      const calc = calcularServicoNFSe(valorServico, aliquotas, contabilizar);
      const docObj = { id: uid(), timestamp: Date.now(), data: new Date().toLocaleDateString("pt-BR"), tipo: "NFS-e",
        turma, nivel: nivelKey, nivelRotulo: nivel.rotulo, regimeId, prestador: emitente, tomador: destinatario,
        servico: servicoDescricao, valorServico, aliquotas, contabilizar, calc, uidCriador };
      await salvarDocumento(docObj);
      setGerando(false);
      onNovosDocumentos([docObj]);
    }
  }

  return (
    <div className="sf-panel">
      <h2>Gerar documentos fiscais simulados</h2>
      <div className="sf-modo-toggle">
        <button className={`sf-modo-btn ${modo === "automatico" ? "sf-modo-ativo" : ""}`} onClick={() => setModo("automatico")}>Geração automática (lote)</button>
        <button className={`sf-modo-btn ${modo === "manual" ? "sf-modo-ativo" : ""}`} onClick={() => setModo("manual")}>Preenchimento manual</button>
      </div>

      <div className="sf-grid-2">
        <label className="sf-field"><span>Tipo de documento</span>
          <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
            <option value="nfe">NF-e (mercadorias)</option>
            <option value="nfse">NFS-e (serviços)</option>
          </select>
        </label>
        <label className="sf-field"><span>Nível / disciplina</span>
          <select value={nivelKey} onChange={(e) => setNivelKey(e.target.value)}>
            <option value="basica">Contabilidade Básica</option>
            <option value="intermediaria">Contabilidade Intermediária</option>
            <option value="avancada">Contabilidade Avançada</option>
          </select>
        </label>
      </div>

      {tipoDoc === "nfe" && (
        <label className="sf-field"><span>Operação</span>
          <select value={operacao} onChange={(e) => setOperacao(e.target.value)}>
            <option value="venda">Venda</option>
            <option value="compra">Compra</option>
            {modo === "automatico" && <option value="misto">Misto (metade venda, metade compra)</option>}
          </select>
        </label>
      )}

      {modo === "automatico" ? (
        <>
          <CampoNumero label="Quantidade de documentos a gerar" value={quantidade} onChange={setQuantidade} step="1" min="1" />
          <p className="sf-nota">As alíquotas e a regra de contabilização seguem o regime tributário selecionado abaixo. Emitentes, produtos e valores são fictícios e sorteados automaticamente, variando conforme o nível escolhido.</p>
          <PainelRegimeTributario regimeId={regimeId} setRegimeId={setRegimeId} aliquotas={aliquotas} setAliquotas={setAliquotas} contabilizar={contabilizar} setContabilizar={setContabilizar} campos={campos} />
          <button className="sf-btn-primary sf-btn-full sf-no-print" onClick={gerarAutomatico} disabled={gerando}>
            {gerando ? "Gerando..." : `Gerar ${quantidade} documento(s) automaticamente`}
          </button>
        </>
      ) : (
        <>
          <div className="sf-grid-2">
            <fieldset>
              <legend>{tipoDoc === "nfe" ? (operacao === "compra" ? "Fornecedor" : "Emitente") : "Prestador"}</legend>
              <CampoTexto label="Razão social" value={emitente.nome} onChange={(v) => setEmitente((p) => ({ ...p, nome: v }))} required />
              <CampoTexto label="CNPJ (simulado)" value={emitente.cnpj} onChange={(v) => setEmitente((p) => ({ ...p, cnpj: v }))} placeholder="00.000.000/0001-00" />
              <CampoTexto label="Cidade/UF" value={emitente.cidade} onChange={(v) => setEmitente((p) => ({ ...p, cidade: v }))} />
            </fieldset>
            <fieldset>
              <legend>{tipoDoc === "nfe" ? "Destinatário" : "Tomador"}</legend>
              <CampoTexto label="Nome / razão social" value={destinatario.nome} onChange={(v) => setDestinatario((p) => ({ ...p, nome: v }))} required />
              <CampoTexto label="CPF/CNPJ (simulado)" value={destinatario.cnpj} onChange={(v) => setDestinatario((p) => ({ ...p, cnpj: v }))} />
              <CampoTexto label="Cidade/UF" value={destinatario.cidade} onChange={(v) => setDestinatario((p) => ({ ...p, cidade: v }))} />
            </fieldset>
          </div>

          {tipoDoc === "nfe" ? (
            <fieldset>
              <legend>Itens da nota</legend>
              <div className="sf-itens-table">
                <div className="sf-itens-head"><span>Descrição</span><span>CFOP</span><span>Qtd.</span><span>Valor unit.</span><span>Total item</span><span></span></div>
                {itens.map((it) => {
                  const c = calcularItemProduto(it, aliquotas);
                  return (
                    <div className="sf-itens-row" key={it.id}>
                      <input type="text" value={it.descricao} placeholder="Ex.: Caneta esferográfica" onChange={(e) => atualizarItem(it.id, "descricao", e.target.value)} />
                      <input type="text" value={it.cfop} onChange={(e) => atualizarItem(it.id, "cfop", e.target.value)} />
                      <input type="number" min="0" step="1" value={it.quantidade} onChange={(e) => atualizarItem(it.id, "quantidade", e.target.value)} />
                      <input type="number" min="0" step="0.01" value={it.valorUnitario} onChange={(e) => atualizarItem(it.id, "valorUnitario", e.target.value)} />
                      <span className="sf-valor-calc">{fmt(c.base)}</span>
                      <button className="sf-btn-icon" onClick={() => removerItem(it.id)} title="Remover item">✕</button>
                    </div>
                  );
                })}
              </div>
              <button className="sf-btn-secondary" onClick={() => setItens((p) => [...p, novoItem()])}>+ Adicionar item</button>
              <div className="sf-grid-3">
                {nivel.usaDesconto && <CampoNumero label="Desconto" value={descontoPct} onChange={setDescontoPct} suffix="%" />}
                {nivel.usaFreteSeguro && <CampoNumero label="Frete" value={frete} onChange={setFrete} suffix="R$" />}
                {nivel.usaST && <CampoNumero label="Seguro" value={seguro} onChange={setSeguro} suffix="R$" />}
                {nivel.usaST && <CampoNumero label="MVA ICMS-ST" value={mvaST} onChange={setMvaST} suffix="%" />}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend>Serviço prestado</legend>
              <CampoTexto label="Descrição do serviço" value={servicoDescricao} onChange={setServicoDescricao} placeholder="Ex.: Assessoria contábil mensal" required />
              <CampoNumero label="Valor do serviço" value={valorServico} onChange={setValorServico} suffix="R$" />
            </fieldset>
          )}

          <PainelRegimeTributario regimeId={regimeId} setRegimeId={setRegimeId} aliquotas={aliquotas} setAliquotas={setAliquotas} contabilizar={contabilizar} setContabilizar={setContabilizar} campos={campos} />

          <div className="sf-totais">
            {tipoDoc === "nfe" ? (
              <>
                <div><span>Total dos produtos</span><strong>{fmt(totaisPrevia.base)}</strong></div>
                {totaisPrevia.descontoPct > 0 && <div><span>Desconto</span><strong>- {fmt(totaisPrevia.valorDesconto)}</strong></div>}
                {campos.map((c) => (<div key={c}><span>{TRIBUTOS_META[c].label}{!contabilizar[c] && <em className="sf-tag-info"> · informativo</em>}</span><strong>{fmt(totaisPrevia[c])}</strong></div>))}
                {totaisPrevia.icmsST > 0 && <div><span>ICMS-ST</span><strong>{fmt(totaisPrevia.icmsST)}</strong></div>}
                {totaisPrevia.frete > 0 && <div><span>Frete</span><strong>{fmt(totaisPrevia.frete)}</strong></div>}
                {totaisPrevia.seguro > 0 && <div><span>Seguro</span><strong>{fmt(totaisPrevia.seguro)}</strong></div>}
                <div className="sf-total-final"><span>Valor total da nota</span><strong>{fmt(totaisPrevia.totalNota)}</strong></div>
              </>
            ) : (
              <>
                <div><span>Valor do serviço</span><strong>{fmt(totaisPrevia.base)}</strong></div>
                {campos.map((c) => (<div key={c}><span>{TRIBUTOS_META[c].label}{!contabilizar[c] && <em className="sf-tag-info"> · informativo</em>}</span><strong>{fmt(totaisPrevia[c])}</strong></div>))}
                <div className="sf-total-final"><span>Valor total da nota</span><strong>{fmt(totaisPrevia.totalNota)}</strong></div>
              </>
            )}
          </div>

          <button className="sf-btn-primary sf-btn-full sf-no-print" onClick={emitirManual} disabled={gerando}>
            {gerando ? "Emitindo..." : "Emitir e adicionar ao histórico"}
          </button>
        </>
      )}
    </div>
  );
}

/* ======================================================================
   ABA: HISTÓRICO E IMPRESSÃO
   ====================================================================== */

function BatchPrintArea({ docs, cabecalho }) {
  return (
    <div className="sf-print-batch">
      {docs.map((d) => (<div className="sf-print-page" key={d.id}><DanfeSimulado docData={d} cabecalho={cabecalho} /></div>))}
    </div>
  );
}

function Historico({ documentos, setDocumentos, cabecalho }) {
  const [selecionados, setSelecionados] = useState(new Set());
  const [filtroTurma, setFiltroTurma] = useState("");
  const [expandido, setExpandido] = useState(null);

  const turmas = useMemo(() => Array.from(new Set(documentos.map((d) => d.turma).filter(Boolean))), [documentos]);
  const visiveis = filtroTurma ? documentos.filter((d) => d.turma === filtroTurma) : documentos;

  function alternar(id) { setSelecionados((prev) => { const novo = new Set(prev); novo.has(id) ? novo.delete(id) : novo.add(id); return novo; }); }
  function selecionarTodosVisiveis() { setSelecionados(new Set(visiveis.map((d) => d.id))); }
  function limparSelecao() { setSelecionados(new Set()); }

  async function excluirSelecionados() {
    if (!window.confirm(`Excluir ${selecionados.size} documento(s) do histórico?`)) return;
    await Promise.all(Array.from(selecionados).map(excluirDocumentoFirestore));
    setDocumentos((prev) => prev.filter((d) => !selecionados.has(d.id)));
    setSelecionados(new Set());
  }

  const docsParaImprimir = documentos.filter((d) => selecionados.has(d.id));
  const valorTotalSelecionado = docsParaImprimir.reduce((s, d) => s + (d.tipo === "NF-e" ? d.totais.totalNota : d.calc.totalNota), 0);

  return (
    <div className="sf-panel">
      <div className="sf-panel-head"><h2>Histórico e impressão</h2></div>
      {documentos.length === 0 ? (
        <p className="sf-vazio">Nenhum documento gerado ainda. Vá até "Gerar documentos" para começar.</p>
      ) : (
        <>
          <div className="sf-historico-toolbar sf-no-print">
            {turmas.length > 0 && (
              <label className="sf-field sf-field-inline"><span>Filtrar por turma/disciplina</span>
                <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}>
                  <option value="">Todas</option>{turmas.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </label>
            )}
            <div className="sf-historico-acoes">
              <button className="sf-btn-secondary" onClick={selecionarTodosVisiveis}>Selecionar todos</button>
              <button className="sf-btn-secondary" onClick={limparSelecao}>Limpar seleção</button>
              {selecionados.size > 0 && <button className="sf-btn-secondary sf-btn-perigo" onClick={excluirSelecionados}>Excluir selecionados</button>}
            </div>
          </div>

          <div className="sf-lista-docs">
            {visiveis.map((d) => {
              const total = d.tipo === "NF-e" ? d.totais.totalNota : d.calc.totalNota;
              const contraparte = d.tipo === "NF-e" ? d.destinatario.nome : d.tomador.nome;
              return (
                <div className="sf-doc-item" key={d.id}>
                  <div className="sf-doc-item-linha">
                    <label className="sf-doc-check"><input type="checkbox" checked={selecionados.has(d.id)} onChange={() => alternar(d.id)} /></label>
                    <div className="sf-doc-resumo-grid">
                      <span><strong>{d.tipo}</strong> {d.operacao ? `(${d.operacao})` : ""} — {d.data}</span>
                      <span>{d.nivelRotulo || "—"}{d.turma ? ` · ${d.turma}` : ""}</span>
                      <span>{contraparte}</span>
                      <span>{fmt(total)}</span>
                    </div>
                    <button className="sf-btn-link" onClick={() => setExpandido(expandido === d.id ? null : d.id)}>{expandido === d.id ? "Ocultar" : "Detalhes"}</button>
                  </div>
                  {expandido === d.id && <div className="sf-doc-detalhe"><DanfeSimulado docData={d} cabecalho={cabecalho} /></div>}
                </div>
              );
            })}
          </div>

          <div className="sf-imprimir-barra sf-no-print">
            <span>{selecionados.size} documento(s) selecionado(s) · total {fmt(valorTotalSelecionado)}</span>
            <button className="sf-btn-primary sf-btn-imprimir" disabled={selecionados.size === 0} onClick={() => window.print()}>
              🖨 Imprimir / Salvar como PDF ({selecionados.size})
            </button>
          </div>
          <BatchPrintArea docs={docsParaImprimir} cabecalho={cabecalho} />
        </>
      )}
    </div>
  );
}

/* ======================================================================
   ABA: CABEÇALHO INSTITUCIONAL
   ====================================================================== */

function ConfiguracaoCabecalho({ cabecalho, onAtualizar }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function selecionarArquivo(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 600 * 1024) { setErro("Imagem muito grande. Use um arquivo com até ~600 KB (limite do Firestore por documento)."); return; }
    setErro(""); setCarregando(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const ok = await salvarCabecalhoFirestore(dataUrl);
      if (ok) onAtualizar(dataUrl); else setErro("Não foi possível salvar o cabeçalho. Tente novamente.");
      setCarregando(false);
    };
    reader.onerror = () => { setErro("Erro ao ler o arquivo."); setCarregando(false); };
    reader.readAsDataURL(file);
  }
  async function remover() { setCarregando(true); await removerCabecalhoFirestore(); onAtualizar(null); setCarregando(false); }

  return (
    <div className="sf-panel">
      <h2>Cabeçalho institucional</h2>
      <p className="sf-sub">Envie uma imagem (logotipo, brasão, cabeçalho da escola) para aparecer no topo de todas as NF-e e NFS-e simuladas emitidas — tanto na tela quanto na impressão/PDF.</p>
      {cabecalho && <div className="sf-cabecalho-preview"><img src={cabecalho} alt="Cabeçalho atual" /></div>}
      <label className="sf-field"><span>{cabecalho ? "Substituir imagem" : "Selecionar imagem"}</span><input type="file" accept="image/*" onChange={selecionarArquivo} disabled={carregando} /></label>
      {erro && <div className="sf-erro">{erro}</div>}
      {cabecalho && <button className="sf-btn-secondary" onClick={remover} disabled={carregando}>Remover cabeçalho</button>}
    </div>
  );
}

/* ======================================================================
   APP PRINCIPAL
   ====================================================================== */

const ABAS = [
  { id: "gerar", label: "Gerar documentos" },
  { id: "historico", label: "Histórico e impressão" },
  { id: "cabecalho", label: "Cabeçalho" },
];

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = carregando, null = deslogado
  const [aba, setAba] = useState("gerar");
  const [turma, setTurma] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [cabecalho, setCabecalho] = useState(null);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUsuario(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    setCarregandoDados(true);
    Promise.all([listarDocumentos(), carregarCabecalhoFirestore()]).then(([docs, cab]) => {
      setDocumentos(docs); setCabecalho(cab); setCarregandoDados(false);
    });
  }, [usuario]);

  function handleNovosDocumentos(novos) {
    setDocumentos((prev) => [...novos, ...prev]);
    setAba("historico");
  }

  if (usuario === undefined) {
    return <div className="sf-app"><p style={{ padding: 24 }}>Carregando...</p></div>;
  }
  if (usuario === null) {
    return <div className="sf-app"><TelaLogin /></div>;
  }

  return (
    <div className="sf-app">
      <header className="sf-topbar sf-no-print">
        <div className="sf-marca">
          <span className="sf-marca-selo">SF</span>
          <div><strong>Simulador Fiscal Didático</strong><div className="sf-marca-sub">CEDUP Hermann Hering</div></div>
        </div>
        <label className="sf-turma-input"><span>Turma/disciplina atual</span>
          <input type="text" value={turma} onChange={(e) => setTurma(e.target.value)} placeholder="Ex.: Cont. Intermediária 2A" />
        </label>
        <div className="sf-topbar-direita">
          <span className="sf-usuario-chip">
            {usuario.photoURL && <img src={usuario.photoURL} alt="" />}
            {usuario.displayName || usuario.email}
          </span>
          <button className="sf-btn-sair" onClick={() => signOut(auth)}>Sair</button>
        </div>
      </header>

      <nav className="sf-tabs sf-no-print">
        {ABAS.map((a) => (<button key={a.id} className={`sf-tab ${aba === a.id ? "sf-tab-ativa" : ""}`} onClick={() => setAba(a.id)}>{a.label}</button>))}
      </nav>

      <main className="sf-main">
        {carregandoDados ? <p className="sf-panel">Carregando dados...</p> : (
          <>
            {aba === "gerar" && <GerarDocumentos turma={turma} uidCriador={usuario.uid} onNovosDocumentos={handleNovosDocumentos} cabecalho={cabecalho} />}
            {aba === "historico" && <Historico documentos={documentos} setDocumentos={setDocumentos} cabecalho={cabecalho} />}
            {aba === "cabecalho" && <ConfiguracaoCabecalho cabecalho={cabecalho} onAtualizar={setCabecalho} />}
          </>
        )}
      </main>
    </div>
  );
}
