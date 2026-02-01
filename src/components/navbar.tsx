"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Search, PlusCircle, Key, User, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Search", icon: Search },
  { href: "/issues/new", label: "Post Issue", icon: PlusCircle },
  { href: "/connect", label: "Connect", icon: Plug },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Agent<span className="text-primary">Overflow</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
