import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import cedupLogo from "./assets/cedup_logo.png";
import "./landing.css";

const LOGO = cedupLogo;
const ADMIN_CODE_SHA256 = "ba9ccbb26ddf022c59e03c421f79df80645263f14ddbc0843706b11184bc6c93";

async function sha256(texto){
  const bytes=new TextEncoder().encode(texto);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function LandingGate({ children }) {
  const [user, setUser] = useState(undefined);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [perfil, setPerfil] = useState("professor");
  const [codigoAdmin, setCodigoAdmin] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function entrar() {
    setErro("");
    if(perfil==="admin"){
      if(!codigoAdmin.trim()){
        setErro("Informe o código mestre para entrar como Admin.");
        return;
      }
      const codigoHash=await sha256(codigoAdmin.trim());
      if(codigoHash!==ADMIN_CODE_SHA256){
        setErro("Código mestre inválido para acesso como Admin.");
        return;
      }
    }

    setEntrando(true);
    try {
      localStorage.setItem("sfd_perfil_acesso", perfil);
      localStorage.setItem("sfd_admin_autorizado", perfil==="admin" ? "1" : "0");
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      localStorage.removeItem("sfd_perfil_acesso");
      localStorage.removeItem("sfd_admin_autorizado");
      setErro("Não foi possível entrar com a conta Google. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  }

  if (user === undefined) return <div className="landing-loading">Carregando...</div>;
  if (user) return children;

  return <main className="landing-a">
    <div className="landing-shade" />
    <section className="landing-hero">
      <div className="landing-brand"><img src={LOGO} alt="CEDUP Hermann Hering"/><div><strong>CEDUP HERMANN HERING</strong><span>Blumenau/SC</span><span>Curso Técnico em Administração e Contabilidade</span></div></div>
      <div className="landing-copy"><span className="landing-kicker">PLATAFORMA DIDÁTICA</span><h1>Simulador<br/><em>Fiscal Didático</em></h1><p>Aprenda na prática a emissão de NF-e, com bases de cálculo, operações fiscais e as regras de transição do IBS e CBS, de forma simples e didática.</p>
        <div className="landing-features"><div><b>▣ Emissão de NF-e simulada</b><span>Modelo didático ampliado e sem validade fiscal.</span></div><div><b>▥ Regras IBS/CBS — 2026</b><span>Bases, alíquotas, valores e tratamento da transição tributária.</span></div><div><b>▤ Histórico completo</b><span>Visualização, PDF individual e salvamento em bloco.</span></div><div><b>◇ Aprendizado na prática</b><span>Aplicação voltada ao ensino técnico.</span></div></div>
        <blockquote>“Formação técnica de qualidade para formar grandes profissionais.”</blockquote></div>
    </section>

    <section className="landing-access">
      <div className="login-card">
        <div className="login-icon">🔒</div>
        <h2>Entrar no sistema</h2>
        <p>Entre com sua conta Google para acessar o Simulador Fiscal Didático.</p>

        <div className="profile-label">PERFIL DE ACESSO</div>
        <div className="profile-switch" role="group" aria-label="Perfil de acesso">
          <button type="button" className={perfil==="admin"?"active":""} onClick={()=>{setPerfil("admin");setErro("");}}>⚙ Admin</button>
          <button type="button" className={perfil==="professor"?"active":""} onClick={()=>{setPerfil("professor");setErro("");setCodigoAdmin("");}}>👤 Professor(a)</button>
        </div>

        {perfil==="admin" && <div className="admin-code-field">
          <label htmlFor="codigo-admin">CÓDIGO MESTRE — ADMIN</label>
          <input id="codigo-admin" type="password" autoComplete="off" value={codigoAdmin} onChange={e=>setCodigoAdmin(e.target.value)} placeholder="Digite o código mestre" />
          <small>Obrigatório para acesso com perfil Admin.</small>
        </div>}

        <button className="google-button" onClick={entrar} disabled={entrando}><span>G</span>{entrando ? "Entrando..." : "Continuar com o Google"}</button>

        <div className="professor-note">
          <strong>{perfil==="admin" ? "Acesso administrativo" : "Acesso do professor"}</strong>
          <span>{perfil==="admin" ? "Perfil reservado à administração e às configurações da plataforma." : "Perfil destinado à utilização didática do Simulador Fiscal."}</span>
        </div>

        {erro && <div className="landing-error">{erro}</div>}
        <small>Autenticado via Firebase Authentication — somente conta Google.</small>
      </div>
    </section>

    <footer className="landing-footer"><div><strong>© 2026 JLC.</strong> Todos os direitos reservados.</div><div>Plataforma didática desenvolvida para o CEDUP Hermann Hering — Curso Técnico em Administração e Contabilidade.</div><div className="landing-place">Blumenau/SC &nbsp; | &nbsp; 2026</div></footer>
  </main>;
}
