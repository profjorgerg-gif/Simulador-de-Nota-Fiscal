import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

const PREFIX='auditoria_';
let ultimoLoginUid=null;

function perfil(){return localStorage.getItem('sfd_perfil_acesso')||'professor';}
function ehAdmin(){return perfil()==='admin' && localStorage.getItem('sfd_admin_autorizado')==='1';}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function nomeUsuario(){return auth.currentUser?.displayName||auth.currentUser?.email||'Usuário autenticado';}

export async function registrarAuditoria(acao,descricao,detalhes={}){
  if(!auth.currentUser)return;
  const id=`${PREFIX}${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  await setDoc(doc(db,'documentos',id),{
    tipo:'auditoria',
    acao,
    descricao,
    usuarioUid:auth.currentUser.uid||'',
    usuarioNome:nomeUsuario(),
    usuarioEmail:auth.currentUser.email||'',
    perfil:perfil(),
    criadoEm:new Date().toISOString(),
    ...detalhes
  });
}

if(typeof window!=='undefined')window.sfdRegistrarAuditoria=registrarAuditoria;

async function listarRegistros(){
  const snap=await getDocs(collection(db,'documentos'));
  return snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.tipo==='auditoria').sort((a,b)=>String(b.criadoEm||'').localeCompare(String(a.criadoEm||'')));
}

function csvEscape(v){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`;}
function baixarCsv(regs){
  const linhas=[['Data/Hora','Usuário','E-mail','Perfil','Ação','Descrição'].map(csvEscape).join(';')];
  regs.forEach(r=>linhas.push([new Date(r.criadoEm||Date.now()).toLocaleString('pt-BR'),r.usuarioNome,r.usuarioEmail,r.perfil,r.acao,r.descricao].map(csvEscape).join(';')));
  const blob=new Blob(['\ufeff'+linhas.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Auditoria_Simulador_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function fechar(){document.querySelector('.audit-page')?.remove();document.body.classList.remove('audit-open');}

async function abrirAuditoria(){
  if(!ehAdmin())return alert('Área exclusiva do Admin.');
  fechar();
  const registros=await listarRegistros().catch(()=>[]);
  const hoje=new Date().toISOString().slice(0,10);
  const exclusoes=registros.filter(r=>(r.acao||'').toLowerCase().includes('exclus')).length;
  const usuarios=new Set(registros.map(r=>r.usuarioEmail).filter(Boolean)).size;
  const hojeCount=registros.filter(r=>String(r.criadoEm||'').slice(0,10)===hoje).length;
  const page=document.createElement('section');page.className='audit-page';
  page.innerHTML=`<div class="audit-wrap"><button class="audit-back">← Voltar ao início</button><span class="audit-kicker">GESTÃO</span><h1>Auditoria</h1><p class="audit-sub">Registro das ações relevantes realizadas na plataforma para acompanhamento administrativo.</p><div class="audit-metrics"><div><small>TOTAL DE REGISTROS</small><b>${registros.length}</b></div><div><small>EXCLUSÕES REGISTRADAS</small><b>${exclusoes}</b></div><div><small>USUÁRIOS COM ATIVIDADE</small><b>${usuarios}</b></div><div><small>AÇÕES HOJE</small><b>${hojeCount}</b></div></div><div class="audit-section"><span class="audit-label">LOG DE ATIVIDADES</span><p>As ações registradas possuem data/hora, usuário e descrição. O log não possui opção de exclusão pela interface.</p><div class="audit-filters"><select data-f="user"><option value="">Todos os usuários</option></select><select data-f="action"><option value="">Todas as ações</option></select><button class="audit-export">Exportar log (CSV)</button></div><div class="audit-table-wrap"><table><thead><tr><th>DATA/HORA</th><th>USUÁRIO</th><th>PERFIL</th><th>AÇÃO</th><th>DESCRIÇÃO</th></tr></thead><tbody></tbody></table></div></div></div>`;
  document.body.appendChild(page);document.body.classList.add('audit-open');
  const userSel=page.querySelector('[data-f="user"]'), actionSel=page.querySelector('[data-f="action"]');
  [...new Set(registros.map(r=>r.usuarioEmail).filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;userSel.appendChild(o);});
  [...new Set(registros.map(r=>r.acao).filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;actionSel.appendChild(o);});
  const render=()=>{const filtrados=registros.filter(r=>(!userSel.value||r.usuarioEmail===userSel.value)&&(!actionSel.value||r.acao===actionSel.value));page.querySelector('tbody').innerHTML=filtrados.length?filtrados.map(r=>`<tr><td>${esc(new Date(r.criadoEm||Date.now()).toLocaleString('pt-BR'))}</td><td>${esc(r.usuarioNome||r.usuarioEmail||'—')}<small>${esc(r.usuarioEmail||'')}</small></td><td>${esc(r.perfil||'—')}</td><td><span class="audit-action">${esc(r.acao||'—')}</span></td><td>${esc(r.descricao||'')}</td></tr>`).join(''):'<tr><td colspan="5" class="audit-empty">Nenhum registro encontrado.</td></tr>';return filtrados;};
  userSel.onchange=render;actionSel.onchange=render;render();
  page.querySelector('.audit-export').onclick=()=>baixarCsv(render());
  page.querySelector('.audit-back').onclick=fechar;
}

function instalarMenuAdmin(){
  if(!auth.currentUser||!ehAdmin())return;
  const desktop=document.querySelector('.desktop-header-nav');
  if(desktop&&!desktop.querySelector('[data-extra="auditoria"]')){const b=document.createElement('button');b.type='button';b.dataset.extra='auditoria';b.textContent='◷ Auditoria';b.onclick=abrirAuditoria;desktop.appendChild(b);}
  const drawer=document.querySelector('.floating-menu-nav');
  if(drawer&&!drawer.querySelector('[data-extra="auditoria"]')){let grupo=drawer.querySelector('.audit-admin-group');if(!grupo){grupo=document.createElement('div');grupo.className='floating-menu-group audit-admin-group';grupo.innerHTML='<span class="floating-menu-label">ADMINISTRAÇÃO</span>';drawer.appendChild(grupo);}const b=document.createElement('button');b.type='button';b.dataset.extra='auditoria';b.textContent='◷  Auditoria';b.onclick=()=>{abrirAuditoria();document.querySelector('.floating-nav-shell')?.classList.remove('open');};grupo.appendChild(b);}
}

if(typeof window!=='undefined'){
  onAuthStateChanged(auth,user=>{
    if(!user){ultimoLoginUid=null;fechar();return;}
    if(user.uid!==ultimoLoginUid){ultimoLoginUid=user.uid;registrarAuditoria('Login',`${nomeUsuario()} entrou na plataforma`).catch(()=>{});}
    setTimeout(instalarMenuAdmin,400);setTimeout(instalarMenuAdmin,1200);
  });
  new MutationObserver(()=>{if(auth.currentUser)instalarMenuAdmin();}).observe(document.body,{childList:true,subtree:true});
}
