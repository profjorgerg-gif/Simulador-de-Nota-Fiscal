// Mantém identificadores técnicos no modelo de dados, mas remove-os da interface pública.
// A versão do motor continua disponível internamente para auditoria e rastreabilidade.
const replacements = [
  [/Simulador Fiscal Didático/g, "Simulador NF-e/NFS-e"],
  [/CEDUP Hermann Hering\s*·\s*Motor Fiscal 2026\.2\s*·\s*Documento sem validade fiscal/g, "CEDUP Hermann Hering · Documento sem validade fiscal"],
  [/Documento gerado pelo Motor Fiscal 2026\.2\.\s*/g, ""],
  [/\s*Motor Fiscal 2026\.2\.?/g, ""],
  [/\s*Motor 2026\.2\s*·\s*/g, ""],
  [/pelo Motor Fiscal 2026\.2/g, "com validação fiscal"],
];

function cleanText(text) {
  let out = text;
  for (const [pattern, replacement] of replacements) out = out.replace(pattern, replacement);
  return out;
}

function cleanNode(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    const next = cleanText(root.nodeValue || "");
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const next = cleanText(node.nodeValue || "");
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

function startPublicLabelCleanup() {
  const run = () => cleanNode(document.body);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(cleanNode);
      if (mutation.type === "characterData") cleanNode(mutation.target);
    }
  });
  const observe = () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once: true });
}

startPublicLabelCleanup();
