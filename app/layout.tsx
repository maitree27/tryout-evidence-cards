import type { Metadata, Viewport } from "next";
import { Doto, Inter } from "next/font/google";
import { Glow } from "@/components/glow";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const doto = Doto({ weight: ["400", "800"], subsets: ["latin"], variable: "--font-doto" });

export const metadata: Metadata = {
  title: "Willow",
  description: "Video-based batting analysis and progress tracking for cricket.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies the saved light/dark choice before the page paints, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("willow-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${doto.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Glow />
        {children}
      </body>
    </html>
  );
}
