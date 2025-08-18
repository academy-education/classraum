import type { Metadata } from "next";
import { Montserrat, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { StoreProvider } from '@/providers/StoreProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Classraum",
  description: "A modern classroom management platform",
  icons: [
    { rel: "icon", url: "/logo2.png", sizes: "any" },
    { rel: "shortcut icon", url: "/logo2.png" },
    { rel: "apple-touch-icon", url: "/logo2.png", sizes: "180x180" },
    { rel: "icon", url: "/logo2.png", sizes: "32x32", type: "image/png" },
    { rel: "icon", url: "/logo2.png", sizes: "16x16", type: "image/png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${notoSansKR.variable} font-montserrat antialiased`}>
        <QueryProvider>
          <StoreProvider>
            <LanguageProvider>
              <CommandPaletteProvider>
                {children}
                <ToastProvider />
                <GlobalLoader />
              </CommandPaletteProvider>
            </LanguageProvider>
          </StoreProvider>
        </QueryProvider>

        {/* ✅ INICIS SDK Script */}
        <Script
          src="https://stgstdpay.inicis.com/stdjs/INIStdPay.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
