import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai, Playfair_Display } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const reportBodyFont = Noto_Sans_Thai({
  variable: "--font-report-body",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
});

const reportTitleFont = Playfair_Display({
  variable: "--font-report-title",
  subsets: ["latin"],
  weight: ["600", "700"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${reportBodyFont.variable} ${reportTitleFont.variable} antialiased`}
      >
        <Nav />
        {children}
        <div id="react-datepicker-portal" />
      </body>
    </html>
  );
}
