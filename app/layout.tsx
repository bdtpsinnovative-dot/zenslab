import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import GlobalMessengerInquiryButton from "@/src/components/GlobalMessengerInquiryButton";
import AnalyticsTracker from "@/src/components/AnalyticsTracker";
import { Suspense } from "react";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-playfair' });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400"], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.zen-slab.com'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: "ZENSLAB | แผ่นไม้จริง ไม้แผ่นใหญ่ โต๊ะไม้แผ่นเดียวพรีเมียม Live Edge Furniture",
    template: "%s | ZENSLAB แผ่นไม้จริงพรีเมียม",
  },
  description: "ZENSLAB (เซนสแลป) ศูนย์รวมไม้แผ่นใหญ่ ไม้แผ่นเดียว โต๊ะไม้จริงพรีเมียม ไม้จามจุรี ไม้สัก ไม้วอลนัทธรรมชาติ คัดสรรพิเศษเกรดคุณภาพระดับ Masterpiece สำหรับบ้านและโครงการของคุณ",
  keywords: [
    "ZENSLAB",
    "zenslab",
    "zen-slab",
    "zenslabs",
    "เซนสแลป",
    "ไม้แผ่นใหญ่",
    "โต๊ะไม้แผ่นเดียว",
    "ไม้จริงแผ่นเดียว",
    "แผ่นไม้สแลป",
    "live edge table",
    "โต๊ะไม้จามจุรี",
    "ไม้สักทอง",
    "โต๊ะไม้วอลนัท",
    "wood slabs thailand",
    "เฟอร์นิเจอร์ไม้จริง",
    "zenslab by woodden"
  ],
  authors: [{ name: "ZENSLAB" }],
  creator: "ZENSLAB",
  openGraph: {
    title: "ZENSLAB | แผ่นไม้จริง ไม้แผ่นใหญ่ โต๊ะไม้แผ่นเดียวพรีเมียม Live Edge Furniture",
    description: "ZENSLAB (เซนสแลป) ศูนย์รวมไม้แผ่นใหญ่ ไม้แผ่นเดียว โต๊ะไม้จริงพรีเมียม ไม้จามจุรี ไม้สัก ไม้วอลนัทธรรมชาติ คัดสรรพิเศษเกรดคุณภาพระดับ Masterpiece",
    url: 'https://www.zen-slab.com',
    siteName: 'ZENSLAB',
    images: [
      {
        url: '/icon.png',
        width: 192,
        height: 192,
        alt: 'ZENSLAB Logo',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ZENSLAB | แผ่นไม้จริง ไม้แผ่นใหญ่ โต๊ะไม้แผ่นเดียวพรีเมียม",
    description: "ZENSLAB (เซนสแลป) ศูนย์รวมไม้แผ่นใหญ่ ไม้แผ่นเดียว โต๊ะไม้จริงพรีเมียม",
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* ✅ 2. โหลดตัวแปรฟอนต์ทั้งหมดเข้าไปฝังไว้ในหน้าเว็บ */}
      <body className={`antialiased bg-[#FAF9F6] ${inter.variable} ${playfair.variable}`}>
        {/* JSON-LD Schema for Brand Entity (Organization + WebSite + Store) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": ["Organization", "FurnitureStore"],
                "name": "ZENSLAB",
                "alternateName": [
                  "ZENSLABS",
                  "zen-slab",
                  "zenslab",
                  "เซนสแลป",
                  "ZENSLAB by Woodden",
                  "ZENSLAB Thailand"
                ],
                "url": "https://www.zen-slab.com",
                "logo": "https://www.zen-slab.com/icon.png",
                "description": "ZENSLAB (เซนสแลป) ผู้เชี่ยวชาญด้านแผ่นไม้จริง ไม้แผ่นใหญ่ โต๊ะไม้แผ่นเดียว และเฟอร์นิเจอร์ Live Edge Wood Slabs ระดับพรีเมียมในประเทศไทย",
                "sameAs": [
                  "https://www.facebook.com/zenslab.th/",
                  "https://www.instagram.com/zenslab.th/"
                ],
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "351/7-8 ซอยกรุงเทพ-นนทบุรี 13 ถนนกรุงเทพ-นนทบุรี แขวงบางซื่อ เขตบางซื่อ",
                  "addressLocality": "บางซื่อ",
                  "addressRegion": "กรุงเทพมหานคร",
                  "postalCode": "10800",
                  "addressCountry": "TH"
                },
                "priceRange": "$$"
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "ZENSLAB",
                "alternateName": ["ZENSLABS", "zen-slab"],
                "url": "https://www.zen-slab.com",
                "description": "ศูนย์รวมไม้แผ่นใหญ่ โต๊ะไม้แผ่นเดียว และเฟอร์นิเจอร์ไม้จริงพรีเมียม",
                "inLanguage": ["th", "en"],
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://www.zen-slab.com/woodslab?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              }
            ])
          }}
        />
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

        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <Navbar />
        {children}
        <GlobalMessengerInquiryButton />
      </body>
    </html>
  );
}