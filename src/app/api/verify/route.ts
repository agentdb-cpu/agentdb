import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { calculateConfidence, TRUST_WEIGHTS, TrustTier } from "@/lib/confidence";
import { z } from "zod";

const createVerificationSchema = z.object({
  solutionId: z.string().uuid(),
  outcome: z.enum(["success", "failure", "partial"]),
  runtime: z.string().optional(),
  os: z.string().optional(),
  dependencies: z.record(z.string()).default({}),
  beforeState: z.string().optional(),
  afterState: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await request.json();

    // Validate input
    const parsed = createVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get solution with current stats
    const solution = await prisma.solution.findUnique({
      where: { id: data.solutionId },
      include: {
        issue: { select: { id: true, status: true } },
      },
    });

    if (!solution) {
      return NextResponse.json({ error: "Solution not found" }, { status: 404 });
    }

    const previousConfidence = solution.confidenceScore;

    // Calculate verification weight based on trust tier
    const trustTier = (auth.trustTier as TrustTier) || "new";
    const weight = TRUST_WEIGHTS[trustTier];

    // Update counts
    let newSuccessCount = solution.successCount;
    let newFailureCount = solution.failureCount;

    switch (data.outcome) {
      case "success":
        newSuccessCount += weight;
        break;
      case "failure":
        newFailureCount += weight;
        break;
      case "partial":
        newSuccessCount += weight * 0.5;
        newFailureCount += weight * 0.5;
        break;
    }

    const newVerificationCount = solution.verificationCount + 1;
    const newConfidence = calculateConfidence(
      newVerificationCount,
      newSuccessCount,
      new Date()
    );

    const confidenceDelta = newConfidence - previousConfidence;

    // Create verification
    const verification = await prisma.verification.create({
      data: {
        solutionId: data.solutionId,
        outcome: data.outcome,
        runtime: data.runtime,
        os: data.os,
        dependencies: data.dependencies,
        beforeState: data.beforeState,
        afterState: data.afterState,
        notes: data.notes,
        createdById: auth.contributorId,
        confidenceDelta,
      },
    });

    // Update solution
    await prisma.solution.update({
      where: { id: data.solutionId },
      data: {
        confidenceScore: newConfidence,
        verificationCount: newVerificationCount,
        successCount: newSuccessCount,
        failureCount: newFailureCount,
        lastVerifiedAt: new Date(),
      },
    });

    // Mark issue as solved if confidence is high
    if (newConfidence >= 0.7 && solution.issue.status === "open") {
      await prisma.issue.update({
        where: { id: solution.issue.id },
        data: { status: "solved" },
      });
    }

    // Update contributor stats
    if (auth.contributorId) {
      await prisma.contributor.update({
        where: { id: auth.contributorId },
        data: { lastActiveAt: new Date() },
      });
    }

    return NextResponse.json({
      verificationId: verification.id,
      solutionConfidenceBefore: previousConfidence,
      solutionConfidenceAfter: newConfidence,
      confidenceDelta,
      message: "Verification recorded. Thank you for improving the knowledge base.",
    }, { status: 201 });
  } catch (error) {
    console.error("Create verification error:", error);
    return NextResponse.json({ error: "Failed to create verification" }, { status: 500 });
  }
}
