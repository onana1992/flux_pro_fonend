"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Appearance = "light" | "dark";

interface ThemeAppearanceContextValue {
  appearance: Appearance;
  toggleAppearance: () => void;
}

const ThemeAppearanceContext = createContext<ThemeAppearanceContextValue | null>(null);

export function ThemeAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("light");

  useEffect(() => {
    const stored = localStorage.getItem("fluxpro-appearance");
    if (stored === "light" || stored === "dark") {
      setAppearance(stored);
    }
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearance((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("fluxpro-appearance", next);
      return next;
    });
  }, []);

  return (
    <ThemeAppearanceContext.Provider value={{ appearance, toggleAppearance }}>
      {children}
    </ThemeAppearanceContext.Provider>
  );
}

export function useThemeAppearance() {
  const ctx = useContext(ThemeAppearanceContext);
  if (!ctx) throw new Error("useThemeAppearance must be used within ThemeAppearanceProvider");
  return ctx;
}
