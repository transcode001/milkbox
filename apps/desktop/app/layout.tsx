import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milkbox Desktop",
  description: "Milkbox Electron Application",
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
