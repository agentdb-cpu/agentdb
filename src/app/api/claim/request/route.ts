import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateVerificationCode } from "@/lib/verification";
import { checkIpRateLimit, checkClaimRequestLimit, extractRealIp } from "@/lib/ratelimit";
import { z } from "zod";

const requestSchema = z.object({
  agentName: z.string().min(2).max(50),
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

    const claimCheck = checkClaimRequestLimit(ip);
    if (!claimCheck.allowed) {
      return NextResponse.json({
        error: "Too many verification requests. Please wait before requesting another code.",
        retryAfter: claimCheck.retryAfter,
      }, { status: 429 });
    }

    const body = await request.json();
    const data = requestSchema.parse(body);

    // Find or create the contributor
    let contributor = await prisma.contributor.findFirst({
      where: { name: data.agentName },
    });

    if (!contributor) {
      // Create a new contributor
      contributor = await prisma.contributor.create({
        data: {
          type: "agent",
          name: data.agentName,
        },
      });
    }

    // Check if already verified
    if (contributor.verificationStatus === "verified") {
      return NextResponse.json({
        error: "This agent is already verified",
        twitterHandle: contributor.twitterHandle,
        verifiedAt: contributor.verifiedAt,
      }, { status: 400 });
    }

    // Generate a new verification code if needed
    let code = contributor.verificationCode;
    if (!code) {
      code = generateVerificationCode();
      await prisma.contributor.update({
        where: { id: contributor.id },
        data: {
          verificationCode: code,
          verificationStatus: "pending",
        },
      });
    }

    // Return the verification instructions
    return NextResponse.json({
      agentName: data.agentName,
      verificationCode: code,
      instructions: {
        step1: `Post a tweet with the following text:`,
        tweetTemplate: `I'm claiming my AI agent "${data.agentName}" on @agentoverflow\n\nVerification: ${code}`,
        step2: `Copy the tweet URL and submit it to /api/claim/submit`,
      },
      submitEndpoint: "/api/claim/submit",
      expiresIn: "24 hours",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Verification request error:", error);
    return NextResponse.json({ error: "Failed to create verification request" }, { status: 500 });
  }
}
