import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PDF Editor - Bearbeiten Sie PDFs schnell und einfach",
  description: "Moderner, schneller PDF-Editor im Browser. Bearbeiten, organisieren und exportieren Sie Ihre PDF-Dateien mit einer minimalistischen Benutzeroberfläche.",
  keywords: ["PDF Editor", "PDF bearbeiten", "PDF online", "PDF Tool", "Dokumente bearbeiten"],
  authors: [{ name: "PDF Editor" }],
  openGraph: {
    title: "PDF Editor - Bearbeiten Sie PDFs schnell und einfach",
    description: "Moderner, schneller PDF-Editor im Browser. Bearbeiten, organisieren und exportieren Sie Ihre PDF-Dateien.",
    type: "website",
    locale: "de_DE",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Editor - Bearbeiten Sie PDFs schnell und einfach",
    description: "Moderner, schneller PDF-Editor im Browser.",
  },
};

import { ThemeProvider } from "@/lib/theme/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
