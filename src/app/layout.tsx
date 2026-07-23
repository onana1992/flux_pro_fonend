import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { RadixProvider } from "@/components/RadixProvider";
import { TenantProvider } from "@/components/TenantProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FluxPro",
  description: "Suivi de dossiers par chaîne hiérarchique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <I18nProvider>
          <RadixProvider>
            <TenantProvider>
              <AuthProvider>{children}</AuthProvider>
            </TenantProvider>
          </RadixProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
