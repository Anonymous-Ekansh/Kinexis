import type { Metadata } from "next";
import { Inter, Syne, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./design-system.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kinexis — Find your campus collaborators",
  description:
    "Kinexis connects students across every stream and batch by interests and ambition. Find collaborators, not just classmates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${syne.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
