import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";

const moeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const texto = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

export function nomeArquivoNota(nfe) {
  const tipo = nfe?.operacao === "entrada" ? "ENTRADA" : "SAIDA";
  const numero = texto(nfe?.numero || "SEM_NUMERO").replace(/[^0-9A-Za-z_-]/g, "_");
  return `NF_${tipo}_${numero}.pdf`;
}

function addCabecalho(doc, nfe, cabecalho) {
  let y = 8;
  if (cabecalho && /^data:image\/(png|jpeg|jpg);base64,/i.test(cabecalho)) {
    try {
      const formato = cabecalho.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(cabecalho, formato, 10, y, 190, 18, undefined, "FAST");
      y += 20;
    } catch (e) {
      console.warn("Cabeçalho não pôde ser incorporado ao PDF", e);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(texto(nfe?.emitente?.nome || "EMITENTE"), 10, y + 4);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${texto(nfe?.emitente?.endereco)} ${texto(nfe?.emitente?.cidade)}/${texto(nfe?.emitente?.uf)}`, 10, y + 8);
  doc.rect(155, y, 45, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NOTA FISCAL SIMULADA", 177.5, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Nº ${texto(nfe?.numero)}  Série ${texto(nfe?.serie || "1")}`, 177.5, y + 8, { align: "center" });
  doc.text(nfe?.operacao === "entrada" ? "ENTRADA" : "SAÍDA", 177.5, y + 11, { align: "center" });
  return y + 16;
}

export function gerarPdfNota(nfe, cabecalho = "") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: nomeArquivoNota(nfe), subject: "Nota Fiscal Simulada - uso pedagógico" });
  let y = addCabecalho(doc, nfe, cabecalho);

  doc.setFontSize(6.2);
  doc.setFont("helvetica", "bold");
  doc.text(`Natureza: ${texto(nfe?.natureza)}`, 10, y);
  doc.text(`CFOP: ${texto(nfe?.cfopGeral)}`, 118, y);
  doc.text(`Emissão: ${texto(nfe?.dataEmissao)}`, 158, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.8, overflow: "linebreak" },
    headStyles: { fontStyle: "bold" },
    head: [["DESTINATÁRIO / REMETENTE", "CNPJ/CPF", "IE", "MUNICÍPIO/UF"]],
    body: [[texto(nfe?.destinatario?.nome), texto(nfe?.destinatario?.cnpj), texto(nfe?.destinatario?.ie), `${texto(nfe?.destinatario?.cidade)}/${texto(nfe?.destinatario?.uf)}`]],
    margin: { left: 10, right: 10 },
    pageBreak: "avoid",
  });
  y = doc.lastAutoTable.finalY + 2;

  const itens = Array.isArray(nfe?.itens) ? nfe.itens : [];
  const f = Math.max(4.0, 5.4 - Math.max(0, itens.length - 10) * 0.08);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: f, cellPadding: 0.55, overflow: "linebreak" },
    headStyles: { fontStyle: "bold" },
    head: [["Cód.", "Descrição", "NCM", "CST", "CFOP", "Un.", "Qtd.", "V. Unit.", "V. Total"]],
    body: itens.map((it) => [texto(it.codigo), texto(it.descricao), texto(it.ncm), texto(it.cst), texto(it.cfop), texto(it.unidade), texto(it.quantidade), moeda(it.valorUnitario), moeda((Number(it.quantidade)||0)*(Number(it.valorUnitario)||0))]),
    columnStyles: { 1: { cellWidth: 52 }, 2: { cellWidth: 19 }, 7: { halign: "right" }, 8: { halign: "right" } },
    margin: { left: 10, right: 10 },
    pageBreak: "avoid",
    rowPageBreak: "avoid",
  });
  y = doc.lastAutoTable.finalY + 2;

  const tributos = ["icms", "ipi", "pis", "cofins", "cbs", "ibs"];
  const labels = { icms: "ICMS", ipi: "IPI", pis: "PIS", cofins: "COFINS", cbs: "CBS", ibs: "IBS" };
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 5.2, cellPadding: 0.6 },
    head: [["Tributo", "Base de cálculo", "Alíquota", "Valor", "Tratamento"]],
    body: tributos.map((k) => [labels[k], moeda(nfe?.totais?.bases?.[k]), `${Number(nfe?.aliquotas?.[k] || 0).toFixed(2)}%`, moeda(nfe?.totais?.tributos?.[k]), nfe?.contabilizar?.[k] ? "Contabilizado" : "Informativo"]),
    margin: { left: 10, right: 10 },
    pageBreak: "avoid",
  });
  y = doc.lastAutoTable.finalY + 2;

  const t = nfe?.totais || {};
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.65, halign: "right" },
    head: [["Produtos", "Desconto", "Frete", "Seguro", "Outras", "TOTAL DA NOTA"]],
    body: [[moeda(t.produtos), moeda(t.desconto), moeda(t.frete), moeda(t.seguro), moeda(t.outras), moeda(t.totalNota)]],
    margin: { left: 10, right: 10 },
    pageBreak: "avoid",
  });
  y = doc.lastAutoTable.finalY + 2;

  if (nfe?.regimeId === "2026") {
    doc.setFontSize(5.4);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSIÇÃO TRIBUTÁRIA 2026:", 10, y + 2);
    doc.setFont("helvetica", "normal");
    doc.text("IBS e CBS destacados com base, alíquota e valor, sem integração à contabilização didática da operação em 2026.", 45, y + 2);
    y += 5;
  }

  doc.setFontSize(5.2);
  doc.setFont("helvetica", "normal");
  const transportador = texto(nfe?.transporte?.nome || "—");
  doc.text(`Transportador: ${transportador} | Volumes: ${texto(nfe?.transporte?.quantidade || "—")} | Peso bruto: ${texto(nfe?.transporte?.pesoBruto || "—")} | Peso líquido: ${texto(nfe?.transporte?.pesoLiquido || "—")}`, 10, y + 2);
  y += 5;
  const info = texto(nfe?.informacoes || "Documento emitido exclusivamente para fins pedagógicos.");
  const linhas = doc.splitTextToSize(info, 188).slice(0, 2);
  doc.text(linhas, 10, y + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("DOCUMENTO EMITIDO EXCLUSIVAMENTE PARA FINS PEDAGÓGICOS — SEM VALIDADE FISCAL", 105, 291, { align: "center" });
  return doc;
}

export function salvarPdfNota(nfe, cabecalho = "") {
  const doc = gerarPdfNota(nfe, cabecalho);
  doc.save(nomeArquivoNota(nfe));
}

export async function salvarNotasEmBloco(notas, cabecalho = "") {
  if (!notas?.length) throw new Error("Nenhuma NF selecionada.");
  const zip = new JSZip();
  notas.forEach((nfe) => {
    const doc = gerarPdfNota(nfe, cabecalho);
    zip.file(nomeArquivoNota(nfe), doc.output("arraybuffer"));
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NF_BLOCO_${new Date().toISOString().slice(0,10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
