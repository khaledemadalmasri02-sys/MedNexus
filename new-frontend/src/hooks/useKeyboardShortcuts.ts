import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  const handler = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (e.metaKey || e.ctrlKey) return;

    switch (e.key.toLowerCase()) {
      case "g":
        e.preventDefault();
        navigate("/generate");
        break;
      case "l":
        e.preventDefault();
        navigate("/library");
        break;
      case "d":
        e.preventDefault();
        navigate("/");
        break;
      case "h":
        if (!e.shiftKey) {
          e.preventDefault();
          navigate("/help");
        }
        break;
      case "p":
        if (!e.shiftKey) {
          e.preventDefault();
          navigate("/profile");
        }
        break;
      case "a":
        if (!e.shiftKey && location.pathname !== "/achievements") {
          e.preventDefault();
          navigate("/achievements");
        }
        break;
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
