import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketBox Audience Web",
  description: "Xem concert, chọn vé, checkout và nhận e-ticket QR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full scroll-smooth antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
