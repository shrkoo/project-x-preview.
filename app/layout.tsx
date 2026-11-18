import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVYRA — فضای بازی و دورهمی",
  description: "یک پلتفرم برای بازی، دوستان و ساختن لحظه‌های مشترک.",
  applicationName: "NOVYRA",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070a18",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
