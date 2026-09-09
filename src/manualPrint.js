function instalarBotaoManual() {
  const manual = document.querySelector('.panel.manual');
  if (!manual || manual.querySelector('.manual-print-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'manual-print-actions';

  const texto = document.createElement('div');
  texto.className = 'manual-print-help';
  texto.innerHTML = '<strong>Salvar ou imprimir o Manual em PDF</strong><span>Use o botão ao lado. Na janela de impressão, selecione “Salvar como PDF” ou a impressora desejada.</span>';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary manual-print-button';
  button.textContent = 'Salvar / Imprimir em PDF';
  button.setAttribute('aria-label', 'Salvar ou imprimir o Manual da Plataforma em PDF');

  button.addEventListener('click', () => {
    const style = document.createElement('style');
    style.id = 'manual-page-print-style';
    style.textContent = '@page { size: A4 portrait; margin: 12mm; }';
    document.head.appendChild(style);
    document.body.classList.add('print-manual');

    const limpar = () => {
      document.body.classList.remove('print-manual');
      document.getElementById('manual-page-print-style')?.remove();
    };

    window.addEventListener('afterprint', limpar, { once: true });
    setTimeout(() => window.print(), 60);
    setTimeout(() => {
      if (document.body.classList.contains('print-manual')) limpar();
    }, 60000);
  });

  actions.append(texto, button);
  const titulo = manual.querySelector('h2');
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
