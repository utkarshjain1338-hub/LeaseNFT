"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
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
  const { isConnected, setWalletModalOpen } = useWallet();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center py-16 md:py-24 space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Lease NFTs on{" "}
          <span className="text-primary">Stellar</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          A permissionless NFT leasing platform. List your NFTs for lease, rent
          them by the day, and track everything on-chain with Soroban smart
          contracts.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          {isConnected ? (
            <Link href="/app-page">
              <Button size="lg" className="gap-2">
                Go to App <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setWalletModalOpen(true)}
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-5xl py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-4xl py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold text-lg">Connect Wallet</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Stellar wallet (Freighter, Albedo, LOBSTR, or others)
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="font-semibold text-lg">List or Lease</h3>
            <p className="text-sm text-muted-foreground">
              List your NFTs for lease or browse and rent available NFTs
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold text-lg">Track & Manage</h3>
            <p className="text-sm text-muted-foreground">
              Monitor active leases, view transaction history, and end leases
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
