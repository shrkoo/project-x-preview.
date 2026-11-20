import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./explore-cleanup.css";

export const metadata: Metadata = {
  title: "NOVYRA — شبکه اجتماعی و دستیار هوشمند",
  description: "NOVYRA؛ فضایی برای ارتباط، اشتراک‌گذاری، ویدئو و کمک هوش مصنوعی.",
  applicationName: "NOVYRA",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0907",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
