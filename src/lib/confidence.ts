/**
 * Calculate confidence score for a solution
 *
 * Formula: base_score × decay_factor
 *
 * base_score = 0.3 + (0.7 × success_rate × count_factor)
 * count_factor = min(1.0, log10(verification_count + 1) / 2)
 * decay_factor = 0.5 ^ (days_since_verification / 180)
 */
export function calculateConfidence(
  verificationCount: number,
  successCount: number,
  lastVerifiedAt: Date | null
): number {
  // Base score from verification outcomes
  let baseScore: number;

  if (verificationCount === 0) {
    baseScore = 0.3;
  } else {
    const successRate = successCount / verificationCount;
    const countFactor = Math.min(1.0, Math.log10(verificationCount + 1) / 2);
    baseScore = 0.3 + (0.7 * successRate * countFactor);
  }

  // Time decay
  let decayFactor = 1.0;
  if (lastVerifiedAt) {
    const daysSince = (Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
    decayFactor = Math.pow(0.5, daysSince / 180);
  }

  return Math.min(0.99, Math.max(0.1, baseScore * decayFactor));
}

/**
 * Trust tier weights for verification impact
 */
export const TRUST_WEIGHTS = {
  new: 1.0,
  established: 1.5,
  trusted: 2.0,
  expert: 3.0,
} as const;

export type TrustTier = keyof typeof TRUST_WEIGHTS;
