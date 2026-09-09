import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

export function nomeArquivoNota(nfe) {
  const tipo = nfe?.operacao === "entrada" ? "ENTRADA" : "SAIDA";
  const numero = String(nfe?.numero || "SEM_NUMERO").replace(/[^0-9A-Za-z_-]/g, "_");
  return `NF_${tipo}_${numero}.pdf`;
}

async function gerarPdfDoElemento(elemento, nfe) {
  if (!elemento) throw new Error("Visualização da NF não localizada.");

  const canvas = await html2canvas(elemento, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: Math.max(document.documentElement.clientWidth, elemento.scrollWidth),
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.96);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = 210;
  const pageH = 297;
  const margin = 6;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;

  doc.addImage(imgData, "JPEG", x, y, w, h, undefined, "FAST");
  doc.setProperties({ title: nomeArquivoNota(nfe), subject: "Nota Fiscal Simulada - uso pedagógico" });
  return doc;
}

export async function salvarPdfDaVisualizacao(nfe) {
  const el = document.querySelector(`[data-danfe-id="${nfe.id}"]`);
  const doc = await gerarPdfDoElemento(el, nfe);
  doc.save(nomeArquivoNota(nfe));
}

export async function salvarNotasVisualizacaoEmBloco(notas) {
  if (!notas?.length) throw new Error("Nenhuma NF selecionada.");
  const zip = new JSZip();

  for (const nfe of notas) {
    const el = document.querySelector(`[data-danfe-id="${nfe.id}"]`);
    const doc = await gerarPdfDoElemento(el, nfe);
    zip.file(nomeArquivoNota(nfe), doc.output("arraybuffer"));
  }

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
