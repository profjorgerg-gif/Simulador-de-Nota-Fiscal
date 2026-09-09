import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, db, googleProvider } from "./firebase";
import "./App.css";

const TRIBUTOS = {
  icms: { label: "ICMS", tipo: "embutido" },
  ipi: { label: "IPI", tipo: "por_fora" },
  pis: { label: "PIS", tipo: "embutido" },
  cofins: { label: "COFINS", tipo: "embutido" },
  cbs: { label: "CBS", tipo: "informativo_2026" },
  ibs: { label: "IBS", tipo: "informativo_2026" },
};

const REGIMES = {
  "2026": {
    rotulo: "2026 — Transição da Reforma Tributária",
    aliquotas: { icms: 18, ipi: 10, pis: 1.65, cofins: 7.6, cbs: 0.9, ibs: 0.1 },
    contabilizar: { icms: true, ipi: true, pis: true, cofins: true, cbs: false, ibs: false },
    aviso: "Em 2026, IBS e CBS são destacados na nota para fins didáticos de transição, com base, alíquota e valor, mas não integram a contabilização da operação. A contabilização permanece com os tributos vigentes aplicáveis.",
  },
  "2027": {
    rotulo: "2027–2028 — CBS em vigor",
    aliquotas: { icms: 18, ipi: 0, pis: 0, cofins: 0, cbs: 8.8, ibs: 0.1 },
    contabilizar: { icms: true, ipi: false, pis: false, cofins: false, cbs: true, ibs: false },
    aviso: "Parâmetros didáticos. Ajuste as alíquotas conforme o cenário trabalhado em sala.",
  },
  "2029": {
    rotulo: "2029–2032 — Transição do IBS",
    aliquotas: { icms: 12, ipi: 0, pis: 0, cofins: 0, cbs: 8.8, ibs: 8.85 },
    contabilizar: { icms: true, ipi: false, pis: false, cofins: false, cbs: true, ibs: true },
    aviso: "Parâmetros estimados para simulação pedagógica da transição.",
  },
  "2033": {
    rotulo: "2033 — Regime pleno",
    aliquotas: { icms: 0, ipi: 0, pis: 0, cofins: 0, cbs: 8.8, ibs: 17.7 },
    contabilizar: { icms: false, ipi: false, pis: false, cofins: false, cbs: true, ibs: true },
    aviso: "Cenário pedagógico de regime pleno. Alíquotas podem ser ajustadas conforme legislação vigente.",
  },
};

const PRODUTOS = [
  ["Caneta esferográfica", "9608.10.00", 5.5], ["Resma de papel A4", "4802.56.10", 31.9],
  ["Caderno universitário", "4820.20.00", 29.9], ["Cadeira de escritório", "9401.30.90", 419.0],
  ["Monitor 24 polegadas", "8528.52.20", 899.0], ["Teclado sem fio", "8471.60.52", 129.0]
];
const EMPRESAS = ["Comercial Boa Vista Ltda", "Distribuidora Sul Mercantil S.A.", "Papelaria Nova Era Ltda", "Mercantil Estrela do Sul Ltda"];
const fmt = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const numeroNF = () => String(Math.floor(100000 + Math.random() * 899999));
const dataBR = () => new Date().toLocaleDateString("pt-BR");
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const cnpjFake = () => `${rnd(10,99)}.${rnd(100,999)}.${rnd(100,999)}/0001-${rnd(10,99)}`;

function entidadeVazia() {
  return { nome: "", cnpj: "", ie: "", endereco: "", bairro: "", cidade: "", uf: "SC", cep: "", telefone: "", email: "" };
}
function itemVazio() {
  return { id: uid(), codigo: "001", descricao: "", ncm: "", cst: "00", cfop: "5102", unidade: "UN", quantidade: 1, valorUnitario: 0 };
}

function calcularItem(item, aliquotas) {
  const base = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
  const impostos = {};
  Object.keys(TRIBUTOS).forEach((k) => {
    const aliquota = Number(aliquotas[k]) || 0;
    impostos[k] = { base, aliquota, valor: base * aliquota / 100 };
  });
  return { base, impostos };
}

function totalizar(itens, aliquotas, contabilizar, extras) {
  const totais = { produtos: 0, bases: {}, tributos: {} };
  Object.keys(TRIBUTOS).forEach((k) => { totais.bases[k] = 0; totais.tributos[k] = 0; });
  itens.forEach((item) => {
    const c = calcularItem(item, aliquotas);
    totais.produtos += c.base;
    Object.keys(TRIBUTOS).forEach((k) => {
      totais.bases[k] += c.impostos[k].base;
      totais.tributos[k] += c.impostos[k].valor;
    });
  });
  const desconto = totais.produtos * ((Number(extras.descontoPct) || 0) / 100);
  const frete = Number(extras.frete) || 0;
  const seguro = Number(extras.seguro) || 0;
  const outras = Number(extras.outras) || 0;
  let totalNota = totais.produtos - desconto + frete + seguro + outras;
  Object.keys(TRIBUTOS).forEach((k) => {
    if (TRIBUTOS[k].tipo === "por_fora" && contabilizar[k]) totalNota += totais.tributos[k];
  });
  return { ...totais, desconto, descontoPct: Number(extras.descontoPct) || 0, frete, seguro, outras, totalNota };
}

async function salvarDocumento(obj) {
  await setDoc(doc(db, "documentos", obj.id), obj);
}

function Campo({ label, value, onChange, type = "text", step }) {
  return <label className="field"><span>{label}</span><input type={type} step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function BlocoEntidade({ titulo, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return <fieldset><legend>{titulo}</legend><div className="grid2">
    <Campo label="Razão Social / Nome" value={value.nome} onChange={(v) => set("nome", v)} />
    <Campo label="CNPJ / CPF" value={value.cnpj} onChange={(v) => set("cnpj", v)} />
    <Campo label="Inscrição Estadual" value={value.ie} onChange={(v) => set("ie", v)} />
    <Campo label="Endereço" value={value.endereco} onChange={(v) => set("endereco", v)} />
    <Campo label="Bairro" value={value.bairro} onChange={(v) => set("bairro", v)} />
    <Campo label="Município" value={value.cidade} onChange={(v) => set("cidade", v)} />
    <Campo label="UF" value={value.uf} onChange={(v) => set("uf", v)} />
    <Campo label="CEP" value={value.cep} onChange={(v) => set("cep", v)} />
    <Campo label="Telefone" value={value.telefone} onChange={(v) => set("telefone", v)} />
    <Campo label="E-mail" value={value.email} onChange={(v) => set("email", v)} />
  </div></fieldset>;
}

function Danfe({ nfe, cabecalho }) {
  if (!nfe) return null;
  const regime = REGIMES[nfe.regimeId] || REGIMES["2026"];
  return <div className="danfe">
    <div className="watermark">SIMULAÇÃO — SEM VALOR FISCAL</div>
    {cabecalho && <img className="cabecalho-img" src={cabecalho} alt="Cabeçalho institucional" />}
    <div className="danfe-top"><div><h2>{nfe.emitente.nome || "EMITENTE"}</h2><small>{nfe.emitente.endereco} {nfe.emitente.cidade}/{nfe.emitente.uf}</small></div><div className="box-nf"><b>NOTA FISCAL</b><div>Nº {nfe.numero}</div><div>Série {nfe.serie}</div><div>{nfe.operacao === "entrada" ? "ENTRADA" : "SAÍDA"}</div></div></div>
    <div className="danfe-row"><b>Natureza da operação:</b> {nfe.natureza} <b>CFOP:</b> {nfe.cfopGeral} <b>Emissão:</b> {nfe.dataEmissao}</div>
    <section><h3>DESTINATÁRIO / REMETENTE</h3><div className="danfe-grid"><span><b>Nome:</b> {nfe.destinatario.nome}</span><span><b>CNPJ/CPF:</b> {nfe.destinatario.cnpj}</span><span><b>IE:</b> {nfe.destinatario.ie}</span><span><b>Endereço:</b> {nfe.destinatario.endereco}</span><span><b>Município/UF:</b> {nfe.destinatario.cidade}/{nfe.destinatario.uf}</span><span><b>CEP:</b> {nfe.destinatario.cep}</span></div></section>
    <section><h3>DADOS DOS PRODUTOS</h3><div className="tablewrap"><table><thead><tr><th>Cód.</th><th>Descrição</th><th>NCM</th><th>CST</th><th>CFOP</th><th>Un.</th><th>Qtd.</th><th>Vlr. unit.</th><th>Total</th></tr></thead><tbody>{nfe.itens.map((it) => <tr key={it.id}><td>{it.codigo}</td><td>{it.descricao}</td><td>{it.ncm}</td><td>{it.cst}</td><td>{it.cfop}</td><td>{it.unidade}</td><td>{it.quantidade}</td><td>{fmt(it.valorUnitario)}</td><td>{fmt(Number(it.quantidade)*Number(it.valorUnitario))}</td></tr>)}</tbody></table></div></section>
    <section><h3>TRIBUTAÇÃO POR ITEM</h3><div className="tablewrap"><table><thead><tr><th>Item</th><th>Tributo</th><th>Base</th><th>Alíquota</th><th>Valor</th><th>Tratamento</th></tr></thead><tbody>{nfe.itens.flatMap((it) => { const c = calcularItem(it, nfe.aliquotas); return Object.keys(TRIBUTOS).map((k) => <tr key={`${it.id}-${k}`}><td>{it.descricao}</td><td>{TRIBUTOS[k].label}</td><td>{fmt(c.impostos[k].base)}</td><td>{c.impostos[k].aliquota.toFixed(2)}%</td><td>{fmt(c.impostos[k].valor)}</td><td>{nfe.contabilizar[k] ? "Contabilizado" : "Informativo"}</td></tr>); })}</tbody></table></div></section>
    <section><h3>CÁLCULO DOS IMPOSTOS / RESUMO TRIBUTÁRIO</h3><div className="tributos-grid">{Object.keys(TRIBUTOS).map((k) => <div className={k === "cbs" || k === "ibs" ? "tributo reforma" : "tributo"} key={k}><b>{TRIBUTOS[k].label}</b><span>Base: {fmt(nfe.totais.bases[k])}</span><span>Alíquota: {Number(nfe.aliquotas[k]).toFixed(2)}%</span><span>Valor: {fmt(nfe.totais.tributos[k])}</span><small>{nfe.contabilizar[k] ? "Considerado na contabilização" : "Somente destaque/informação"}</small></div>)}</div></section>
    <section><h3>TOTAIS DA NOTA</h3><div className="totais"><span>Produtos: <b>{fmt(nfe.totais.produtos)}</b></span><span>Desconto: <b>{fmt(nfe.totais.desconto)}</b></span><span>Frete: <b>{fmt(nfe.totais.frete)}</b></span><span>Seguro: <b>{fmt(nfe.totais.seguro)}</b></span><span>Outras despesas: <b>{fmt(nfe.totais.outras)}</b></span><span className="totalgeral">TOTAL DA NOTA: <b>{fmt(nfe.totais.totalNota)}</b></span></div></section>
    {nfe.regimeId === "2026" && <div className="aviso-reforma"><b>TRANSIÇÃO TRIBUTÁRIA 2026:</b> IBS ({Number(nfe.aliquotas.ibs).toFixed(2)}%) e CBS ({Number(nfe.aliquotas.cbs).toFixed(2)}%) estão destacados com respectivas bases e valores, porém não integram a contabilização didática desta operação.</div>}
    <section><h3>TRANSPORTADOR / VOLUMES</h3><div className="danfe-grid"><span><b>Transportador:</b> {nfe.transporte.nome || "—"}</span><span><b>CNPJ/CPF:</b> {nfe.transporte.cnpj || "—"}</span><span><b>Frete por conta:</b> {nfe.transporte.fretePorConta || "—"}</span><span><b>Placa/UF:</b> {nfe.transporte.placa || "—"}/{nfe.transporte.uf || "—"}</span><span><b>Volumes:</b> {nfe.transporte.quantidade || "—"}</span><span><b>Peso bruto/líquido:</b> {nfe.transporte.pesoBruto || "—"} / {nfe.transporte.pesoLiquido || "—"}</span></div></section>
    <section><h3>DADOS ADICIONAIS</h3><p>{nfe.informacoes || "Documento emitido exclusivamente para fins pedagógicos."}</p></section>
    <div className="rodape">DOCUMENTO EMITIDO EXCLUSIVAMENTE PARA FINS PEDAGÓGICOS — SEM VALIDADE FISCAL</div>
  </div>;
}

function Gerador({ user, cabecalho, onSalvo }) {
  const [regimeId, setRegimeId] = useState("2026");
  const regime = REGIMES[regimeId];
  const [emitente, setEmitente] = useState(entidadeVazia());
  const [destinatario, setDestinatario] = useState(entidadeVazia());
  const [itens, setItens] = useState([itemVazio()]);
  const [aliquotas, setAliquotas] = useState({ ...regime.aliquotas });
  const [contabilizar, setContabilizar] = useState({ ...regime.contabilizar });
  const [operacao, setOperacao] = useState("saida");
  const [natureza, setNatureza] = useState("VENDA DE MERCADORIA");
  const [cfopGeral, setCfopGeral] = useState("5102");
  const [extras, setExtras] = useState({ descontoPct: 0, frete: 0, seguro: 0, outras: 0 });
  const [transporte, setTransporte] = useState({ nome: "", cnpj: "", fretePorConta: "DESTINATÁRIO", placa: "", uf: "SC", quantidade: "", pesoBruto: "", pesoLiquido: "" });
  const [informacoes, setInformacoes] = useState("Documento simulado para atividades pedagógicas.");
  const [preview, setPreview] = useState(null);

  const totais = useMemo(() => totalizar(itens, aliquotas, contabilizar, extras), [itens, aliquotas, contabilizar, extras]);
  const aplicarRegime = (id) => { setRegimeId(id); setAliquotas({ ...REGIMES[id].aliquotas }); setContabilizar({ ...REGIMES[id].contabilizar }); };
  const atualizarItem = (id, k, v) => setItens((p) => p.map((it) => it.id === id ? { ...it, [k]: v } : it));

  function gerarAutomatico() {
    const e = { ...entidadeVazia(), nome: EMPRESAS[rnd(0, EMPRESAS.length - 1)], cnpj: cnpjFake(), ie: String(rnd(100000000,999999999)), endereco: "Rua Comercial, 100", bairro: "Centro", cidade: "Blumenau", uf: "SC", cep: "89000-000" };
    const d = { ...entidadeVazia(), nome: EMPRESAS[rnd(0, EMPRESAS.length - 1)], cnpj: cnpjFake(), ie: String(rnd(100000000,999999999)), endereco: "Rua das Empresas, 250", bairro: "Centro", cidade: "Blumenau", uf: "SC", cep: "89000-100" };
    const novos = Array.from({ length: rnd(2,4) }, (_, i) => { const p = PRODUTOS[rnd(0, PRODUTOS.length - 1)]; return { id: uid(), codigo: String(i+1).padStart(3,"0"), descricao: p[0], ncm: p[1], cst: "00", cfop: "5102", unidade: "UN", quantidade: rnd(1,10), valorUnitario: p[2] }; });
    setEmitente(e); setDestinatario(d); setItens(novos); setOperacao("saida"); setNatureza("VENDA DE MERCADORIA"); setCfopGeral("5102");
  }

  async function emitir() {
    if (!emitente.nome || !destinatario.nome || !itens.some((i) => i.descricao)) return alert("Preencha emitente, destinatário e ao menos um produto.");
    const obj = { id: uid(), numero: numeroNF(), serie: "1", timestamp: Date.now(), dataEmissao: dataBR(), tipo: "NF-e", operacao, natureza, cfopGeral, regimeId, emitente, destinatario, itens, aliquotas, contabilizar, totais, transporte, informacoes, uidCriador: user.uid };
    try { await salvarDocumento(obj); setPreview(obj); onSalvo(obj); } catch (e) { console.error(e); alert("Não foi possível salvar a nota no Firestore."); }
  }

  return <div className="panel"><div className="title-row"><div><h2>Emissão de NF-e simulada</h2><p>Modelo didático ampliado com bases de cálculo e transição IBS/CBS.</p></div><button className="secondary" onClick={gerarAutomatico}>Preencher exemplo</button></div>
    <fieldset><legend>Identificação da operação</legend><div className="grid3"><label className="field"><span>Período tributário</span><select value={regimeId} onChange={(e) => aplicarRegime(e.target.value)}>{Object.entries(REGIMES).map(([id,r]) => <option value={id} key={id}>{r.rotulo}</option>)}</select></label><label className="field"><span>Tipo</span><select value={operacao} onChange={(e) => setOperacao(e.target.value)}><option value="saida">Saída</option><option value="entrada">Entrada</option></select></label><Campo label="Natureza da operação" value={natureza} onChange={setNatureza} /><Campo label="CFOP principal" value={cfopGeral} onChange={setCfopGeral} /></div><div className="notice">{regime.aviso}</div></fieldset>
    <div className="grid2"><BlocoEntidade titulo="Emitente" value={emitente} onChange={setEmitente} /><BlocoEntidade titulo="Destinatário / Remetente" value={destinatario} onChange={setDestinatario} /></div>
    <fieldset><legend>Produtos</legend><div className="tablewrap"><table><thead><tr><th>Cód.</th><th>Descrição</th><th>NCM</th><th>CST</th><th>CFOP</th><th>Un.</th><th>Qtd.</th><th>Vlr. Unit.</th><th></th></tr></thead><tbody>{itens.map((it) => <tr key={it.id}>{["codigo","descricao","ncm","cst","cfop","unidade","quantidade","valorUnitario"].map((k) => <td key={k}><input className="cellinput" type={k === "quantidade" || k === "valorUnitario" ? "number" : "text"} value={it[k]} onChange={(e) => atualizarItem(it.id,k,e.target.value)} /></td>)}<td><button className="danger mini" onClick={() => setItens((p) => p.length > 1 ? p.filter((x) => x.id !== it.id) : p)}>×</button></td></tr>)}</tbody></table></div><button className="secondary" onClick={() => setItens((p) => [...p,itemVazio()])}>+ Adicionar item</button></fieldset>
    <fieldset><legend>Tributação</legend><div className="taxedit">{Object.keys(TRIBUTOS).map((k) => <div className={k === "cbs" || k === "ibs" ? "taxcard reforma" : "taxcard"} key={k}><b>{TRIBUTOS[k].label}</b><Campo label="Alíquota %" type="number" step="0.01" value={aliquotas[k]} onChange={(v) => setAliquotas((p) => ({...p,[k]:v}))} /><label><input type="checkbox" checked={!!contabilizar[k]} onChange={(e) => setContabilizar((p) => ({...p,[k]:e.target.checked}))} /> Contabilizar</label><small>Base atual: {fmt(totais.bases[k])} · Valor: {fmt(totais.tributos[k])}</small></div>)}</div></fieldset>
    <fieldset><legend>Totais e acréscimos</legend><div className="grid4"><Campo label="Desconto %" type="number" value={extras.descontoPct} onChange={(v) => setExtras((p)=>({...p,descontoPct:v}))}/><Campo label="Frete" type="number" value={extras.frete} onChange={(v) => setExtras((p)=>({...p,frete:v}))}/><Campo label="Seguro" type="number" value={extras.seguro} onChange={(v) => setExtras((p)=>({...p,seguro:v}))}/><Campo label="Outras despesas" type="number" value={extras.outras} onChange={(v) => setExtras((p)=>({...p,outras:v}))}/></div><div className="preview-total">Total dos produtos: {fmt(totais.produtos)} · Total da nota: <b>{fmt(totais.totalNota)}</b></div></fieldset>
    <fieldset><legend>Transportador / Volumes</legend><div className="grid4">{Object.entries(transporte).map(([k,v]) => <Campo key={k} label={k} value={v} onChange={(x)=>setTransporte((p)=>({...p,[k]:x}))}/>)}</div></fieldset>
    <fieldset><legend>Informações adicionais</legend><textarea value={informacoes} onChange={(e)=>setInformacoes(e.target.value)} /></fieldset>
    <button className="primary full" onClick={emitir}>Emitir e salvar NF-e simulada</button>
    {preview && <><div className="print-actions"><button className="secondary" onClick={()=>window.print()}>Imprimir / Salvar PDF</button></div><Danfe nfe={preview} cabecalho={cabecalho}/></>}
  </div>;
}

function Historico({ documentos, onExcluir, cabecalho }) {
  const [selecionado, setSelecionado] = useState(null);
  return <div className="panel"><h2>Histórico de documentos</h2>{documentos.length === 0 ? <p>Nenhuma nota salva.</p> : <div className="cards">{documentos.map((n) => <div className="doccard" key={n.id}><div><b>NF-e nº {n.numero || n.id.slice(-6)}</b><span>{n.dataEmissao || ""} · {n.emitente?.nome || ""}</span></div><div><button className="secondary mini" onClick={()=>setSelecionado(n)}>Visualizar</button><button className="danger mini" onClick={()=>onExcluir(n.id)}>Excluir</button></div></div>)}</div>}{selecionado && <><div className="print-actions"><button className="secondary" onClick={()=>window.print()}>Imprimir / Salvar PDF</button></div><Danfe nfe={selecionado} cabecalho={cabecalho}/></>}</div>;
}

function Cabecalho({ value, onChange }) {
  const [erro,setErro]=useState("");
  async function arquivo(e){ const f=e.target.files?.[0]; if(!f)return; if(f.size>600*1024){setErro("Imagem muito grande. Utilize arquivo de até 600 KB.");return;} const r=new FileReader(); r.onload=async()=>{try{await setDoc(doc(db,"config","cabecalho"),{dataUrl:r.result});onChange(r.result);setErro("");}catch{setErro("Não foi possível salvar o cabeçalho. Verifique as regras do Firestore.");}}; r.readAsDataURL(f); }
  async function remover(){try{await deleteDoc(doc(db,"config","cabecalho"));onChange("");setErro("");}catch{setErro("Não foi possível remover o cabeçalho.");}}
  return <div className="panel"><h2>Cabeçalho institucional</h2><p>A imagem será exibida no topo das notas simuladas.</p><input type="file" accept="image/*" onChange={arquivo}/>{erro&&<div className="error">{erro}</div>}{value&&<><img className="header-preview" src={value} alt="Cabeçalho"/><button className="danger" onClick={remover}>Remover cabeçalho</button></>}</div>;
}

export default function App(){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState("gerar"),[docs,setDocs]=useState([]),[cabecalho,setCabecalho]=useState("");
  useEffect(()=>onAuthStateChanged(auth,(u)=>{setUser(u);setLoading(false);}),[]);
  useEffect(()=>{if(!user)return; (async()=>{try{const q=query(collection(db,"documentos"),orderBy("timestamp","desc")); const s=await getDocs(q);setDocs(s.docs.map(x=>x.data()));}catch(e){console.error(e);} try{const c=await getDoc(doc(db,"config","cabecalho"));if(c.exists())setCabecalho(c.data().dataUrl||"");}catch(e){console.error(e);}})();},[user]);
  async function excluir(id){if(!window.confirm("Excluir esta nota simulada?"))return; await deleteDoc(doc(db,"documentos",id));setDocs(p=>p.filter(x=>x.id!==id));}
  if(loading)return <div className="center">Carregando...</div>;
  if(!user)return <div className="login"><div className="loginbox"><h1>Simulador Fiscal Didático</h1><p>CEDUP Hermann Hering</p><p>NF-e pedagógica com Reforma Tributária e IBS/CBS.</p><button className="primary" onClick={()=>signInWithPopup(auth,googleProvider)}>Entrar com Google</button></div></div>;
  return <div className="app"><header className="appbar"><div><h1>Simulador Fiscal Didático</h1><small>CEDUP Hermann Hering · Documento sem validade fiscal</small></div><div className="user"><span>{user.displayName||user.email}</span><button className="secondary mini" onClick={()=>signOut(auth)}>Sair</button></div></header><nav><button className={tab==="gerar"?"active":""} onClick={()=>setTab("gerar")}>Gerar NF-e</button><button className={tab==="historico"?"active":""} onClick={()=>setTab("historico")}>Histórico</button><button className={tab==="cabecalho"?"active":""} onClick={()=>setTab("cabecalho")}>Cabeçalho</button></nav><main>{tab==="gerar"&&<Gerador user={user} cabecalho={cabecalho} onSalvo={(n)=>setDocs(p=>[n,...p])}/>} {tab==="historico"&&<Historico documentos={docs} onExcluir={excluir} cabecalho={cabecalho}/>} {tab==="cabecalho"&&<Cabecalho value={cabecalho} onChange={setCabecalho}/>}</main></div>;
}
