import React from "react";
import ReactDOM from "react-dom/client";
import AppV5 from "./AppV5";
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
import "./audittrail.css";
import "./accessapproval.css";
import "./headerchoices.css";
import "./manualPrint";
import "./floatingMenu";
import "./backupExit";
import "./adminSupport";
import "./auditTrail";
import "./accessApproval";
import "./headerChoices";
import "./manualCurrent";
import "./publicLabels";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <LandingGate>
      <ReleaseBanner />
      <AppV5 />
      <LegalFooter />
    </LandingGate>
  </React.StrictMode>
);
