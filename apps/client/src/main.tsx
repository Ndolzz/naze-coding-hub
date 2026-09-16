import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "../../../packages/design-system/tokens.css";
import "../../../packages/design-system/components.css";
import "../../../packages/design-system/boot.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
