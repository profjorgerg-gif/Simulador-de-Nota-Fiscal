import cedupLogo from "./assets/cedup_logo.png";

function criarElementosInstitucionais(manual) {
  if (!manual.querySelector('.manual-print-cover')) {
    const cover = document.createElement('section');
    cover.className = 'manual-print-cover';
    cover.innerHTML = `
      <div class="manual-cover-top">
        <img src="${cedupLogo}" alt="CEDUP Hermann Hering" />
        <div>
          <strong>CEDUP HERMANN HERING</strong>
          <span>Blumenau/SC</span>
          <span>Curso Técnico em Administração e Contabilidade</span>
        </div>
      </div>
      <div class="manual-cover-center">
        <span class="manual-cover-kicker">PLATAFORMA DIDÁTICA</span>
        <h1>Manual da Plataforma</h1>
        <h2>Simulador Fiscal Didático</h2>
        <p>Guia de utilização destinado ao professor.</p>
      </div>
      <div class="manual-cover-bottom">
        <span>Documento de apoio pedagógico</span>
        <strong>Blumenau/SC · 2026</strong>
      </div>`;
    manual.prepend(cover);
  }

  if (!manual.querySelector('.manual-running-header')) {
    const header = document.createElement('div');
    header.className = 'manual-running-header';
    header.innerHTML = `<img src="${cedupLogo}" alt=""/><span>Manual da Plataforma · Simulador Fiscal Didático</span>`;
    manual.appendChild(header);
  }

  if (!manual.querySelector('.manual-running-footer')) {
    const footer = document.createElement('div');
    footer.className = 'manual-running-footer';
    footer.innerHTML = `<span>© 2026 Jorge Lima Cardoso · CEDUP Hermann Hering</span><span class="manual-page-number">Página</span>`;
    manual.appendChild(footer);
  }
}

function instalarBotaoManual() {
  const manual = document.querySelector('.panel.manual');
  if (!manual) return;

  criarElementosInstitucionais(manual);
  if (manual.querySelector('.manual-print-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'manual-print-actions';

  const texto = document.createElement('div');
  texto.className = 'manual-print-help';
  texto.innerHTML = '<strong>Salvar ou imprimir o Manual em PDF</strong><span>O documento será preparado em formato A4, com capa, cabeçalho, rodapé e quebras de página organizadas. Na janela de impressão, selecione “Salvar como PDF” ou a impressora desejada.</span>';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary manual-print-button';
  button.textContent = 'Salvar / Imprimir em PDF';
  button.setAttribute('aria-label', 'Salvar ou imprimir o Manual da Plataforma em PDF');

  button.addEventListener('click', () => {
    criarElementosInstitucionais(manual);
    const style = document.createElement('style');
    style.id = 'manual-page-print-style';
    style.textContent = '@page { size: A4 portrait; margin: 18mm 12mm 17mm; }';
    document.head.appendChild(style);
    document.body.classList.add('print-manual');

    const limpar = () => {
      document.body.classList.remove('print-manual');
      document.getElementById('manual-page-print-style')?.remove();
    };

    window.addEventListener('afterprint', limpar, { once: true });
    setTimeout(() => window.print(), 80);
    setTimeout(() => {
      if (document.body.classList.contains('print-manual')) limpar();
    }, 60000);
  });

  actions.append(texto, button);
  const titulo = manual.querySelector('h2:not(.manual-print-cover h2)');
  if (titulo) titulo.insertAdjacentElement('afterend', actions);
  else manual.prepend(actions);
}

if (typeof window !== 'undefined') {
  const iniciar = () => {
    instalarBotaoManual();
    const observer = new MutationObserver(instalarBotaoManual);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}
