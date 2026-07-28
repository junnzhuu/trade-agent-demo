import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const description =
    "一个面向交易业务场景的多 Agent 产品演示工作台，支持运营诊断、商品分析、招商、营销活动与项目管理。";

  return {
    metadataBase: new URL(origin),
    title: "交易 Agent｜多智能体业务工作台",
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "交易 Agent｜多智能体业务工作台",
      description,
      type: "website",
      images: [
        {
          url: new URL("/og.png", origin).toString(),
          width: 1536,
          height: 1024,
          alt: "交易 Agent 多智能体业务工作台黑白线框界面",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "交易 Agent｜多智能体业务工作台",
      description,
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
