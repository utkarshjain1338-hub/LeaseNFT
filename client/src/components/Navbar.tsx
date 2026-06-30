"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { WalletModal } from "@/components/WalletModal";
import { shortenAddress } from "@/lib/utils";
import { Layers, Wallet, Activity, LayoutDashboard, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Layers },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app-page", label: "App", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const {
    address,
    isConnected,
    isConnecting,
    balance,
    network,
    walletModalOpen,
    setWalletModalOpen,
    disconnect,
  } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl"
              aria-label="LeaseNFT home"
            >
              <Layers className="h-6 w-6 text-primary" aria-hidden="true" />
              <span>LeaseNFT</span>
            </Link>

            {/* Desktop nav */}
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
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Wallet actions */}
          <div className="flex items-center gap-3">
            {isConnected && address ? (
              <div className="hidden sm:flex items-center gap-2">
                {/* Network badge */}
                <Badge
                  variant={network === "mainnet" ? "success" : "warning"}
                  className="uppercase text-[10px] hidden md:flex"
                  aria-label={`Connected to ${network || "testnet"}`}
                >
                  {network || "testnet"}
                </Badge>

                {/* Balance */}
                {balance && (
                  <Badge
                    variant="secondary"
                    aria-label={`Balance: ${parseFloat(balance).toFixed(2)} XLM`}
                  >
                    {parseFloat(balance).toFixed(2)} XLM
                  </Badge>
                )}

                {/* Address — opens wallet modal */}
                <Badge
                  variant="outline"
                  className="font-mono text-xs cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setWalletModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Wallet: ${address}. Click to manage wallet.`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setWalletModalOpen(true);
                  }}
                >
                  {shortenAddress(address)}
                </Badge>

                {/* Disconnect button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  aria-label="Disconnect wallet"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button
                id="navbar-connect-btn"
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="hidden sm:flex gap-2"
                disabled={isConnecting}
                aria-label="Connect a Stellar wallet"
                aria-busy={isConnecting}
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                {isConnecting ? "Connecting…" : "Connect"}
              </Button>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t p-4 space-y-2"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            {isConnected && address ? (
              <div className="pt-2 space-y-2">
                <Badge
                  variant={network === "mainnet" ? "success" : "warning"}
                  className="uppercase text-[10px] w-full justify-center py-1 truncate block text-center"
                  aria-label={`Connected to ${network || "testnet"}`}
                >
                  {network || "testnet"}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs w-full justify-center py-1 truncate block text-center"
                  aria-label={`Connected wallet: ${address}`}
                >
                  {shortenAddress(address)}
                </Badge>
                {balance && (
                  <Badge
                    variant="secondary"
                    className="w-full justify-center py-1 truncate block text-center"
                    aria-label={`Balance: ${parseFloat(balance).toFixed(2)} XLM`}
                  >
                    {parseFloat(balance).toFixed(2)} XLM
                  </Badge>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive border-destructive/30 hover:border-destructive/60"
                  onClick={() => {
                    disconnect();
                    setMobileOpen(false);
                  }}
                  aria-label="Disconnect wallet"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setWalletModalOpen(true);
                  setMobileOpen(false);
                }}
                disabled={isConnecting}
                aria-label="Connect a Stellar wallet"
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            )}
          </div>
        )}
      </nav>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </>
  );
}
