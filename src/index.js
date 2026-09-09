import React from "react";
import ReactDOM from "react-dom/client";
import AppV2 from "./AppV2";
import ReleaseBanner from "./ReleaseBanner";
import "./index.css";
import "./print.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ReleaseBanner />
    <AppV2 />
  </React.StrictMode>
);
