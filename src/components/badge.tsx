import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  info: "bg-primary/10 text-primary border-primary/20",
  outline: "bg-transparent border-border text-muted-foreground",
};

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium border rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Confidence badge
export function ConfidenceBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  let variant: BadgeVariant = "default";
  let label = "Low";

  if (score >= 0.8) {
    variant = "success";
    label = "High";
  } else if (score >= 0.5) {
    variant = "warning";
    label = "Medium";
  }

  return (
    <Badge variant={variant} size="sm">
      {label} ({percent}%)
    </Badge>
  );
}

// Status badge
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    open: "info",
    solved: "success",
    stale: "default",
    verified: "success",
    unverified: "warning",
    deprecated: "error",
  };

  return (
    <Badge variant={variants[status] || "default"} size="sm">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Stack tag
export function StackTag({ name }: { name: string }) {
  return (
    <Badge variant="outline" size="sm">
      {name}
    </Badge>
  );
}
