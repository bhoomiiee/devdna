import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDNA — AI-Powered GitHub Intelligence",
  description: "Discover your developer identity, growth trajectory, and personalized improvement roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
