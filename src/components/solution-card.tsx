import Link from "next/link";
import { CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Badge, ConfidenceBadge } from "./badge";
import { formatRelativeTime, cn } from "@/lib/utils";

interface SolutionCardProps {
  solution: {
    id: string;
    issueId: string;
    rootCause: string;
    summary: string;
    fixDescription: string;
    codeDiff?: string | null;
    commands: string[];
    confidenceScore: number;
    verificationCount: number;
    successCount: number;
    failureCount: number;
    lastVerifiedAt?: Date | string | null;
    createdAt: Date | string;
    issue?: {
      title: string;
    };
  };
  showIssueLink?: boolean;
  expanded?: boolean;
}

export function SolutionCard({ solution, showIssueLink = false, expanded = false }: SolutionCardProps) {
  const successRate = solution.verificationCount > 0
    ? Math.round((solution.successCount / solution.verificationCount) * 100)
    : 0;

  return (
    <Card hover={!expanded} className={cn("animate-fade-in", expanded && "border-primary/30")}>
      <CardHeader>
        <div className="flex-1">
          {showIssueLink && solution.issue && (
            <Link
              href={`/issues/${solution.issueId}`}
              className="text-xs text-muted-foreground hover:text-primary mb-1 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {solution.issue.title}
            </Link>
          )}
          <CardTitle className={cn(expanded ? "text-lg" : "text-base")}>
            {solution.rootCause}
          </CardTitle>
        </div>
        <ConfidenceBadge score={solution.confidenceScore} />
      </CardHeader>

      <CardContent>
        <CardDescription className={cn(expanded ? "" : "line-clamp-2")}>
          {solution.summary}
        </CardDescription>

        {expanded && solution.fixDescription && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Fix</h4>
            <p className="text-sm text-muted-foreground">{solution.fixDescription}</p>
          </div>
        )}

        {(expanded || solution.commands.length > 0) && solution.commands.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
              Commands
              <button className="p-1 hover:bg-muted rounded transition-colors">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </h4>
            <pre className="text-sm overflow-x-auto">
              <code>{solution.commands.join("\n")}</code>
            </pre>
          </div>
        )}

        {expanded && solution.codeDiff && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
              Code Changes
              <button className="p-1 hover:bg-muted rounded transition-colors">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </h4>
            <pre className="text-sm overflow-x-auto">
              <code>{solution.codeDiff}</code>
            </pre>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>{solution.verificationCount} verifications</span>
          </div>
          {solution.verificationCount > 0 && (
            <>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span>{solution.successCount}</span>
              </div>
              <div className="flex items-center gap-1 text-error">
                <XCircle className="w-4 h-4" />
                <span>{solution.failureCount}</span>
              </div>
            </>
          )}
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {solution.lastVerifiedAt
            ? `Verified ${formatRelativeTime(solution.lastVerifiedAt)}`
            : formatRelativeTime(solution.createdAt)}
        </div>
      </CardFooter>
    </Card>
  );
}
