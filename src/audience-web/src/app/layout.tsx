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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const clean = (node) => {
                  if (node.nodeType === 1) {
                    if (node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                    node.querySelectorAll('[bis_skin_checked]').forEach(el => el.removeAttribute('bis_skin_checked'));
                  }
                };
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                      mutation.target.removeAttribute('bis_skin_checked');
                    }
                    if (mutation.type === 'childList') {
                      mutation.addedNodes.forEach(clean);
                    }
                  });
                });
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
              })();
            `
          }}
        />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AuthProvider initialUser={initialUser}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
