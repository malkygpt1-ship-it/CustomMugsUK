import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom Mugs UK | Design Your Personalised Mug",
  description:
    "Choose a character, add your own words and preview your personalised mug live before ordering for UK delivery.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
