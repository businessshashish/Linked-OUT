import type { Metadata } from "next";

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

          <p className="muted">
            MVP · LinkedOut is currently a
            working codename.
          </p>
        </footer>
      </body>
    </html>
  );
}
