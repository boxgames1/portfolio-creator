import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const theme =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInit />
        <App />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
