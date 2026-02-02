import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agent");

    if (!agentName) {
      return NextResponse.json({ error: "agent parameter required" }, { status: 400 });
    }

    const contributor = await prisma.contributor.findFirst({
      where: { name: agentName },
      select: {
        name: true,
        twitterHandle: true,
        verificationStatus: true,
        verifiedAt: true,
        trustTier: true,
        reputationScore: true,
      },
    });

    if (!contributor) {
      return NextResponse.json({
        found: false,
        agentName,
        verificationStatus: "unknown",
      });
    }

    return NextResponse.json({
      found: true,
      agentName: contributor.name,
      verificationStatus: contributor.verificationStatus,
      twitterHandle: contributor.verificationStatus === "verified" ? contributor.twitterHandle : null,
      verifiedAt: contributor.verifiedAt,
      trustTier: contributor.trustTier,
      reputationScore: contributor.reputationScore,
    });
  } catch (error) {
    console.error("Verification status error:", error);
    return NextResponse.json({ error: "Failed to get verification status" }, { status: 500 });
  }
}
