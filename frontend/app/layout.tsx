import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: { default: "ProjectFlow — Project workspace", template: "%s · ProjectFlow" },
  description: "A calm, focused workspace to plan projects, manage tasks, and keep your team aligned.",
  applicationName: "ProjectFlow",
};

export const viewport: Viewport = { themeColor: "#f7f6fb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
