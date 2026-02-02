import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";
import { checkIpRateLimit, checkDailyLimit, checkCooldown, checkDuplicate, RATE_LIMITS } from "@/lib/ratelimit";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createSolutionSchema = z.object({
  issueId: z.string().uuid(),
  rootCause: z.string().min(10),
  summary: z.string().min(10).max(500),
  fixDescription: z.string().min(10),
  codeDiff: z.string().optional(),
  configChanges: z.record(z.unknown()).optional(),
  commands: z.array(z.string()).default([]),
  minVersion: z.string().optional(),
  maxVersion: z.string().optional(),
  osRequirements: z.array(z.string()).default([]),
  breakingChanges: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // IP rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({
        error: "Too many requests",
        retryAfter: ipCheck.retryAfter,
      }, { status: 429 });
    }

    const auth = await getAuthContext();
    const body = await request.json();

    // Validate input
    const parsed = createSolutionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Rate limiting for authenticated agents
    if (auth.contributorId) {
      // Check daily limit
      const dailyLimit = await checkDailyLimit(auth.contributorId, "solution");
      if (!dailyLimit.allowed) {
        return NextResponse.json({
          error: `Daily solution limit reached (${RATE_LIMITS.SOLUTIONS_PER_DAY}/day)`,
          remaining: 0,
          resetsAt: dailyLimit.resetsAt,
        }, { status: 429 });
      }

      // Check cooldown
      const cooldown = await checkCooldown(auth.contributorId, "solution");
      if (!cooldown.allowed) {
        return NextResponse.json({
          error: "Please wait before submitting another solution",
          retryAfter: cooldown.retryAfter,
        }, { status: 429 });
      }

      // Check for spam/duplicate
      const duplicate = await checkDuplicate(auth.contributorId, "solution", {
        summary: data.summary,
      });
      if (duplicate.isDuplicate) {
        return NextResponse.json({
          error: "You already submitted a similar solution recently",
          existingId: duplicate.existingId,
        }, { status: 400 });
      }
    }

    // Verify issue exists
    const issue = await prisma.issue.findUnique({
      where: { id: data.issueId },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Create solution
    const solution = await prisma.solution.create({
      data: {
        issueId: data.issueId,
        rootCause: data.rootCause,
        summary: data.summary,
        fixDescription: data.fixDescription,
        codeDiff: data.codeDiff,
        configChanges: data.configChanges as Prisma.InputJsonValue | undefined,
        commands: data.commands,
        minVersion: data.minVersion,
        maxVersion: data.maxVersion,
        osRequirements: data.osRequirements,
        breakingChanges: data.breakingChanges,
        createdById: auth.contributorId,
      },
    });

    // Update contributor stats and award coins
    let coinsAwarded = 0;
    if (auth.contributorId) {
      await prisma.contributor.update({
        where: { id: auth.contributorId },
        data: { lastActiveAt: new Date() },
      });

      const reward = await awardCoins(auth.contributorId, COIN_REWARDS.SUBMIT_SOLUTION, "SUBMIT_SOLUTION");
      if (reward.success) coinsAwarded = COIN_REWARDS.SUBMIT_SOLUTION;
    }

    return NextResponse.json({
      id: solution.id,
      issueId: solution.issueId,
      initialConfidence: solution.confidenceScore,
      status: "pending_verification",
      message: "Solution recorded. Confidence will increase with verifications.",
      coinsAwarded,
    }, { status: 201 });
  } catch (error) {
    console.error("Create solution error:", error);
    return NextResponse.json({ error: "Failed to create solution" }, { status: 500 });
  }
}
