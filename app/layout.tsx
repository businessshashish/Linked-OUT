import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";

import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: {
    default: "LinkedOut",
    template: "%s | LinkedOut"
  },

  description:
    "Understand why employees leave companies and what they wish they knew before joining.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Nav />

        <main>{children}</main>

        <footer className="footer">
          <div>
            <div className="footerBrand">
              <img src="/logo.png" className="footerLogo" alt="" />
              <strong>LinkedOut</strong>
            </div>

            <p>
              Workplace experiences from people
              who have moved on.
            </p>
          </div>

          <nav className="footerLinks" aria-label="Footer">
            <Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/community-guidelines">Community Rules</Link><Link href="/how-anonymity-works">How Anonymity Works</Link><Link href="/report-concern">Report a Concern</Link><Link href="/moderation">Moderation</Link><Link href="/contact">Contact</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
