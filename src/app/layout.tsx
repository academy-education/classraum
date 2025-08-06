import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Classraum",
  description: "A modern classroom management platform",
  icons: [
    { rel: "icon", url: "/favicon.svg" },
    { rel: "shortcut icon", url: "/favicon.svg" },
    { rel: "apple-touch-icon", url: "/favicon.svg" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-montserrat antialiased`}>
        {children}

        {/* ✅ INICIS SDK Script */}
        <Script
          src="https://stgstdpay.inicis.com/stdjs/INIStdPay.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
