import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://subtrakr.me"),
  title: "SubTrakr — All your subscriptions. Tracked. Sorted.",
  description:
    "Track personal and business subscriptions, get renewal reminders before every charge, and export GST-ready reports. Built for India — UPI-friendly pricing in ₹.",
  keywords: [
    "subscription tracker",
    "subscription manager India",
    "GST subscription report",
    "renewal reminder app",
    "business subscription tracking",
  ],
  openGraph: {
    type: "website",
    url: "https://subtrakr.me",
    siteName: "SubTrakr",
    title: "SubTrakr — All your subscriptions. Tracked. Sorted.",
    description:
      "One place for every recurring payment — personal and business — with renewal reminders and GST-ready exports.",
  },
  twitter: {
    card: "summary",
    title: "SubTrakr — All your subscriptions. Tracked. Sorted.",
    description:
      "Track every recurring payment, get reminded before each charge, export GST-ready reports.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <div className="aurora" />
        {children}
      </body>
    </html>
  );
}
