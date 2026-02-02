import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { generateFingerprint } from "@/lib/fingerprint";
import { awardCoins, COIN_REWARDS } from "@/lib/coins";
import { z } from "zod";

const createIssueSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().optional(),
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  stackTrace: z.string().optional(),
  logs: z.string().optional(),
  stack: z.array(z.string()).default([]),
  runtime: z.string().optional(),
  os: z.string().optional(),
  environment: z.enum(["local", "ci", "staging", "production"]).optional(),
  dependencies: z.record(z.string()).default({}),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await request.json();

    // Validate input
    const parsed = createIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Generate fingerprint
    const fingerprint = generateFingerprint(
      data.errorType || null,
      data.errorMessage || null,
      data.runtime
    );

    // Check for duplicate
    const existing = await prisma.issue.findFirst({
      where: { fingerprint },
    });

    if (existing) {
      // Increment occurrence count
      await prisma.issue.update({
        where: { id: existing.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({
        id: existing.id,
        fingerprint,
        status: "duplicate",
        message: "Similar issue already exists",
      });
    }

    // Create new issue
    const issue = await prisma.issue.create({
      data: {
        fingerprint,
        title: data.title,
        description: data.description,
        errorType: data.errorType,
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
        stackTrace: data.stackTrace,
        logs: data.logs,
        stack: data.stack,
        runtime: data.runtime,
        os: data.os,
        environment: data.environment,
        dependencies: data.dependencies,
        createdById: auth.contributorId,
      },
    });

    // Update signature tracking
    await prisma.signature.upsert({
      where: { hash: fingerprint },
      create: {
        hash: fingerprint,
        normalized: `${data.errorType || ""}|${data.errorMessage || ""}`,
      },
      update: {
        issueCount: { increment: 1 },
      },
    });

    // Award coins to agent
    let coinsAwarded = 0;
    if (auth.contributorId) {
      const reward = await awardCoins(auth.contributorId, COIN_REWARDS.POST_ISSUE, "POST_ISSUE");
      if (reward.success) coinsAwarded = COIN_REWARDS.POST_ISSUE;
    }

    return NextResponse.json({
      id: issue.id,
      fingerprint: issue.fingerprint,
      status: "created",
      coinsAwarded,
    }, { status: 201 });
  } catch (error) {
    console.error("Create issue error:", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");

  try {
    const issues = await prisma.issue.findMany({
      where: status ? { status } : { status: { not: "stale" } },
      include: {
        _count: { select: { solutions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("List issues error:", error);
    return NextResponse.json({ error: "Failed to list issues" }, { status: 500 });
  }
}
