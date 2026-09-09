import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

const FIXO_ID="__config_cabecalho__";
const PREF_PREFIX="__config_cabecalho_usuario_";
const MAX_BYTES=600*1024;

let currentUser=null;
let fixedDataUrl="";
let customDataUrl="";
let mode="cedup";
let observer=null;
let applying=false;

const prefId=uid=>`${PREF_PREFIX}${uid}`;

async function carregarPreferencias(user){
  currentUser=user;
  fixedDataUrl="";
  customDataUrl="";
  mode="cedup";
  try{
    const fixo=await getDoc(doc(db,"documentos",FIXO_ID));
    if(fixo.exists()) fixedDataUrl=fixo.data()?.dataUrl||"";
    if(!fixedDataUrl) fixedDataUrl=localStorage.getItem("simulador_cabecalho")||"";
  }catch(e){
    console.error("Falha ao carregar cabeçalho fixo do CEDUP",e);
    fixedDataUrl=localStorage.getItem("simulador_cabecalho")||"";
  }
  try{
    const pref=await getDoc(doc(db,"documentos",prefId(user.uid)));
    if(pref.exists()){
      const p=pref.data()||{};
      if(["cedup","custom","system"].includes(p.modo)) mode=p.modo;
      customDataUrl=p.dataUrlPersonalizado||"";
      if(mode==="custom"&&!customDataUrl) mode="cedup";
    }
  }catch(e){console.error("Falha ao carregar preferência de cabeçalho",e);}
  renderManager();
  aplicarCabecalhos();
}

async function salvarPreferencia(novoModo,novoCustom){
  if(!currentUser)return;
  mode=novoModo;
  if(typeof novoCustom==="string") customDataUrl=novoCustom;
  await setDoc(doc(db,"documentos",prefId(currentUser.uid)),{
    id:prefId(currentUser.uid),
    tipo:"CONFIG_CABECALHO_USUARIO",
    uid:currentUser.uid,
    email:currentUser.email||"",
    modo:mode,
    dataUrlPersonalizado:customDataUrl||"",
    timestamp:Date.now(),
    atualizadoEm:new Date().toISOString()
  });
  localStorage.setItem(`simulador_cabecalho_modo_${currentUser.uid}`,mode);
  aplicarCabecalhos();
}

function cabecalhoDesejado(){
  if(mode==="cedup")return fixedDataUrl;
  if(mode==="custom")return customDataUrl;
  return "";
}

function aplicarCabecalhos(){
  if(applying||!currentUser)return;
  applying=true;
  try{
    const desired=cabecalhoDesejado();
    document.querySelectorAll(".danfe").forEach(danfe=>{
      let img=danfe.querySelector("img.cabecalho-img");
      if(!desired){
        if(img)img.remove();
        return;
      }
      if(!img){
        img=document.createElement("img");
        img.className="cabecalho-img header-choice-managed";
        img.alt=mode==="cedup"?"Cabeçalho institucional CEDUP Hermann Hering":"Cabeçalho personalizado";
        const top=danfe.querySelector(".danfe-top");
        danfe.insertBefore(img,top||danfe.firstChild);
      }
      if(img.src!==desired)img.src=desired;
      img.dataset.headerChoice=mode;
    });
  }finally{applying=false;}
}

function lerArquivo(file){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(new Error("Nenhum arquivo selecionado."));
    if(!file.type.startsWith("image/"))return reject(new Error("Selecione um arquivo de imagem."));
    if(file.size>MAX_BYTES)return reject(new Error("A imagem deve ter no máximo 600 KB."));
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||""));
    r.onerror=()=>reject(new Error("Não foi possível ler a imagem."));
    r.readAsDataURL(file);
  });
}

function card(id,title,desc,preview){
  const el=document.createElement("label");
  el.className="header-choice-card";
  el.innerHTML=`<div class="header-choice-radio"><input type="radio" name="header-choice" value="${id}"><span></span></div><div class="header-choice-copy"><strong>${title}</strong><p>${desc}</p>${preview?`<img src="${preview}" alt="Prévia do cabeçalho">`:""}</div>`;
  return el;
}

function renderManager(){
  if(!currentUser)return;
  const panels=[...document.querySelectorAll(".panel")];
  const panel=panels.find(p=>p.querySelector("h2")?.textContent?.toLowerCase().includes("cabeçalho institucional"));
  if(!panel)return;
  const existing=panel.querySelector(".header-choice-manager");
  if(existing)return;
  [...panel.children].forEach(el=>{if(!el.matches("h2"))el.classList.add("header-choice-original-hidden");});

  const manager=document.createElement("div");
  manager.className="header-choice-manager";
  manager.innerHTML=`<p class="header-choice-intro">Escolha o cabeçalho que será utilizado nas NF-e simuladas e nos respectivos PDFs. A preferência é individual para cada professor.</p><div class="header-choice-grid"></div><div class="header-choice-status" role="status"></div><div class="header-choice-actions"><button type="button" class="primary header-choice-save">Salvar opção</button></div>`;
  const grid=manager.querySelector(".header-choice-grid");
  const c1=card("cedup","CEDUP Hermann Hering — institucional","Modelo institucional fixo disponibilizado pela plataforma para todos os professores.",fixedDataUrl);
  const c2=card("custom","Cabeçalho personalizado","Permite ao professor utilizar seu próprio modelo de cabeçalho. A imagem fica vinculada ao seu acesso.",customDataUrl);
  const c3=card("system","Padrão do sistema","Não adiciona imagem institucional. A NF-e utiliza o cabeçalho técnico próprio do Simulador Fiscal Didático.","");
  c2.querySelector(".header-choice-copy").insertAdjacentHTML("beforeend",`<div class="header-custom-upload"><input type="file" accept="image/*"><small>PNG/JPG, até 600 KB.</small></div>`);
  grid.append(c1,c2,c3);
  panel.appendChild(manager);

  const selected=manager.querySelector(`input[value="${mode}"]`);
  if(selected)selected.checked=true;
  if(!fixedDataUrl){
    c1.classList.add("unavailable");
    c1.querySelector("input").disabled=true;
    c1.querySelector("p").textContent="O modelo institucional fixo ainda não está disponível. O Admin deve manter o cabeçalho institucional cadastrado.";
    if(mode==="cedup"){mode="system";c3.querySelector("input").checked=true;}
  }

  const fileInput=c2.querySelector("input[type=file]");
  fileInput.addEventListener("change",async()=>{
    const status=manager.querySelector(".header-choice-status");
    try{
      const data=await lerArquivo(fileInput.files?.[0]);
      customDataUrl=data;
      const old=c2.querySelector(".header-choice-copy>img");
      if(old)old.src=data; else c2.querySelector(".header-choice-copy p").insertAdjacentHTML("afterend",`<img src="${data}" alt="Prévia do cabeçalho personalizado">`);
      c2.querySelector("input[type=radio]").checked=true;
      status.textContent="Imagem carregada. Clique em Salvar opção para confirmar.";
      status.className="header-choice-status info";
    }catch(e){status.textContent=e.message;status.className="header-choice-status error";}
  });

  manager.querySelector(".header-choice-save").addEventListener("click",async e=>{
    const btn=e.currentTarget,status=manager.querySelector(".header-choice-status"),choice=manager.querySelector("input[name=header-choice]:checked")?.value||"system";
    if(choice==="custom"&&!customDataUrl){status.textContent="Selecione uma imagem para utilizar o cabeçalho personalizado.";status.className="header-choice-status error";return;}
    btn.disabled=true;btn.textContent="Salvando...";
    try{await salvarPreferencia(choice,customDataUrl);status.textContent="Opção de cabeçalho salva para este professor.";status.className="header-choice-status success";}
    catch(err){console.error(err);status.textContent="Não foi possível salvar a preferência de cabeçalho.";status.className="header-choice-status error";}
    finally{btn.disabled=false;btn.textContent="Salvar opção";}
  });
}

function instalarObservador(){
  if(observer)observer.disconnect();
  observer=new MutationObserver(()=>{
    if(!currentUser)return;
    renderManager();
    aplicarCabecalhos();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(typeof window!=="undefined"){
  instalarObservador();
  onAuthStateChanged(auth,user=>{
    if(!user){currentUser=null;fixedDataUrl="";customDataUrl="";mode="cedup";return;}
    carregarPreferencias(user);
  });
}
