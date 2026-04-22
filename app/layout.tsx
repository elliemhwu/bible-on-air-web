import type { Metadata } from "next";
import { Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bible On Air",
  description: "每日靈修閱讀平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${notoSerifTC.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
