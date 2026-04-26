import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Stampworth — Your Virtual Loyalty Card",
  description: "Replace paper stamp cards with a digital loyalty system. Customers earn rewards, businesses grow repeat visits. Made for Filipino SMEs.",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${font.className} antialiased bg-white text-zinc-900`}>
        {children}
      </body>
    </html>
  );
}
