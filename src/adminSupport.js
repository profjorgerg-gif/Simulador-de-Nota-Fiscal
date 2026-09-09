import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

const PERFIL_ADMIN='admin';
const SUPORTE_PREFIX='suporte_';
const MANUAL_OPERACIONAL_ID='__manual_operacional__';

function perfil(){return localStorage.getItem('sfd_perfil_acesso')||'professor';}
function ehAdmin(){return perfil()===PERFIL_ADMIN && localStorage.getItem('sfd_admin_autorizado')==='1';}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function agora(){return new Date().toLocaleString('pt-BR');}

function baixarTexto(nome,texto,tipo='application/json'){
  const blob=new Blob([texto],{type:tipo});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function listarDocumentos(){const snap=await getDocs(collection(db,'documentos'));return snap.docs.map(d=>({id:d.id,...d.data()}));}

async function backupAdmin(){
  const docs=await listarDocumentos();
  const payload={geradoEm:new Date().toISOString(),usuario:auth.currentUser?.email||'',total:docs.length,documentos:docs};
  baixarTexto(`Backup_Admin_Simulador_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`,JSON.stringify(payload,null,2));
}

async function carregarManualOperacional(){
  const r=await getDoc(doc(db,'documentos',MANUAL_OPERACIONAL_ID));
  return r.exists()?r.data().conteudo||'':'';
}
async function salvarManualOperacional(conteudo){
  await setDoc(doc(db,'documentos',MANUAL_OPERACIONAL_ID),{tipo:'manual_operacional',conteudo,atualizadoEm:new Date().toISOString(),atualizadoPor:auth.currentUser?.email||''},{merge:true});
}

function imprimirHtml(titulo,html){
  const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font:14px Arial;color:#222;margin:28px}h1{color:#17473b}pre{white-space:pre-wrap;font:14px Arial;line-height:1.55} @media print{body{margin:12mm}}</style></head><body><h1>${esc(titulo)}</h1>${html}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

async function carregarChamados(){
  const docs=await listarDocumentos();
  return docs.filter(x=>x.tipo==='suporte').sort((a,b)=>String(b.criadoEm||'').localeCompare(String(a.criadoEm||'')));
}
async function salvarChamado(data){
  const id=data.id||`${SUPORTE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  await setDoc(doc(db,'documentos',id),{tipo:'suporte',titulo:data.titulo,categoria:data.categoria||'Sistema',descricao:data.descricao,status:data.status||'Aberto',criadoEm:data.criadoEm||new Date().toISOString(),atualizadoEm:new Date().toISOString(),autor:data.autor||auth.currentUser?.email||''},{merge:true});
}
async function excluirChamado(id){await deleteDoc(doc(db,'documentos',id));}

function fecharPainel(){document.querySelector('.admin-support-page')?.remove();document.body.classList.remove('admin-page-open');}

function botaoMenu(rotulo,classe,onclick){const b=document.createElement('button');b.type='button';b.className=classe||'';b.textContent=rotulo;b.onclick=onclick;return b;}

function instalarEntradasMenu(){
  if(!auth.currentUser)return;
  const desktop=document.querySelector('.desktop-header-nav');
  if(desktop&&!desktop.querySelector('[data-extra="suporte"]')){
    const s=botaoMenu('▦ Suporte','',()=>abrirSuporte());s.dataset.extra='suporte';desktop.appendChild(s);
    if(ehAdmin()){const a=botaoMenu('⚙ Admin','admin-menu-link',()=>abrirAdmin());a.dataset.extra='admin';desktop.appendChild(a);}
  }
  const drawer=document.querySelector('.floating-menu-nav');
  if(drawer&&!drawer.querySelector('[data-extra="suporte"]')){
    const grupo=document.createElement('div');grupo.className='floating-menu-group extra-menu-group';grupo.innerHTML='<span class="floating-menu-label">SUPORTE</span>';
    const s=botaoMenu('▦  Central de Suporte','',()=>{abrirSuporte();document.querySelector('.floating-nav-shell')?.classList.remove('open');});s.dataset.extra='suporte';grupo.appendChild(s);drawer.appendChild(grupo);
    if(ehAdmin()){const g2=document.createElement('div');g2.className='floating-menu-group';g2.innerHTML='<span class="floating-menu-label">ADMINISTRAÇÃO</span>';const a=botaoMenu('⚙  Painel do Admin','',()=>{abrirAdmin();document.querySelector('.floating-nav-shell')?.classList.remove('open');});a.dataset.extra='admin';g2.appendChild(a);drawer.appendChild(g2);}
  }
}

function paginaBase(titulo,subtitulo,conteudo){
  fecharPainel();const el=document.createElement('section');el.className='admin-support-page';
  el.innerHTML=`<header class="asp-head"><div><span class="asp-kicker">SIMULADOR FISCAL DIDÁTICO</span><h1>${esc(titulo)}</h1><p>${esc(subtitulo)}</p></div><button class="asp-close" aria-label="Fechar">×</button></header><main class="asp-main">${conteudo}</main>`;
  document.body.appendChild(el);document.body.classList.add('admin-page-open');el.querySelector('.asp-close').onclick=fecharPainel;return el;
}

async function abrirAdmin(){
  if(!ehAdmin())return alert('Área exclusiva do Admin.');
  const el=paginaBase('Painel do Admin','Gestão operacional, documentação, backup e suporte do sistema.',`<div class="admin-cards"><button data-a="manual"><b>📘 Manual de Operacionalização</b><span>Criar, editar, salvar e imprimir o manual interno do sistema.</span></button><button data-a="prof"><b>📗 Manual do Professor</b><span>Abrir o manual já disponível na plataforma.</span></button><button data-a="suporte"><b>🛠 Central de Suporte</b><span>Gerenciar chamados, status e encaminhamentos.</span></button><button data-a="backup"><b>💾 Backup do Sistema</b><span>Baixar cópia dos registros armazenados.</span></button></div><div class="admin-summary"><div><span id="adm-total">—</span><small>documentos no Firestore</small></div><div><span id="adm-chamados">—</span><small>chamados registrados</small></div><div><span>Admin</span><small>perfil atual</small></div></div>`);
  const docs=await listarDocumentos().catch(()=>[]);el.querySelector('#adm-total').textContent=docs.length;el.querySelector('#adm-chamados').textContent=docs.filter(x=>x.tipo==='suporte').length;
  el.querySelector('[data-a="manual"]').onclick=abrirManualOperacional;
  el.querySelector('[data-a="prof"]').onclick=()=>{fecharPainel();const b=[...document.querySelectorAll('.sidenav button')].find(x=>(x.textContent||'').includes('Manual'));if(b)b.click();};
  el.querySelector('[data-a="suporte"]').onclick=abrirSuporte;el.querySelector('[data-a="backup"]').onclick=backupAdmin;
}

async function abrirManualOperacional(){
  if(!ehAdmin())return;
  const conteudo=await carregarManualOperacional().catch(()=>"");
  const base=conteudo||`MANUAL DE OPERACIONALIZAÇÃO DO SISTEMA\n\n1. Objetivo\nDescrever os procedimentos administrativos e operacionais do Simulador Fiscal Didático.\n\n2. Acesso\nO acesso administrativo exige perfil Admin e autenticação Google.\n\n3. Rotinas operacionais\n- Gestão do cabeçalho institucional;\n- Acompanhamento do histórico de NF-e simuladas;\n- Backup do sistema;\n- Gestão da Central de Suporte;\n- Atualização e disponibilização dos manuais.\n\n4. Segurança e continuidade\nRealizar backups periódicos e revisar os chamados pendentes.\n`;
  const el=paginaBase('Manual de Operacionalização','Documento interno administrado pelo perfil Admin.',`<div class="manual-admin-actions"><button data-x="salvar">Salvar manual</button><button data-x="imprimir">Imprimir / Salvar PDF</button><button data-x="voltar">Voltar ao Admin</button></div><textarea class="manual-admin-editor" spellcheck="true"></textarea><div class="manual-admin-status">Última edição local: ${agora()}</div>`);
  const ta=el.querySelector('textarea');ta.value=base;
  el.querySelector('[data-x="salvar"]').onclick=async()=>{await salvarManualOperacional(ta.value);el.querySelector('.manual-admin-status').textContent='Manual salvo em '+agora();};
  el.querySelector('[data-x="imprimir"]').onclick=()=>imprimirHtml('Manual de Operacionalização do Sistema',`<pre>${esc(ta.value)}</pre>`);
  el.querySelector('[data-x="voltar"]').onclick=abrirAdmin;
}

async function abrirSuporte(){
  const admin=ehAdmin();
  const chamados=await carregarChamados().catch(()=>[]);
  const el=paginaBase('Suporte','Chamados sobre o sistema, abertos por professores e administradores.',`<div class="support-tabs"><button class="active">Chamados do Sistema</button><button>Suporte Pedagógico</button></div><div class="support-toolbar"><div class="support-filters"><button data-f="Todos" class="active">Todos</button><button data-f="Aberto">Abertos</button><button data-f="Em análise">Em análise</button><button data-f="Encaminhado">Encaminhados</button><button data-f="Encerrado">Encerrados</button></div><div><button class="support-print">🖨 Imprimir / Salvar PDF</button><button class="support-new">＋ Novo chamado</button></div></div><div class="support-list"></div>`);
  let filtro='Todos';
  const render=()=>{const list=el.querySelector('.support-list');const dados=chamados.filter(c=>filtro==='Todos'||c.status===filtro);list.innerHTML=dados.length?dados.map(c=>`<article class="ticket" data-id="${esc(c.id)}"><div><span class="ticket-status s-${esc((c.status||'').replace(/\s/g,'-').toLowerCase())}">${esc(c.status||'Aberto')}</span><h3>${esc(c.titulo||'Sem título')}</h3><p>${esc(c.descricao||'')}</p><small>${esc(c.categoria||'Sistema')} · ${esc(c.autor||'')} · ${esc(new Date(c.criadoEm||Date.now()).toLocaleString('pt-BR'))}</small></div>${admin?`<div class="ticket-actions"><select><option>Aberto</option><option>Em análise</option><option>Encaminhado</option><option>Encerrado</option></select><button class="ticket-delete">Excluir</button></div>`:''}</article>`).join(''):'<div class="support-empty">Nenhum chamado encontrado.</div>';
    if(admin)list.querySelectorAll('.ticket').forEach(card=>{const id=card.dataset.id;const c=chamados.find(x=>x.id===id);const sel=card.querySelector('select');sel.value=c.status||'Aberto';sel.onchange=async()=>{c.status=sel.value;await salvarChamado(c);render();};card.querySelector('.ticket-delete').onclick=async()=>{if(confirm('Excluir este chamado?')){await excluirChamado(id);const i=chamados.findIndex(x=>x.id===id);if(i>=0)chamados.splice(i,1);render();}};});
  };
  render();
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filtro=b.dataset.f;el.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('active',x===b));render();});
  el.querySelector('.support-new').onclick=()=>novoChamado(chamados,render);
  el.querySelector('.support-print').onclick=()=>imprimirHtml('Central de Suporte',`<h2>Chamados do Sistema</h2>${el.querySelector('.support-list').innerHTML}`);
}

function novoChamado(chamados,render){
  const modal=document.createElement('div');modal.className='support-modal';modal.innerHTML=`<div class="support-modal-card"><h2>Novo chamado</h2><label>Título<input name="titulo"></label><label>Categoria<select name="categoria"><option>Sistema</option><option>NF-e / Emissão</option><option>PDF</option><option>Histórico</option><option>Acesso</option><option>Pedagógico</option><option>Outro</option></select></label><label>Descrição<textarea name="descricao"></textarea></label><div><button data-m="cancelar">Cancelar</button><button data-m="salvar" class="primary">Abrir chamado</button></div></div>`;document.body.appendChild(modal);
  modal.querySelector('[data-m="cancelar"]').onclick=()=>modal.remove();modal.querySelector('[data-m="salvar"]').onclick=async()=>{const titulo=modal.querySelector('[name="titulo"]').value.trim();const descricao=modal.querySelector('[name="descricao"]').value.trim();if(!titulo||!descricao)return alert('Informe título e descrição.');const c={titulo,descricao,categoria:modal.querySelector('[name="categoria"]').value,status:'Aberto',autor:auth.currentUser?.email||'',criadoEm:new Date().toISOString()};await salvarChamado(c);modal.remove();abrirSuporte();};
}

if(typeof window!=='undefined'){
  onAuthStateChanged(auth,user=>{if(!user){fecharPainel();return;}setTimeout(instalarEntradasMenu,300);setTimeout(instalarEntradasMenu,1000);});
  new MutationObserver(()=>{if(auth.currentUser)instalarEntradasMenu();}).observe(document.body,{childList:true,subtree:true});
}
