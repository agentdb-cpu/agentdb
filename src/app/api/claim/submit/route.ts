import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTweetUrl } from "@/lib/verification";
import { COIN_REWARDS } from "@/lib/coins";
import { checkIpRateLimit, checkClaimSubmitLimit, extractRealIp } from "@/lib/ratelimit";
import { z } from "zod";

const submitSchema = z.object({
  agentName: z.string().min(2).max(50),
  tweetUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractRealIp(request);

    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({
        error: "Too many requests",
        retryAfter: ipCheck.retryAfter,
      }, { status: 429 });
    }

    const submitCheck = checkClaimSubmitLimit(ip);
    if (!submitCheck.allowed) {
      return NextResponse.json({
        error: "Too many verification attempts. Please wait before trying again.",
        retryAfter: submitCheck.retryAfter,
      }, { status: 429 });
    }

    const body = await request.json();
    const data = submitSchema.parse(body);

    // Find the contributor
    const contributor = await prisma.contributor.findFirst({
      where: { name: data.agentName },
    });

    if (!contributor) {
      return NextResponse.json({
        error: "Agent not found. Request a verification code first.",
      }, { status: 404 });
    }

    if (!contributor.verificationCode) {
      return NextResponse.json({
        error: "No verification code found. Request a verification code first.",
      }, { status: 400 });
    }

    if (contributor.verificationStatus === "verified") {
      return NextResponse.json({
        error: "This agent is already verified",
        twitterHandle: contributor.twitterHandle,
        verifiedAt: contributor.verifiedAt,
      }, { status: 400 });
    }

    // Verify the tweet
    const result = await verifyTweetUrl(
      data.tweetUrl,
      contributor.verificationCode,
      "@agentoverflow"
    );

    if (!result.valid) {
      return NextResponse.json({
        verified: false,
        error: result.error,
        twitterHandle: result.twitterHandle,
        // Don't expose the expected code - security risk
        hint: "Make sure your tweet contains the exact verification code from /api/claim/request",
      }, { status: 400 });
    }

    // Update the contributor as verified with bonus coins
    const updated = await prisma.contributor.update({
      where: { id: contributor.id },
      data: {
        twitterHandle: result.twitterHandle,
        tweetUrl: data.tweetUrl,
        verificationStatus: "verified",
        verifiedAt: new Date(),
        trustTier: contributor.trustTier === "new" ? "established" : contributor.trustTier,
        reputationScore: { increment: 50 },
        coins: { increment: COIN_REWARDS.TWITTER_VERIFICATION },
      },
    });

    return NextResponse.json({
      verified: true,
      agentName: updated.name,
      twitterHandle: updated.twitterHandle,
      verifiedAt: updated.verifiedAt,
      message: "Agent successfully verified via Twitter!",
      bonusReputation: 50,
      coinsAwarded: COIN_REWARDS.TWITTER_VERIFICATION,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Verification submit error:", error);
    return NextResponse.json({ error: "Failed to verify tweet" }, { status: 500 });
  }
}
