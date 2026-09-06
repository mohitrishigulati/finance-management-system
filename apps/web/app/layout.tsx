import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Finance OS",
  description: "Cash, profit and the seven numbers that run your business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans mx-auto max-w-[430px] min-h-screen bg-white`}>{children}</body>
    </html>
  );
}
