import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./novyra-signup.css";
import "./auth-refresh.css";
import "./novyra-luxury.css";
import "./novyra-completion.css";
import "./novyra-reference-final.css";
import "./transaction-sheet.css";
export const metadata: Metadata = { title: "Homa AI — هوش مالی و حسابداری", description: "هوشمندی در هر تصمیم مالی.", applicationName: "Homa AI" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f6f1" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fa"><body>{children}</body></html>; }
