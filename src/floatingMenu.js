import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

function textoLimpo(el){return (el?.textContent||'').replace(/\s+/g,' ').trim();}

function localizarBotaoOriginal(rotulo){
  const botoes=[...document.querySelectorAll('.sidenav button')];
  return botoes.find(b=>textoLimpo(b).toLowerCase().includes(rotulo.toLowerCase()));
}

function navegar(rotulo){
  const alvo=localizarBotaoOriginal(rotulo);
  if(alvo) alvo.click();
}

function removerMenus(){
  document.querySelector('.floating-nav-shell')?.remove();
  document.querySelector('.desktop-header-nav')?.remove();
  document.querySelector('.floating-menu-trigger')?.remove();
  document.body.classList.remove('floating-menu-open');
}

function garantirEstruturaFlutuante(){
  let shell=document.querySelector('.floating-nav-shell');
  if(shell) return shell;

  shell=document.createElement('div');
  shell.className='floating-nav-shell';
  shell.innerHTML=`
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

  const drawer=shell.querySelector('.floating-menu-drawer');
  const overlay=shell.querySelector('.floating-menu-overlay');
  const fechar=()=>{
    shell.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('floating-menu-open');
    const trigger=document.querySelector('.floating-menu-trigger');
    if(trigger) trigger.setAttribute('aria-expanded','false');
  };

  shell.querySelector('.floating-menu-close').onclick=fechar;
  overlay.onclick=fechar;
  shell.querySelectorAll('[data-target]').forEach(btn=>btn.onclick=()=>{navegar(btn.dataset.target);fechar();});
  shell.querySelector('.floating-menu-exit').onclick=()=>{
    const appbar=document.querySelector('.appbar');
    const sair=appbar?[...appbar.querySelectorAll('button')].find(b=>textoLimpo(b).toLowerCase()==='sair'):null;
    if(sair) sair.click();
    fechar();
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape')fechar();});
  return shell;
}

function instalarMenu(){
  if(!auth.currentUser){removerMenus();return;}

  const appbar=document.querySelector('.appbar');
  if(!appbar) return;

  const shell=garantirEstruturaFlutuante();
  const drawer=shell.querySelector('.floating-menu-drawer');
  const overlay=shell.querySelector('.floating-menu-overlay');

  let trigger=appbar.querySelector('.floating-menu-trigger');
  if(!trigger){
    trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='floating-menu-trigger';
    trigger.setAttribute('aria-label','Abrir menu');
    trigger.setAttribute('aria-expanded','false');
    trigger.textContent='☰';
    appbar.appendChild(trigger);
  }
  trigger.onclick=()=>{
    shell.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
    drawer.setAttribute('aria-hidden','false');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('floating-menu-open');
  };

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

  const sidenav=document.querySelector('.sidenav');
  const sincronizar=()=>{
    [...document.querySelectorAll('.floating-menu-nav [data-target],.desktop-header-nav [data-target]')].forEach(btn=>{
      const alvo=localizarBotaoOriginal(btn.dataset.target);
      btn.classList.toggle('active',!!alvo?.classList.contains('active'));
    });
  };
  sincronizar();
  if(sidenav&&!sidenav.dataset.menuObserver){
    new MutationObserver(sincronizar).observe(sidenav,{attributes:true,subtree:true,attributeFilter:['class']});
    sidenav.dataset.menuObserver='1';
  }
}

if(typeof window!=='undefined'){
  const iniciar=()=>{
    onAuthStateChanged(auth,user=>{
      if(user){
        instalarMenu();
        setTimeout(instalarMenu,100);
        setTimeout(instalarMenu,400);
        setTimeout(instalarMenu,1000);
      }else removerMenus();
    });
    new MutationObserver(()=>{if(auth.currentUser) instalarMenu(); else removerMenus();}).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true}); else iniciar();
}
