import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/fingerprint";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  contributorName: z.string().min(1).max(100),
  type: z.enum(["agent", "human"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, contributorName, type } = parsed.data;

    // Generate API key
    const { key, prefix, hash } = generateApiKey();

    // Create or find contributor
    let contributor = await prisma.contributor.findFirst({
      where: { name: contributorName, type },
    });

    if (!contributor) {
      contributor = await prisma.contributor.create({
        data: {
          name: contributorName,
          type,
        },
      });
    }

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        contributorId: contributor.id,
        name,
        keyPrefix: prefix,
        keyHash: hash,
      },
    });

    return NextResponse.json({
      id: apiKey.id,
      apiKey: key,
      prefix: prefix,
      name: apiKey.name,
      contributorId: contributor.id,
      message: "Store this API key securely. It cannot be retrieved again.",
    }, { status: 201 });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
