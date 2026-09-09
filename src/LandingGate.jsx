import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import "./landing.css";

export default function LandingGate({ children }) {
  const [user, setUser] = useState(undefined);
  const [perfil, setPerfil] = useState("aluno");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function entrar() {
    setErro(""); setEntrando(true);
    try {
      localStorage.setItem("sfd_perfil_acesso", perfil);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setErro("Não foi possível entrar com a conta Google. Tente novamente.");
    } finally { setEntrando(false); }
  }

  if (user === undefined) return <div className="landing-loading">Carregando...</div>;
  if (user) return children;

  return <main className="landing-a">
    <section className="landing-hero">
      <div className="landing-brand">
        <div className="landing-mark">SC</div>
        <div><strong>CEDUP HERMANN HERING</strong><span>Blumenau/SC</span><span>Curso Técnico em Administração e Contabilidade</span></div>
      </div>
      <div className="landing-copy">
        <span className="landing-kicker">PLATAFORMA DIDÁTICA</span>
        <h1>Simulador<br/><em>Fiscal Didático</em></h1>
        <p>Aprenda na prática a emissão de NF-e, com bases de cálculo, operações fiscais e as regras de transição do IBS e CBS.</p>
        <div className="landing-features">
          <div><b>▣ Emissão de NF-e simulada</b><span>Modelo didático ampliado e sem validade fiscal.</span></div>
          <div><b>▥ Regras IBS/CBS — 2026</b><span>Bases, alíquotas, valores e tratamento da transição tributária.</span></div>
          <div><b>▤ Histórico completo</b><span>Visualização, PDF individual e salvamento em bloco.</span></div>
          <div><b>◇ Aprendizado na prática</b><span>Aplicação voltada ao ensino técnico.</span></div>
        </div>
        <blockquote>“Educação técnica de qualidade para formar grandes profissionais.”</blockquote>
      </div>
    </section>

    <section className="landing-access">
      <div className="login-card">
        <div className="login-icon">⌑</div>
        <h2>Entrar no sistema</h2>
        <p>Acesse com sua conta Google para utilizar o Simulador Fiscal Didático.</p>
        <label>PERFIL DE ACESSO</label>
        <div className="profile-buttons">
          <button className={perfil === "aluno" ? "active" : ""} onClick={() => setPerfil("aluno")}>Aluno(a)</button>
          <button className={perfil === "professor" ? "active" : ""} onClick={() => setPerfil("professor")}>Professor(a)</button>
        </div>
        <button className="google-button" onClick={entrar} disabled={entrando}><span>G</span>{entrando ? "Entrando..." : "Continuar com o Google"}</button>
        {erro && <div className="landing-error">{erro}</div>}
        <small>Autenticado via Firebase Authentication — somente conta Google.</small>
      </div>
    </section>

    <footer className="landing-footer">© 2026 Jorge Lima Cardoso. Todos os direitos reservados. Plataforma didática desenvolvida para o CEDUP Hermann Hering — Curso Técnico em Administração e Contabilidade.</footer>
  </main>;
}
