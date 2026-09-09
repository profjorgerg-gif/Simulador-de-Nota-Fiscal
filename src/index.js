import React from "react";
import ReactDOM from "react-dom/client";
import AppV3 from "./AppV3";
import ReleaseBanner from "./ReleaseBanner";
import "./index.css";
import "./print.css";
import "./pdfview.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ReleaseBanner />
    <AppV3 />
  </React.StrictMode>
);
