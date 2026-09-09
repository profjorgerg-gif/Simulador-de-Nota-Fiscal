import React from "react";

export default function ReleaseBanner() {
  return (
    <div style={{
      background: "#0f5132",
      color: "#fff",
      padding: "8px 16px",
      textAlign: "center",
      fontSize: 13,
      fontWeight: 700,
      position: "relative",
      zIndex: 50
    }}>
      Versão 2.2 ativa — PDF A4 retrato em folha única · nome automático NF_ENTRADA/NF_SAIDA · seleção e salvamento em bloco no Histórico
    </div>
  );
}
