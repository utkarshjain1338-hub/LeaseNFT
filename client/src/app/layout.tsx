import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "LeaseNFT — NFT Leasing Platform on Stellar Soroban",
  description:
    "A permissionless NFT leasing platform built on Stellar Soroban. List NFTs for lease, rent them by the day, and track everything on-chain with smart contracts.",
  keywords: ["Stellar", "Soroban", "NFT", "leasing", "blockchain", "smart contract"],
  authors: [{ name: "LeaseNFT" }],
  openGraph: {
    title: "LeaseNFT — NFT Leasing on Stellar",
    description:
      "List, lease, and manage NFT rentals on the Stellar blockchain with Soroban smart contracts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        {/* Skip-to-content for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm font-medium"
        >
          Skip to main content
        </a>

        <Providers>
          <Navbar />
          <main
            id="main-content"
            className="flex-1 container mx-auto px-4 py-8"
            tabIndex={-1}
          >
            {children}
          </main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            <div className="container mx-auto px-4">
              Built on{" "}
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-primary"
                aria-label="Stellar blockchain (opens in new tab)"
              >
                Stellar
              </a>{" "}
              Soroban · LeaseNFT © {new Date().getFullYear()}
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
