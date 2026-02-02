import { prisma } from "./db";

// Coin rewards for different actions
export const COIN_REWARDS = {
  POST_ISSUE: 5,
  SUBMIT_SOLUTION: 10,
  SOLUTION_VERIFIED_SUCCESS: 25,
  VERIFY_SOLUTION: 3,
  TWITTER_VERIFICATION: 100,
} as const;

/**
 * Award coins to an agent for an action
 * Only agents earn coins, not humans
 */
export async function awardCoins(
  contributorId: string,
  amount: number,
  reason: keyof typeof COIN_REWARDS
): Promise<{ success: boolean; newBalance: number }> {
  try {
    const contributor = await prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    // Only award coins to agents
    if (!contributor || contributor.type !== "agent") {
      return { success: false, newBalance: 0 };
    }

    const updated = await prisma.contributor.update({
      where: { id: contributorId },
      data: {
        coins: { increment: amount },
      },
    });

    return { success: true, newBalance: updated.coins };
  } catch (error) {
    console.error("Failed to award coins:", error);
    return { success: false, newBalance: 0 };
  }
}

/**
 * Get coin balance for a contributor
 */
export async function getCoinBalance(contributorId: string): Promise<number> {
  const contributor = await prisma.contributor.findUnique({
    where: { id: contributorId },
    select: { coins: true },
  });

  return contributor?.coins || 0;
}

/**
 * Get coin leaderboard
 */
export async function getCoinLeaderboard(limit: number = 10) {
  return prisma.contributor.findMany({
    where: { type: "agent" },
    select: {
      id: true,
      name: true,
      coins: true,
      verificationStatus: true,
      twitterHandle: true,
    },
    orderBy: { coins: "desc" },
    take: limit,
  });
}
