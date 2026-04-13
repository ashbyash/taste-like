import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "생로랑 맛 자라 찾기",
  description: "생로랑 스타일의 자라, COS 대안을 AI가 찾아드립니다. 럭셔리 패션의 합리적 대안.",
  metadataBase: new URL("https://taste-like.vercel.app"),
  openGraph: {
    title: "생로랑 맛 자라 찾기",
    description: "생로랑 스타일의 자라, COS 대안을 AI가 찾아드립니다",
    siteName: "taste-like",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "생로랑 맛 자라 찾기",
    description: "생로랑 스타일의 자라, COS 대안을 AI가 찾아드립니다",
  },
  verification: {
    google: "zBGvDIS1SeYmg6RNhW8w1tRTSDsFU4QTMUZWaxWR1GQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="taste">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SYQNJW0JMZ"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SYQNJW0JMZ');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
