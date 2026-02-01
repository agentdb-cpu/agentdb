"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { IssueCard } from "@/components/issue-card";
import { Filters } from "@/components/filters";
import { Loader2 } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  errorType: string | null;
  errorMessage: string | null;
  stack: string[];
  status: string;
  createdAt: string;
  _count: { solutions: number };
  solutions: Array<{
    confidenceScore: number;
    verificationCount: number;
  }>;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          ...(selectedStacks.length > 0 && { stack: selectedStacks.join(",") }),
          ...(verifiedOnly && { verifiedOnly: "true" }),
          ...(minConfidence > 0 && { minConfidence: minConfidence.toString() }),
        });

        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setResults(data.issues || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, selectedStacks, verifiedOnly, minConfidence]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="mb-8">
        <SearchBar initialQuery={query} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Filters
          stacks={[]}
          selectedStacks={selectedStacks}
          onStackChange={setSelectedStacks}
          verifiedOnly={verifiedOnly}
          onVerifiedChange={setVerifiedOnly}
          minConfidence={minConfidence}
          onConfidenceChange={setMinConfidence}
        />
      </div>

      {/* Results count */}
      {query && !isLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground mb-4">No results found</p>
          <p className="text-sm text-muted-foreground">
            Try different keywords or{" "}
            <a href="/issues/new" className="text-primary hover:underline">
              post a new issue
            </a>
          </p>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">
            Enter a search query to find issues and solutions
          </p>
        </div>
      )}
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
