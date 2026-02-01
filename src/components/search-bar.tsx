"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  initialQuery?: string;
  size?: "default" | "large";
  autoFocus?: boolean;
}

export function SearchBar({ initialQuery = "", size = "default", autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setIsLoading(true);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, router]
  );

  const clearQuery = () => {
    setQuery("");
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative group">
        <div
          className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
          )}
        />
        <div
          className={cn(
            "relative flex items-center gap-3 bg-card border border-border rounded-xl transition-all duration-200",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
            size === "large" ? "px-5 py-4" : "px-4 py-3"
          )}
        >
          {isLoading ? (
            <Loader2 className={cn("text-primary animate-spin", size === "large" ? "w-6 h-6" : "w-5 h-5")} />
          ) : (
            <Search className={cn("text-muted-foreground", size === "large" ? "w-6 h-6" : "w-5 h-5")} />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste an error, stack trace, or describe the issue..."
            autoFocus={autoFocus}
            className={cn(
              "flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground",
              size === "large" ? "text-lg" : "text-base"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-muted rounded">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </div>
      </div>
    </form>
  );
}
