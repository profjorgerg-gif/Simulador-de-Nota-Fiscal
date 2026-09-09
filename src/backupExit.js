import { collection, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";

let modalAberto=false;
let ignorarInterceptacao=false;

function textoLimpo(el){return (el?.textContent||"").replace(/\s+/g," ").trim();}

function baixarJson(nome,dados){
  const blob=new Blob([JSON.stringify(dados,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function gerarBackup(){
  const snapshot=await getDocs(collection(db,"documentos"));
  const documentos=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  const agora=new Date();
  const carimbo=agora.toISOString().replace(/[:.]/g,"-");
  const dados={
    sistema:"Simulador Fiscal Didático",
    versaoBackup:1,
    geradoEm:agora.toISOString(),
    usuario:{
      uid:auth.currentUser?.uid||null,
      nome:auth.currentUser?.displayName||null,
      email:auth.currentUser?.email||null
    },
    totalDocumentos:documentos.length,
    documentos
  };
  baixarJson(`Backup_Simulador_Fiscal_${carimbo}.json`,dados);
}

function fecharModal(){
  document.querySelector(".backup-exit-overlay")?.remove();
  modalAberto=false;
}

async function sairDireto(){
  ignorarInterceptacao=true;
  fecharModal();
  try{await signOut(auth);}finally{setTimeout(()=>{ignorarInterceptacao=false;},300);}
}

function abrirModal(){
  if(modalAberto||!auth.currentUser)return;
  modalAberto=true;
  const overlay=document.createElement("div");
  overlay.className="backup-exit-overlay";
  overlay.innerHTML=`
    <div class="backup-exit-modal" role="dialog" aria-modal="true" aria-labelledby="backupExitTitle">
      <div class="backup-exit-icon">▣</div>
      <h2 id="backupExitTitle">Baixar um backup antes de sair?</h2>
      <p>Baixe um arquivo com o histórico de NF-e, configurações e demais documentos salvos no Simulador Fiscal Didático. Recomendado, mas opcional.</p>
      <button type="button" class="backup-exit-primary">Sim, baixar backup e sair</button>
      <button type="button" class="backup-exit-secondary">Sair sem backup</button>
      <button type="button" class="backup-exit-cancel" aria-label="Cancelar saída">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  const principal=overlay.querySelector(".backup-exit-primary");
  principal.onclick=async()=>{
    const texto=principal.textContent;
    principal.disabled=true;
    principal.textContent="Gerando backup...";
    try{await gerarBackup();await sairDireto();}
    catch(e){
      console.error(e);
      principal.disabled=false;
      principal.textContent=texto;
      alert("Não foi possível gerar o backup. Você pode tentar novamente ou sair sem backup.");
    }
  };
  overlay.querySelector(".backup-exit-secondary").onclick=sairDireto;
  overlay.querySelector(".backup-exit-cancel").onclick=fecharModal;
  overlay.addEventListener("click",e=>{if(e.target===overlay)fecharModal();});
  document.addEventListener("keydown",function esc(e){if(e.key==="Escape"){fecharModal();document.removeEventListener("keydown",esc);}});
}

function ehBotaoSair(target){
  const btn=target?.closest?.("button");
  if(!btn)return false;
  if(btn.closest(".backup-exit-modal"))return false;
  const texto=textoLimpo(btn).toLowerCase();
  return texto==="sair"||texto.includes(" sair");
}

if(typeof window!=="undefined"){
  document.addEventListener("click",e=>{
    if(ignorarInterceptacao||!auth.currentUser)return;
    if(ehBotaoSair(e.target)){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      abrirModal();
    }
  },true);
}
