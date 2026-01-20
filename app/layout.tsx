import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const reportBodyFont = localFont({
  variable: "--font-report-body",
  display: "swap",
  src: [
    { path: "../public/fonts/sarabun/Sarabun-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/sarabun/Sarabun-Italic.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/sarabun/Sarabun-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/sarabun/Sarabun-MediumItalic.ttf", weight: "500", style: "italic" },
    { path: "../public/fonts/sarabun/Sarabun-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/sarabun/Sarabun-SemiBoldItalic.ttf", weight: "600", style: "italic" },
    { path: "../public/fonts/sarabun/Sarabun-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/sarabun/Sarabun-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Intraview Capture",
  description: "Video capture and internal exam report workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${reportBodyFont.className} ${reportBodyFont.variable} ${geistMono.variable} antialiased`}
      >
        <Nav />
        {children}
        <div id="react-datepicker-portal" />
      </body>
    </html>
  );
}
