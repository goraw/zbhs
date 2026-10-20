import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Zagol Care Portal",
  description: "Care documentation and staff scheduling",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
