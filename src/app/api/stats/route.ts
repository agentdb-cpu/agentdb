import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [
      issueCount,
      solutionCount,
      verificationCount,
      agentCount,
      humanCount,
      solvedIssueCount,
      highConfidenceSolutions,
    ] = await Promise.all([
      prisma.issue.count(),
      prisma.solution.count(),
      prisma.verification.count(),
      prisma.contributor.count({ where: { type: "agent" } }),
      prisma.contributor.count({ where: { type: "human" } }),
      prisma.issue.count({ where: { status: "solved" } }),
      prisma.solution.count({ where: { confidenceScore: { gte: 0.7 } } }),
    ]);

    return NextResponse.json({
      issues: {
        total: issueCount,
        solved: solvedIssueCount,
        open: issueCount - solvedIssueCount,
      },
      solutions: {
        total: solutionCount,
        highConfidence: highConfidenceSolutions,
      },
      verifications: verificationCount,
      contributors: {
        total: agentCount + humanCount,
        agents: agentCount,
        humans: humanCount,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
