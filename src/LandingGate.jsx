import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import cedupLogo from "./assets/cedup_logo.png";
import "./landing.css";

const LOGO = cedupLogo;
const ADMIN_CODE_SHA256 = "ba9ccbb26ddf022c59e03c421f79df80645263f14ddbc0843706b11184bc6c93";

async function sha256(texto){const bytes=new TextEncoder().encode(texto);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");}
const acessoRef=uid=>doc(db,"documentos",`__acesso_professor__${uid}`);

export default function LandingGate({ children }) {
  const [user,setUser]=useState(undefined);const [erro,setErro]=useState("");const [entrando,setEntrando]=useState(false);const [perfil,setPerfil]=useState("professor");const [codigoAdmin,setCodigoAdmin]=useState("");const [situacao,setSituacao]=useState(null);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);

  async function verificarProfessor(u){
    const ref=acessoRef(u.uid);const snap=await getDoc(ref);
    if(!snap.exists()){
      await setDoc(ref,{tipo:"acesso_professor",uid:u.uid,nome:u.displayName||"",email:u.email||"",status:"pendente",solicitadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()});
      return {status:"pendente",nome:u.displayName,email:u.email};
    }
    const d=snap.data();
    await setDoc(ref,{nome:u.displayName||d.nome||"",email:u.email||d.email||"",ultimoPedidoEm:new Date().toISOString()},{merge:true});
    return d;
  }

  async function entrar(){
    setErro("");setSituacao(null);
    if(perfil==="admin"){
      if(!codigoAdmin.trim()){setErro("Informe o código mestre para entrar como Admin.");return;}
      if(await sha256(codigoAdmin.trim())!==ADMIN_CODE_SHA256){setErro("Código mestre inválido para acesso como Admin.");return;}
    }
    setEntrando(true);
    try{
      localStorage.setItem("sfd_perfil_acesso",perfil);localStorage.setItem("sfd_admin_autorizado",perfil==="admin"?"1":"0");
      const cred=await signInWithPopup(auth,googleProvider);
      if(perfil==="professor"){
        const acesso=await verificarProfessor(cred.user);
        if(acesso.status!=="ativo"){
          setSituacao({status:acesso.status||"pendente",nome:cred.user.displayName||acesso.nome||"Professor(a)",email:cred.user.email||acesso.email||""});
          localStorage.removeItem("sfd_perfil_acesso");localStorage.removeItem("sfd_admin_autorizado");await signOut(auth);
        }
      }
    }catch(e){console.error(e);localStorage.removeItem("sfd_perfil_acesso");localStorage.removeItem("sfd_admin_autorizado");setErro("Não foi possível concluir o acesso. Tente novamente.");}
    finally{setEntrando(false);}
  }

  if(user===undefined)return <div className="landing-loading">Carregando...</div>;
  if(user)return children;

  const statusMsg=situacao&&({pendente:["Solicitação de acesso enviada","Seu cadastro está aguardando aprovação do Admin. Não é necessário enviar uma nova solicitação."],bloqueado:["Acesso bloqueado","Seu acesso está temporariamente bloqueado pelo Admin."],recusado:["Acesso não autorizado","Sua solicitação não foi aprovada. Entre em contato com o responsável pela plataforma."]}[situacao.status]||["Acesso aguardando aprovação","Seu cadastro ainda não está liberado."]);

  return <main className="landing-a"><div className="landing-shade"/><section className="landing-hero"><div className="landing-brand"><img src={LOGO} alt="CEDUP Hermann Hering"/><div><strong>CEDUP HERMANN HERING</strong><span>Blumenau/SC</span><span>Curso Técnico em Administração e Contabilidade</span></div></div><div className="landing-copy"><span className="landing-kicker">PLATAFORMA DIDÁTICA</span><h1>Simulador<br/><em>Fiscal Didático</em></h1><p>Aprenda na prática a emissão de NF-e, com bases de cálculo, operações fiscais e as regras de transição do IBS e CBS, de forma simples e didática.</p><div className="landing-features"><div><b>▣ Emissão de NF-e simulada</b><span>Modelo didático ampliado e sem validade fiscal.</span></div><div><b>▥ Regras IBS/CBS — 2026</b><span>Bases, alíquotas, valores e tratamento da transição tributária.</span></div><div><b>▤ Histórico completo</b><span>Visualização, PDF individual e salvamento em bloco.</span></div><div><b>◇ Aprendizado na prática</b><span>Aplicação voltada ao ensino técnico.</span></div></div><blockquote>“Formação técnica de qualidade para formar grandes profissionais.”</blockquote></div></section>
  <section className="landing-access"><div className="login-card"><div className="login-icon">🔒</div><h2>Entrar no sistema</h2><p>Entre com sua conta Google para acessar o Simulador Fiscal Didático.</p>
  {statusMsg?<div className={`access-status access-${situacao.status}`}><strong>{statusMsg[0]}</strong><p>{statusMsg[1]}</p><span><b>Conta:</b> {situacao.email}</span><span><b>Status:</b> {situacao.status==="pendente"?"Aguardando aprovação":situacao.status}</span><button type="button" onClick={()=>setSituacao(null)}>Voltar ao login</button></div>:<>
  <div className="profile-label">PERFIL DE ACESSO</div><div className="profile-switch" role="group" aria-label="Perfil de acesso"><button type="button" className={perfil==="admin"?"active":""} onClick={()=>{setPerfil("admin");setErro("");}}>⚙ Admin</button><button type="button" className={perfil==="professor"?"active":""} onClick={()=>{setPerfil("professor");setErro("");setCodigoAdmin("");}}>👤 Professor(a)</button></div>
  {perfil==="admin"&&<div className="admin-code-field"><label htmlFor="codigo-admin">CÓDIGO MESTRE — ADMIN</label><input id="codigo-admin" type="password" autoComplete="off" value={codigoAdmin} onChange={e=>setCodigoAdmin(e.target.value)} placeholder="Digite o código mestre"/><small>Obrigatório para acesso com perfil Admin.</small></div>}
  <button className="google-button" onClick={entrar} disabled={entrando}><span>G</span>{entrando?"Verificando acesso...":"Continuar com o Google"}</button><div className="professor-note"><strong>{perfil==="admin"?"Acesso administrativo":"Acesso do professor sujeito à aprovação"}</strong><span>{perfil==="admin"?"Perfil reservado à administração e às configurações da plataforma.":"No primeiro acesso, a conta Google será encaminhada ao Admin para liberação."}</span></div></>}
  {erro&&<div className="landing-error">{erro}</div>}<small>Autenticado via Firebase Authentication — somente conta Google.</small></div></section>
  <footer className="landing-footer"><div><strong>© 2026 JLC.</strong> Todos os direitos reservados.</div><div>Plataforma didática desenvolvida para o CEDUP Hermann Hering — Curso Técnico em Administração e Contabilidade.</div><div className="landing-place">Blumenau/SC &nbsp; | &nbsp; 2026</div></footer></main>;
}
