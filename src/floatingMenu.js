function textoLimpo(el){return (el?.textContent||'').replace(/\s+/g,' ').trim();}

function localizarBotaoOriginal(rotulo){
  const botoes=[...document.querySelectorAll('.sidenav button')];
  return botoes.find(b=>textoLimpo(b).toLowerCase().includes(rotulo.toLowerCase()));
}

function navegar(rotulo){
  const alvo=localizarBotaoOriginal(rotulo);
  if(alvo) alvo.click();
}

function instalarMenu(){
  const sidenav=document.querySelector('.sidenav');
  const appbar=document.querySelector('.appbar');
  if(!sidenav||!appbar) return;

  let shell=document.querySelector('.floating-nav-shell');
  if(!shell){
    shell=document.createElement('div');
    shell.className='floating-nav-shell';
    shell.innerHTML=`
      <button type="button" class="floating-menu-trigger" aria-label="Abrir menu" aria-expanded="false">☰</button>
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
    const abrir=()=>{shell.classList.add('open');trigger.setAttribute('aria-expanded','true');drawer.setAttribute('aria-hidden','false');document.body.classList.add('floating-menu-open');};
    const fechar=()=>{shell.classList.remove('open');trigger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');document.body.classList.remove('floating-menu-open');};
    trigger.onclick=abrir;
    shell.querySelector('.floating-menu-close').onclick=fechar;
    overlay.onclick=fechar;
    shell.querySelectorAll('[data-target]').forEach(btn=>btn.onclick=()=>{navegar(btn.dataset.target);fechar();});
    shell.querySelector('.floating-menu-exit').onclick=()=>{
      const sair=[...appbar.querySelectorAll('button')].find(b=>textoLimpo(b).toLowerCase()==='sair');
      if(sair) sair.click();
      fechar();
    };
    document.addEventListener('keydown',e=>{if(e.key==='Escape')fechar();});
  }

  let desktop=appbar.querySelector('.desktop-header-nav');
  if(!desktop){
    desktop=document.createElement('nav');
    desktop.className='desktop-header-nav';
    desktop.setAttribute('aria-label','Menu principal do sistema');
    desktop.innerHTML=`
      <button type="button" data-target="NF-e"><span>▣</span> Emitir NF-e</button>
      <button type="button" data-target="Histórico"><span>▤</span> Histórico</button>
      <button type="button" data-target="Cabeçalho"><span>▧</span> Cabeçalho</button>
      <button type="button" data-target="Manual"><span>▥</span> Manual</button>`;
    const user=appbar.querySelector('.user');
    if(user) appbar.insertBefore(desktop,user); else appbar.appendChild(desktop);
    desktop.querySelectorAll('[data-target]').forEach(btn=>btn.onclick=()=>navegar(btn.dataset.target));
  }

  const sincronizar=()=>{
    [...document.querySelectorAll('.floating-menu-nav [data-target],.desktop-header-nav [data-target]')].forEach(btn=>{
      const alvo=localizarBotaoOriginal(btn.dataset.target);
      btn.classList.toggle('active',!!alvo?.classList.contains('active'));
    });
  };
  sincronizar();
  if(!sidenav.dataset.menuObserver){
    new MutationObserver(sincronizar).observe(sidenav,{attributes:true,subtree:true,attributeFilter:['class']});
    sidenav.dataset.menuObserver='1';
  }
}

if(typeof window!=='undefined'){
  const iniciar=()=>{
    instalarMenu();
    new MutationObserver(instalarMenu).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('load',instalarMenu);
    setTimeout(instalarMenu,300);
    setTimeout(instalarMenu,1200);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true}); else iniciar();
}
