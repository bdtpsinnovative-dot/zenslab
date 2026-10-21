import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import GlobalMessengerInquiryButton from "@/src/components/GlobalMessengerInquiryButton";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-playfair' });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "ZENSLABS | Premium Live Edge Furniture", 
  description: "Crafting legacy pieces from nature's finest materials.",
  metadataBase: new URL('https://www.zen-slab.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "ZENSLABS | Premium Live Edge Furniture",
    description: "Crafting legacy pieces from nature's finest materials.",
    url: 'https://www.zen-slab.com',
    siteName: 'ZENSLABS',
    images: [
      {
        url: '/icon.png',
        width: 192,
        height: 192,
        alt: 'ZENSLABS Logo',
      },
    ],
    locale: 'th_TH',
    type: 'website',
    images_api_key_override: undefined,
  } as any,
  twitter: {
    card: 'summary',
    title: "ZENSLABS | Premium Live Edge Furniture",
    description: "Crafting legacy pieces from nature's finest materials.",
    images: ['/icon.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* ✅ 2. โหลดตัวแปรฟอนต์ทั้งหมดเข้าไปฝังไว้ในหน้าเว็บ */}
      <body className={`antialiased bg-[#FAF9F6] ${inter.variable} ${playfair.variable}`}>
        {/* Meta Pixel (Facebook Pixel) */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1371032467829080');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1371032467829080&ev=PageView&noscript=1"
            alt="facebook-pixel"
          />
        </noscript>

        <style dangerouslySetInnerHTML={{ __html: `
          /* Inter = English, DBHeavent = Thai (via unicode-range in globals.css) */
          body, p, span, button, input, h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-inter), 'DBHeavent', sans-serif;
          }

          h1, h2, h3, h4, h5, h6 { font-weight: 500; }

          /* Playfair = English serif, DBHeavent = Thai */
          .font-serif {
            font-family: var(--font-playfair), 'DBHeavent', serif !important;
          }
        `}} />

        <Navbar />
        {children}
        <GlobalMessengerInquiryButton />
      </body>
    </html>
  );
}