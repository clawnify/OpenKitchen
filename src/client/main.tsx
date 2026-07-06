import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

// Dual-mode: an agent driving a computer-use browser passes ?agent / mode=agent.
const params = new URLSearchParams(window.location.search);
if (params.has("agent") || params.get("mode") === "agent") {
  document.documentElement.setAttribute("data-agent", "true");
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
