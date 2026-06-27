"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { WalletModal } from "@/components/WalletModal";
import { shortenAddress } from "@/lib/utils";
import { Layers, Wallet, Activity, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Layers },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app-page", label: "App", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, balance, walletModalOpen, setWalletModalOpen } =
    useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Layers className="h-6 w-6 text-primary" />
              <span>LeaseNFT</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && address ? (
              <div className="hidden sm:flex items-center gap-2">
                {balance && (
                  <Badge variant="secondary">
                    {parseFloat(balance).toFixed(2)} XLM
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="font-mono text-xs cursor-pointer"
                  onClick={() => setWalletModalOpen(true)}
                >
                  {shortenAddress(address)}
                </Badge>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="hidden sm:flex gap-2"
              >
                <Wallet className="h-4 w-4" />
                Connect
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {isConnected && address ? (
              <div className="pt-2 space-y-2">
                <Badge variant="outline" className="font-mono text-xs w-full justify-center py-1">
                  {shortenAddress(address)}
                </Badge>
                {balance && (
                  <Badge variant="secondary" className="w-full justify-center py-1">
                    {parseFloat(balance).toFixed(2)} XLM
                  </Badge>
                )}
              </div>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setWalletModalOpen(true);
                  setMobileOpen(false);
                }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        )}
      </nav>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </>
  );
}
