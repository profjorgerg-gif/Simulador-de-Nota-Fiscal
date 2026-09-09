function textoLimpo(el){return (el?.textContent||'').replace(/\s+/g,' ').trim();}

function localizarBotaoOriginal(rotulo){
  const botoes=[...document.querySelectorAll('.sidenav button')];
  return botoes.find(b=>textoLimpo(b).toLowerCase().includes(rotulo.toLowerCase()));
}

function instalarMenuFlutuante(){
  const sidenav=document.querySelector('.sidenav');
  const appbar=document.querySelector('.appbar');
  if(!sidenav||!appbar||document.querySelector('.floating-nav-shell')) return;

  const shell=document.createElement('div');
  shell.className='floating-nav-shell';
  shell.innerHTML=`
    <button type="button" class="floating-menu-trigger" aria-label="Abrir menu" aria-expanded="false"><span>☰</span></button>
    <div class="floating-menu-overlay" aria-hidden="true"></div>
    <aside class="floating-menu-drawer" aria-label="Menu principal" aria-hidden="true">
      <div class="floating-menu-head">
        <div><strong>Simulador Fiscal Didático</strong><span>JORGE LIMA CARDOSO</span></div>
        <button type="button" class="floating-menu-close" aria-label="Fechar menu">×</button>
      </div>
      <nav class="floating-menu-nav">
        <div class="floating-menu-group"><span class="floating-menu-label">OPERAÇÕES</span>
          <button data-target="NF-e"><span>▣</span> Emitir NF-e</button>
          <button data-target="Histórico"><span>▤</span> Histórico</button>
        </div>
        <div class="floating-menu-group"><span class="floating-menu-label">CONFIGURAÇÕES</span>
          <button data-target="Cabeçalho"><span>▧</span> Cabeçalho institucional</button>
        </div>
        <div class="floating-menu-group"><span class="floating-menu-label">DOCUMENTAÇÃO</span>
          <button data-target="Manual"><span>▥</span> Manual da Plataforma</button>
        </div>
      </nav>
      <div class="floating-menu-foot"><button type="button" class="floating-menu-exit"><span>↪</span> Sair</button></div>
    </aside>`;
  document.body.appendChild(shell);

  const trigger=shell.querySelector('.floating-menu-trigger');
  const drawer=shell.querySelector('.floating-menu-drawer');
  const overlay=shell.querySelector('.floating-menu-overlay');
  const close=shell.querySelector('.floating-menu-close');
  const abrir=()=>{shell.classList.add('open');trigger.setAttribute('aria-expanded','true');drawer.setAttribute('aria-hidden','false');overlay.setAttribute('aria-hidden','false');document.body.classList.add('floating-menu-open');};
  const fechar=()=>{shell.classList.remove('open');trigger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('floating-menu-open');};
  trigger.addEventListener('click',abrir); close.addEventListener('click',fechar); overlay.addEventListener('click',fechar);

  shell.querySelectorAll('[data-target]').forEach(btn=>btn.addEventListener('click',()=>{
    const alvo=localizarBotaoOriginal(btn.dataset.target);
    if(alvo) alvo.click();
    fechar();
  }));
  shell.querySelector('.floating-menu-exit').addEventListener('click',()=>{
    const candidatos=[...appbar.querySelectorAll('button')];
    const sair=candidatos.find(b=>textoLimpo(b).toLowerCase()==='sair');
    if(sair) sair.click();
    fechar();
  });

  const sincronizar=()=>{
    shell.querySelectorAll('[data-target]').forEach(btn=>{
      const alvo=localizarBotaoOriginal(btn.dataset.target);
      btn.classList.toggle('active',!!alvo?.classList.contains('active'));
    });
  };
  sincronizar();
  new MutationObserver(sincronizar).observe(sidenav,{attributes:true,subtree:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')fechar();});
}

if(typeof window!=='undefined'){
  const iniciar=()=>{
    instalarMenuFlutuante();
    new MutationObserver(instalarMenuFlutuante).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true}); else iniciar();
}
