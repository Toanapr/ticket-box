import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ScannerAppShell } from "@/components/scanner/scanner-app-shell";
import { ScannerAppProvider } from "@/lib/scanner/state";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TicketBox Scanner",
  description: "Offline-first scanner PWA for event check-in operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ScannerAppProvider>
          <ScannerAppShell>{children}</ScannerAppShell>
        </ScannerAppProvider>
      </body>
    </html>
  );
}
