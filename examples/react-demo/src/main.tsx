import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProviderWrapper } from "./components/ProviderWrapper";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProviderWrapper>
      <App />
    </ProviderWrapper>
  </StrictMode>
);
