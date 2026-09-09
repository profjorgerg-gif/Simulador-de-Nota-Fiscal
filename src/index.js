import React from "react";
import ReactDOM from "react-dom/client";
import AppV3 from "./AppV3";
import ReleaseBanner from "./ReleaseBanner";
import LegalFooter from "./LegalFooter";
import LandingGate from "./LandingGate";
import "./index.css";
import "./print.css";
import "./pdfview.css";
import "./legalfooter.css";
import "./manualprint.css";
import "./landingfix.css";
import "./floatingmenu.css";
import "./backupexit.css";
import "./adminsupport.css";
import "./manualPrint";
import "./floatingMenu";
import "./backupExit";
import "./adminSupport";
import "./manualOperacionalAdmin";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <LandingGate>
      <ReleaseBanner />
      <AppV3 />
      <LegalFooter />
    </LandingGate>
  </React.StrictMode>
);
