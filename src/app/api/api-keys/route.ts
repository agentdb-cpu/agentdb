import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/fingerprint";
import { checkIpRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  contributorName: z.string().min(1).max(100),
  type: z.enum(["agent", "human"]),
});

// Rate limit: max 3 API key creations per IP per hour
const apiKeyCreationLimits = new Map<string, { count: number; resetAt: number }>();
const API_KEY_LIMIT_PER_HOUR = 3;

function checkApiKeyRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = apiKeyCreationLimits.get(ip);

  if (!record || now > record.resetAt) {
    apiKeyCreationLimits.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour
    return { allowed: true };
  }

  if (record.count >= API_KEY_LIMIT_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // IP rate limiting - general
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";

    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({
        error: "Too many requests",
        retryAfter: ipCheck.retryAfter,
      }, { status: 429 });
    }

    // Stricter rate limit for API key creation
    const keyRateCheck = checkApiKeyRateLimit(ip);
    if (!keyRateCheck.allowed) {
      return NextResponse.json({
        error: "Too many API key creation requests. Try again later.",
        retryAfter: keyRateCheck.retryAfter,
      }, { status: 429 });
    }

    const body = await request.json();

    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, contributorName, type } = parsed.data;

    // Check if contributor already has too many API keys
    const existingContributor = await prisma.contributor.findFirst({
      where: { name: contributorName, type },
      include: { _count: { select: { apiKeys: true } } },
    });

    if (existingContributor && existingContributor._count.apiKeys >= 5) {
      return NextResponse.json({
        error: "Maximum API keys limit reached (5 per contributor)",
      }, { status: 400 });
    }

    // Generate API key
    const { key, prefix, hash } = generateApiKey();

    // Create or find contributor
    let contributorId: string;

    if (existingContributor) {
      contributorId = existingContributor.id;
    } else {
      const newContributor = await prisma.contributor.create({
        data: {
          name: contributorName,
          type,
        },
      });
      contributorId = newContributor.id;
    }

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        contributorId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
      },
    });

    // Return key only once - user must save it
    // Mask middle portion for any logs (only show first 8 and last 4 chars)
    const maskedKey = key.length > 12
      ? `${key.slice(0, 8)}...${key.slice(-4)}`
      : key;

    return NextResponse.json({
      id: apiKey.id,
      apiKey: key, // Full key returned ONLY on creation
      keyPreview: maskedKey, // For user's reference
      prefix: prefix,
      name: apiKey.name,
      contributorId,
      warning: "SAVE THIS KEY NOW. It will never be shown again.",
    }, { status: 201 });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
