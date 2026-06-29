"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddress } from "@/lib/utils";
import { Layers, Code, Zap, Shield, ArrowRight, Wallet } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "List NFTs for Lease",
    description: "NFT owners can list their tokens with a daily rate and maximum lease duration.",
  },
  {
    icon: Zap,
    title: "Permissionless Leasing",
    description: "Renters can lease any listed NFT instantly — no approvals needed.",
  },
  {
    icon: Shield,
    title: "Secure & Transparent",
    description: "All leases are tracked on-chain with timestamps and events.",
  },
  {
    icon: Code,
    title: "Soroban Smart Contracts",
    description: "Built on Stellar Soroban for low fees, fast finality, and security.",
  },
];

export default function HomePage() {
  const { address, isConnected, isConnecting, error, setError, connect, disconnect } = useWallet();

  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center py-12 sm:py-16 md:py-24 space-y-6 px-2 sm:px-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Lease NFTs on{" "}
          <span className="text-primary">Stellar</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
          A permissionless NFT leasing platform. List your NFTs for lease, rent
          them by the day, and track everything on-chain with Soroban smart
          contracts.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 w-full max-w-md mx-auto">
          {!isConnected ? (
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 min-w-[180px]"
              onClick={() => connect()}
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4 shrink-0" />
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto gap-2 font-mono group relative overflow-hidden min-w-[180px] border border-primary/20"
                onClick={disconnect}
                title="Click to Disconnect"
              >
                <span className="flex items-center gap-2 group-hover:hidden">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Connected: {shortenAddress(address)}
                </span>
                <span className="hidden group-hover:flex items-center gap-2 text-destructive font-sans font-semibold">
                  Disconnect
                </span>
              </Button>
              <Link href="/app-page" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Go to App <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Dashboard
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg max-w-md mx-auto flex items-center justify-between gap-2 border border-destructive/20">
            <span className="text-left">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 px-2 text-xs shrink-0">Dismiss</Button>
          </div>
        )}
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-5xl py-8 sm:py-12 px-2 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="overflow-hidden">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-4xl py-8 sm:py-12 px-2 sm:px-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center space-y-3 px-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Connect Wallet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Connect your Stellar wallet (Freighter, Albedo, LOBSTR, or others)
            </p>
          </div>
          <div className="text-center space-y-3 px-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="font-semibold text-base sm:text-lg">List or Lease</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              List your NFTs for lease or browse and rent available NFTs
            </p>
          </div>
          <div className="text-center space-y-3 px-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold text-base sm:text-lg">Track & Manage</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitor active leases, view transaction history, and end leases
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
