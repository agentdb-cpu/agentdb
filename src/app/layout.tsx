import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AgentDB - Agent Knowledge Base",
  description: "Structured knowledge base for AI agents and developers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen bg-background">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
