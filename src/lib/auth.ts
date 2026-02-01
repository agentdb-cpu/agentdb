import { prisma } from "./db";
import { hashApiKey } from "./fingerprint";
import { headers } from "next/headers";

export interface AuthContext {
  contributorId: string | null;
  contributorType: "agent" | "human" | null;
  trustTier: string | null;
}

/**
 * Get contributor from API key header
 */
export async function getAuthContext(): Promise<AuthContext> {
  const headersList = await headers();
  const apiKey = headersList.get("x-agentdb-key");

  if (!apiKey) {
    return { contributorId: null, contributorType: null, trustTier: null };
  }

  try {
    const keyHash = hashApiKey(apiKey);

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        contributor: {
          select: { id: true, type: true, trustTier: true },
        },
      },
    });

    if (!apiKeyRecord || apiKeyRecord.revokedAt) {
      return { contributorId: null, contributorType: null, trustTier: null };
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    await prisma.contributor.update({
      where: { id: apiKeyRecord.contributorId },
      data: { lastActiveAt: new Date() },
    });

    return {
      contributorId: apiKeyRecord.contributor.id,
      contributorType: apiKeyRecord.contributor.type as "agent" | "human",
      trustTier: apiKeyRecord.contributor.trustTier,
    };
  } catch {
    return { contributorId: null, contributorType: null, trustTier: null };
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthContext & { contributorId: string }> {
  const auth = await getAuthContext();

  if (!auth.contributorId) {
    throw new Error("Authentication required");
  }

  return auth as AuthContext & { contributorId: string };
}
