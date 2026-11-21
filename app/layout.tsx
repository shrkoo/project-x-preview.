import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./novyra-luxury.css";
export const metadata: Metadata = { title: "NOVYRA Finance — هوش مالی و حسابداری", description: "مدیریت شفاف درآمد، هزینه و تصمیم‌های مالی در تجربه‌ای آرام و مینیمال.", applicationName: "NOVYRA Finance" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f6f1" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fa"><body>{children}</body></html>; }
