import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manjaro Package Dependency Explorer",
  description: "Interactive browser-based tool for visualizing and exploring package dependencies from pacman-managed systems",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
