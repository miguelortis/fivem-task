import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FiveM Dev Tasks",
  description: "Panel de administración de tareas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* Aquí envolvemos toda la app para que NextAuth funcione */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}