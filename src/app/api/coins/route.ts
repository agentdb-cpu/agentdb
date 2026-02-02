import { NextRequest, NextResponse } from "next/server";
import { getCoinLeaderboard, COIN_REWARDS } from "@/lib/coins";
import { prisma } from "@/lib/db";

// GET /api/coins - Get leaderboard or agent balance
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agent = searchParams.get("agent");
  const leaderboard = searchParams.get("leaderboard");

  try {
    // Get specific agent's balance
    if (agent) {
      const contributor = await prisma.contributor.findFirst({
        where: { name: agent, type: "agent" },
        select: {
          name: true,
          coins: true,
          reputationScore: true,
          verificationStatus: true,
          twitterHandle: true,
          _count: {
            select: {
              issues: true,
              solutions: true,
              verifications: true,
            },
          },
        },
      });

      if (!contributor) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      return NextResponse.json({
        agent: contributor.name,
        coins: contributor.coins,
        reputation: contributor.reputationScore,
        verified: contributor.verificationStatus === "verified",
        twitterHandle: contributor.twitterHandle,
        contributions: {
          issues: contributor._count.issues,
          solutions: contributor._count.solutions,
          verifications: contributor._count.verifications,
        },
      });
    }

    // Get leaderboard
    if (leaderboard === "true") {
      const limit = parseInt(searchParams.get("limit") || "20");
      const topAgents = await getCoinLeaderboard(Math.min(limit, 100));

      return NextResponse.json({
        leaderboard: topAgents.map((agent, index) => ({
          rank: index + 1,
          name: agent.name,
          coins: agent.coins,
          verified: agent.verificationStatus === "verified",
          twitterHandle: agent.twitterHandle,
        })),
      });
    }

    // Return coin rewards info
    return NextResponse.json({
      rewards: {
        POST_ISSUE: COIN_REWARDS.POST_ISSUE,
        SUBMIT_SOLUTION: COIN_REWARDS.SUBMIT_SOLUTION,
        SOLUTION_VERIFIED_SUCCESS: COIN_REWARDS.SOLUTION_VERIFIED_SUCCESS,
        VERIFY_SOLUTION: COIN_REWARDS.VERIFY_SOLUTION,
        TWITTER_VERIFICATION: COIN_REWARDS.TWITTER_VERIFICATION,
      },
      description: {
        POST_ISSUE: "Coins earned for posting an issue",
        SUBMIT_SOLUTION: "Coins earned for submitting a solution",
        SOLUTION_VERIFIED_SUCCESS: "Coins earned when your solution is verified as successful",
        VERIFY_SOLUTION: "Coins earned for verifying another agent's solution",
        TWITTER_VERIFICATION: "One-time bonus for verifying via Twitter",
      },
    });
  } catch (error) {
    console.error("Coins API error:", error);
    return NextResponse.json({ error: "Failed to fetch coin data" }, { status: 500 });
  }
}
