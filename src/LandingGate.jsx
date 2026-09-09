import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import cedupLogo from "./assets/cedup_logo.png";
import "./landing.css";

const LOGO = cedupLogo;

export default function LandingGate({ children }) {
  const [user, setUser] = useState(undefined);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  async function entrar() {
    setErro(""); setEntrando(true);
    try { localStorage.setItem("sfd_perfil_acesso", "professor"); await signInWithPopup(auth, googleProvider); }
    catch (e) { setErro("Não foi possível entrar com a conta Google. Tente novamente."); }
    finally { setEntrando(false); }
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
    <section className="landing-access"><div className="login-card"><div className="login-icon">🔒</div><h2>Entrar no sistema</h2><p>Acesse com sua conta Google para utilizar o Simulador Fiscal Didático.</p><button className="google-button" onClick={entrar} disabled={entrando}><span>G</span>{entrando ? "Entrando..." : "Continuar com o Google"}</button><div className="professor-note"><strong>Acesso exclusivo do professor</strong><span>Plataforma destinada ao desenvolvimento das atividades didáticas.</span></div>{erro && <div className="landing-error">{erro}</div>}<small>Autenticado via Firebase Authentication — somente conta Google.</small></div></section>
    <footer className="landing-footer"><div><strong>© 2026 JLC.</strong> Todos os direitos reservados.</div><div>Plataforma didática desenvolvida para o CEDUP Hermann Hering — Curso Técnico em Administração e Contabilidade.</div><div className="landing-place">Blumenau/SC &nbsp; | &nbsp; 2026</div></footer>
  </main>;
}
