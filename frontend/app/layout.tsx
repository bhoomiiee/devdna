import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDNA — AI-Powered GitHub Intelligence",
  description: "Discover your developer identity, growth trajectory, and personalized improvement roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://dcym8fthxf5uu.cloudfront.net" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
