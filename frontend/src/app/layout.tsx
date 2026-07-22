import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Nido — Tu espacio familiar",
  description: "Organizá el día a día de tu familia con Nido: tareas, agenda y chat familiar en un solo lugar.",
  keywords: ["familia", "organizador", "tareas", "agenda", "chat familiar"],
  authors: [{ name: "Nido" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nido",
  },
  openGraph: {
    title: "Nido — Tu espacio familiar",
    description: "Organizá el día a día de tu familia en un solo lugar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
