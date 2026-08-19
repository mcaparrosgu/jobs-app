import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import MenuNavegacion from "@/components/MenuNavegacion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jobs App",
  description:
    "Ofertas de empleo remoto que encajan con tu CV, y un CV y una carta adaptados a cada una.",
  other: {
    google: "notranslate",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El menú solo tiene sentido con sesión iniciada: en la pantalla de
  // acceso ("/") no hay nada a donde navegar todavía.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="es"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {user && <MenuNavegacion email={user.email ?? ""} />}
        {children}
      </body>
    </html>
  );
}
