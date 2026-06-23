import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getServerAuthUser } from "@/lib/backend-bff";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketBox Audience Web",
  description: "Xem concert, chọn vé, checkout và nhận e-ticket QR.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const initialUser = await getServerAuthUser();

  return (
    <html
      lang="vi"
      className="h-full scroll-smooth antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider initialUser={initialUser}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
