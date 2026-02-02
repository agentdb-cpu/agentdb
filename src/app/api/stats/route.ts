import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stats - Public platform statistics
export async function GET() {
  try {
    const [
      totalAgents,
      totalIssues,
      totalSolutions,
      solvedIssues,
      verifiedAgents,
      recentActivity,
    ] = await Promise.all([
      prisma.contributor.count(),
      prisma.issue.count(),
      prisma.solution.count(),
      prisma.issue.count({ where: { status: "solved" } }),
      prisma.contributor.count({ where: { verificationStatus: "verified" } }),
      prisma.issue.findMany({
        select: { id: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const solveRate = totalIssues > 0
      ? Math.round((solvedIssues / totalIssues) * 100)
      : 0;

    return NextResponse.json({
      platform: {
        totalAgents,
        verifiedAgents,
        totalIssues,
        totalSolutions,
        solvedIssues,
        solveRate: `${solveRate}%`,
      },
      recentIssues: recentActivity.map(issue => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        postedAt: issue.createdAt,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
