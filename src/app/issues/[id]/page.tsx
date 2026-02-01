import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Eye, GitBranch } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/card";
import { Badge, StatusBadge, StackTag, ConfidenceBadge } from "@/components/badge";
import { SolutionCard } from "@/components/solution-card";
import { Button } from "@/components/button";
import { formatRelativeTime, formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

async function getIssue(id: string) {
  try {
    return await prisma.issue.findUnique({
      where: { id },
      include: {
        solutions: {
          where: { supersededById: null },
          orderBy: { confidenceScore: "desc" },
          include: {
            _count: { select: { verifications: true } },
          },
        },
        createdBy: { select: { name: true, type: true } },
        relatedFrom: {
          include: {
            to: { select: { id: true, title: true, status: true } },
          },
          take: 5,
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function IssuePage({ params }: Props) {
  const { id } = await params;
  const issue = await getIssue(id);

  if (!issue) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      {/* Issue header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <StatusBadge status={issue.status} />
          {issue.occurrenceCount > 1 && (
            <Badge variant="outline" size="sm">
              <Eye className="w-3 h-3 mr-1" />
              {issue.occurrenceCount} occurrences
            </Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{issue.title}</h1>

        {/* Stack tags */}
        {issue.stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {issue.stack.map((tag) => (
              <StackTag key={tag} name={tag} />
            ))}
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(issue.createdAt)}</span>
          </div>
          {issue.createdBy && (
            <div>
              by {issue.createdBy.name} ({issue.createdBy.type})
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error details */}
          {(issue.errorType || issue.errorMessage) && (
            <Card>
              <h2 className="text-lg font-semibold mb-3">Error</h2>
              <CardContent>
                {issue.errorType && (
                  <code className="text-error bg-error/10 px-2 py-1 rounded font-mono">
                    {issue.errorType}
                    {issue.errorCode && ` [${issue.errorCode}]`}
                  </code>
                )}
                {issue.errorMessage && (
                  <pre className="mt-3 text-sm overflow-x-auto">
                    <code>{issue.errorMessage}</code>
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {issue.description && (
            <Card>
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {issue.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stack trace */}
          {issue.stackTrace && (
            <Card>
              <h2 className="text-lg font-semibold mb-3">Stack Trace</h2>
              <CardContent>
                <pre className="text-sm overflow-x-auto max-h-64">
                  <code>{issue.stackTrace}</code>
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Solutions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Solutions ({issue.solutions.length})
              </h2>
              <Link href={`/issues/${issue.id}/solutions/new`}>
                <Button variant="outline" size="sm">
                  Add Solution
                </Button>
              </Link>
            </div>

            {issue.solutions.length > 0 ? (
              <div className="space-y-4">
                {issue.solutions.map((solution) => (
                  <SolutionCard key={solution.id} solution={solution} expanded />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No solutions yet. Be the first to help!
                </p>
                <Link href={`/issues/${issue.id}/solutions/new`}>
                  <Button>Add Solution</Button>
                </Link>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Environment */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Environment</h3>
            <CardContent className="space-y-2 text-sm">
              {issue.runtime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runtime</span>
                  <code>{issue.runtime}</code>
                </div>
              )}
              {issue.os && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OS</span>
                  <code>{issue.os}</code>
                </div>
              )}
              {issue.environment && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <code>{issue.environment}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dependencies */}
          {issue.dependencies && Object.keys(issue.dependencies as object).length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-3">Dependencies</h3>
              <CardContent className="space-y-1 text-sm font-mono">
                {Object.entries(issue.dependencies as Record<string, string>).map(([pkg, ver]) => (
                  <div key={pkg} className="flex justify-between">
                    <span className="text-muted-foreground">{pkg}</span>
                    <span>{ver}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Related issues */}
          {issue.relatedFrom.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Similar Issues
              </h3>
              <CardContent className="space-y-2">
                {issue.relatedFrom.map((rel) => (
                  <Link
                    key={rel.to.id}
                    href={`/issues/${rel.to.id}`}
                    className="block p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{rel.to.title}</span>
                      <StatusBadge status={rel.to.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Fingerprint */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Signature</h3>
            <CardContent>
              <code className="text-xs text-muted-foreground break-all">
                {issue.fingerprint}
              </code>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
