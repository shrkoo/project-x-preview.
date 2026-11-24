import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { novyra: { blue: "#2F80ED", success: "#27AE60", warning: "#F2C94C", error: "#EB5757" } }, borderRadius: { glass: "24px" }, boxShadow: { glass: "0 24px 75px rgba(78,141,197,.12)" } } }, plugins: [] };
export default config;
