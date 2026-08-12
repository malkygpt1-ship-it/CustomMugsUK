import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom Mugs UK | Personalised Mugs Made Easy",
  description:
    "Create an 11 oz or 15 oz personalised mug with your own words, font and colours, ready for UK delivery.",
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
