import Link from "next/link";
import { MessageSquare, CheckCircle2, Clock, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
import { Badge, StatusBadge, StackTag } from "./badge";
import { formatRelativeTime } from "@/lib/utils";

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    errorType?: string | null;
    errorMessage?: string | null;
    stack: string[];
    status: string;
    createdAt: Date | string;
    _count?: {
      solutions: number;
    };
    solutions?: Array<{
      confidenceScore: number;
      verificationCount: number;
      successCount?: number;
    }>;
  };
}

export function IssueCard({ issue }: IssueCardProps) {
  const solutionCount = issue._count?.solutions ?? issue.solutions?.length ?? 0;
  const topSolution = issue.solutions?.[0];
  const hasVerifiedSolution = topSolution && topSolution.confidenceScore >= 0.7;

  return (
    <Link href={`/issues/${issue.id}`}>
      <Card hover className="animate-fade-in">
        <CardHeader>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={issue.status} />
              {hasVerifiedSolution && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                  {topSolution.verificationCount > 0 && (
                    <span className="text-success/70 ml-1">
                      · {topSolution.verificationCount} repro{topSolution.verificationCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2">{issue.title}</CardTitle>
          </div>
        </CardHeader>

        {issue.errorType && (
          <div className="mb-3">
            <code className="text-sm font-mono text-error bg-error/10 px-2 py-1 rounded">
              {issue.errorType}
            </code>
            {issue.errorMessage && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1 font-mono">
                {issue.errorMessage}
              </p>
            )}
          </div>
        )}

        {issue.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {issue.stack.slice(0, 4).map((tag) => (
              <StackTag key={tag} name={tag} />
            ))}
            {issue.stack.length > 4 && (
              <Badge variant="outline" size="sm">
                +{issue.stack.length - 4}
              </Badge>
            )}
          </div>
        )}

        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            <span>{solutionCount} solution{solutionCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(issue.createdAt)}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
