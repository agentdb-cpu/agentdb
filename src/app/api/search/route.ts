import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFingerprint } from "@/lib/fingerprint";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const stack = searchParams.get("stack")?.split(",").filter(Boolean) || [];
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const minConfidence = parseFloat(searchParams.get("minConfidence") || "0");

  try {
    const issues = await prisma.issue.findMany({
      where: {
        AND: [
          // Text search
          query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { errorType: { contains: query, mode: "insensitive" } },
                  { errorMessage: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          // Stack filter
          stack.length > 0 ? { stack: { hasSome: stack } } : {},
          // Verified filter
          verifiedOnly
            ? {
                solutions: {
                  some: {
                    confidenceScore: { gte: 0.7 },
                    verificationCount: { gte: 1 },
                  },
                },
              }
            : {},
          // Not stale
          { status: { not: "stale" } },
        ],
      },
      include: {
        solutions: {
          where: minConfidence > 0 ? { confidenceScore: { gte: minConfidence } } : {},
          orderBy: { confidenceScore: "desc" },
          take: 3,
          select: {
            id: true,
            confidenceScore: true,
            verificationCount: true,
          },
        },
        _count: { select: { solutions: true } },
      },
      orderBy: [{ occurrenceCount: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters = {} } = body;

    // Generate fingerprint from error signature
    const fingerprint = generateFingerprint(
      query.errorType || null,
      query.errorMessage || null,
      query.context?.runtime
    );

    // Search by fingerprint similarity and text
    const issues = await prisma.issue.findMany({
      where: {
        AND: [
          {
            OR: [
              { fingerprint },
              query.errorType ? { errorType: { contains: query.errorType, mode: "insensitive" } } : {},
              query.errorMessage
                ? { errorMessage: { contains: query.errorMessage, mode: "insensitive" } }
                : {},
            ],
          },
          filters.stack?.length ? { stack: { hasSome: filters.stack } } : {},
          filters.verifiedOnly
            ? { solutions: { some: { confidenceScore: { gte: 0.7 } } } }
            : {},
          { status: { not: "stale" } },
        ],
      },
      include: {
        solutions: {
          where: { confidenceScore: { gte: filters.minConfidence || 0.3 } },
          orderBy: { confidenceScore: "desc" },
          take: 5,
        },
        _count: { select: { solutions: true } },
      },
      orderBy: { confidenceScore: "desc" },
      take: 20,
    });

    return NextResponse.json({
      results: issues.map((issue) => ({
        issueId: issue.id,
        issueTitle: issue.title,
        fingerprintMatch: issue.fingerprint === fingerprint ? 1.0 : 0.5,
        solutions: issue.solutions.map((s) => ({
          solutionId: s.id,
          rootCause: s.rootCause,
          fixSummary: s.summary,
          commands: s.commands,
          confidence: {
            score: s.confidenceScore,
            verificationCount: s.verificationCount,
            lastVerifiedDaysAgo: s.lastVerifiedAt
              ? Math.floor(
                  (Date.now() - new Date(s.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
          },
        })),
      })),
      meta: {
        queryFingerprint: fingerprint,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
