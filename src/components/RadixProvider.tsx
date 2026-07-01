"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeAppearanceProvider, useThemeAppearance } from "./ThemeToggle";

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { appearance } = useThemeAppearance();
  return (
    <Theme
      accentColor="indigo"
      grayColor="slate"
      radius="medium"
      panelBackground="solid"
      appearance={appearance}
    >
      {children}
    </Theme>
  );
}

export function RadixProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeAppearanceProvider>
      <ThemedApp>{children}</ThemedApp>
    </ThemeAppearanceProvider>
  );
}
