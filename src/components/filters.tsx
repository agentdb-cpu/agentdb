"use client";

import { useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface FiltersProps {
  stacks: string[];
  selectedStacks: string[];
  onStackChange: (stacks: string[]) => void;
  verifiedOnly: boolean;
  onVerifiedChange: (verified: boolean) => void;
  minConfidence: number;
  onConfidenceChange: (confidence: number) => void;
}

const STACK_OPTIONS = [
  "solana",
  "anchor",
  "node",
  "python",
  "rust",
  "typescript",
  "react",
  "nextjs",
  "postgres",
  "redis",
  "docker",
  "aws",
  "llm",
  "openai",
  "anthropic",
];

export function Filters({
  stacks,
  selectedStacks,
  onStackChange,
  verifiedOnly,
  onVerifiedChange,
  minConfidence,
  onConfidenceChange,
}: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleStack = (stack: string) => {
    if (selectedStacks.includes(stack)) {
      onStackChange(selectedStacks.filter((s) => s !== stack));
    } else {
      onStackChange([...selectedStacks, stack]);
    }
  };

  const clearFilters = () => {
    onStackChange([]);
    onVerifiedChange(false);
    onConfidenceChange(0);
  };

  const hasActiveFilters = selectedStacks.length > 0 || verifiedOnly || minConfidence > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
            isOpen || hasActiveFilters
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border hover:border-primary/30"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Badge variant="info" size="sm">
              {selectedStacks.length + (verifiedOnly ? 1 : 0) + (minConfidence > 0 ? 1 : 0)}
            </Badge>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Quick filter: Verified only */}
        <button
          onClick={() => onVerifiedChange(!verifiedOnly)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
            verifiedOnly
              ? "border-success/50 bg-success/10 text-success"
              : "border-border hover:border-success/30"
          )}
        >
          Verified Only
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 bg-card border border-border rounded-xl space-y-4 animate-fade-in">
          {/* Stack selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Stack / Technology</label>
            <div className="flex flex-wrap gap-2">
              {STACK_OPTIONS.map((stack) => (
                <button
                  key={stack}
                  onClick={() => toggleStack(stack)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    selectedStacks.includes(stack)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {stack}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence slider */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center justify-between">
              <span>Minimum Confidence</span>
              <span className="text-muted-foreground">{Math.round(minConfidence * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence * 100}
              onChange={(e) => onConfidenceChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
