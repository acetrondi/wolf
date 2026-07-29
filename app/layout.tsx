import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Raleway } from "next/font/google";

import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wolf",
  description: "Brand-voice-aware content OS",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${raleway.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider dynamic>{children}</ClerkProvider>
      </body>
    </html>
  );
}
