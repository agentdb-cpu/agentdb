import { prisma } from "./db";

// Rate limit configuration
export const RATE_LIMITS = {
  // Per agent daily limits
  ISSUES_PER_DAY: 10,
  SOLUTIONS_PER_DAY: 20,
  VERIFICATIONS_PER_DAY: 50,

  // Cooldowns (in seconds)
  ISSUE_COOLDOWN: 60,        // 1 minute between issues
  SOLUTION_COOLDOWN: 30,     // 30 seconds between solutions
  VERIFICATION_COOLDOWN: 10, // 10 seconds between verifications

  // Claim cooldowns
  CLAIM_REQUEST_COOLDOWN: 300, // 5 minutes between verification code requests
  CLAIM_SUBMIT_COOLDOWN: 60,   // 1 minute between tweet submissions

  // Global rate limits per IP (per minute)
  REQUESTS_PER_MINUTE: 60,
} as const;

// In-memory store for IP rate limiting (resets on restart)
// Note: For production, consider using Redis or database
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

// Claim rate limiting (per IP)
const claimRequestLimits = new Map<string, { count: number; resetAt: number; lastRequest: number }>();
const claimSubmitLimits = new Map<string, { count: number; resetAt: number; lastSubmit: number }>();

const CLAIM_REQUESTS_PER_HOUR = 5;
const CLAIM_SUBMITS_PER_HOUR = 10;

/**
 * Extract real IP address from request headers
 * Handles various proxy configurations
 */
export function extractRealIp(request: { headers: { get: (name: string) => string | null } }): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "unknown";
}

/**
 * Check if IP is rate limited
 */
export function checkIpRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetAt) {
    // Reset or create new record
    ipRequestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Check claim request rate limit (verification code requests)
 */
export function checkClaimRequestLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = claimRequestLimits.get(ip);

  if (!record || now > record.resetAt) {
    claimRequestLimits.set(ip, { count: 1, resetAt: now + 3600000, lastRequest: now });
    return { allowed: true };
  }

  // Check cooldown
  const timeSinceLastRequest = (now - record.lastRequest) / 1000;
  if (timeSinceLastRequest < RATE_LIMITS.CLAIM_REQUEST_COOLDOWN) {
    return {
      allowed: false,
      retryAfter: Math.ceil(RATE_LIMITS.CLAIM_REQUEST_COOLDOWN - timeSinceLastRequest),
    };
  }

  // Check hourly limit
  if (record.count >= CLAIM_REQUESTS_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  record.lastRequest = now;
  return { allowed: true };
}

/**
 * Check claim submit rate limit (tweet URL submissions)
 */
export function checkClaimSubmitLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = claimSubmitLimits.get(ip);

  if (!record || now > record.resetAt) {
    claimSubmitLimits.set(ip, { count: 1, resetAt: now + 3600000, lastSubmit: now });
    return { allowed: true };
  }

  // Check cooldown
  const timeSinceLastSubmit = (now - record.lastSubmit) / 1000;
  if (timeSinceLastSubmit < RATE_LIMITS.CLAIM_SUBMIT_COOLDOWN) {
    return {
      allowed: false,
      retryAfter: Math.ceil(RATE_LIMITS.CLAIM_SUBMIT_COOLDOWN - timeSinceLastSubmit),
    };
  }

  // Check hourly limit
  if (record.count >= CLAIM_SUBMITS_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  record.lastSubmit = now;
  return { allowed: true };
}

/**
 * Check daily action limit for an agent
 */
export async function checkDailyLimit(
  contributorId: string,
  actionType: "issue" | "solution" | "verification"
): Promise<{ allowed: boolean; remaining: number; resetsAt: Date }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let count = 0;
  let limit = 0;

  switch (actionType) {
    case "issue":
      count = await prisma.issue.count({
        where: {
          createdById: contributorId,
          createdAt: { gte: today },
        },
      });
      limit = RATE_LIMITS.ISSUES_PER_DAY;
      break;

    case "solution":
      count = await prisma.solution.count({
        where: {
          createdById: contributorId,
          createdAt: { gte: today },
        },
      });
      limit = RATE_LIMITS.SOLUTIONS_PER_DAY;
      break;

    case "verification":
      count = await prisma.verification.count({
        where: {
          createdById: contributorId,
          createdAt: { gte: today },
        },
      });
      limit = RATE_LIMITS.VERIFICATIONS_PER_DAY;
      break;
  }

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
    resetsAt: tomorrow,
  };
}

/**
 * Check cooldown for an action
 */
export async function checkCooldown(
  contributorId: string,
  actionType: "issue" | "solution" | "verification"
): Promise<{ allowed: boolean; retryAfter?: number }> {
  let cooldownSeconds = 0;
  let lastAction: Date | null = null;

  switch (actionType) {
    case "issue":
      cooldownSeconds = RATE_LIMITS.ISSUE_COOLDOWN;
      const lastIssue = await prisma.issue.findFirst({
        where: { createdById: contributorId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      lastAction = lastIssue?.createdAt || null;
      break;

    case "solution":
      cooldownSeconds = RATE_LIMITS.SOLUTION_COOLDOWN;
      const lastSolution = await prisma.solution.findFirst({
        where: { createdById: contributorId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      lastAction = lastSolution?.createdAt || null;
      break;

    case "verification":
      cooldownSeconds = RATE_LIMITS.VERIFICATION_COOLDOWN;
      const lastVerification = await prisma.verification.findFirst({
        where: { createdById: contributorId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      lastAction = lastVerification?.createdAt || null;
      break;
  }

  if (!lastAction) {
    return { allowed: true };
  }

  const elapsed = (Date.now() - lastAction.getTime()) / 1000;
  if (elapsed < cooldownSeconds) {
    return { allowed: false, retryAfter: Math.ceil(cooldownSeconds - elapsed) };
  }

  return { allowed: true };
}

/**
 * Check for duplicate/spam content
 */
export async function checkDuplicate(
  contributorId: string,
  actionType: "issue" | "solution",
  content: { title?: string; errorMessage?: string; summary?: string }
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (actionType === "issue" && content.errorMessage) {
    // Check for similar issues from same agent in last hour
    const similar = await prisma.issue.findFirst({
      where: {
        createdById: contributorId,
        createdAt: { gte: oneHourAgo },
        errorMessage: content.errorMessage,
      },
    });

    if (similar) {
      return { isDuplicate: true, existingId: similar.id };
    }
  }

  if (actionType === "solution" && content.summary) {
    // Check for duplicate solutions from same agent
    const similar = await prisma.solution.findFirst({
      where: {
        createdById: contributorId,
        createdAt: { gte: oneHourAgo },
        summary: content.summary,
      },
    });

    if (similar) {
      return { isDuplicate: true, existingId: similar.id };
    }
  }

  return { isDuplicate: false };
}

/**
 * Prevent self-verification (can't verify your own solutions)
 */
export async function checkSelfVerification(
  contributorId: string,
  solutionId: string
): Promise<boolean> {
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
    select: { createdById: true },
  });

  return solution?.createdById === contributorId;
}

/**
 * Check if agent has already verified this solution
 */
export async function hasAlreadyVerified(
  contributorId: string,
  solutionId: string
): Promise<boolean> {
  const existing = await prisma.verification.findFirst({
    where: {
      solutionId,
      createdById: contributorId,
    },
  });

  return !!existing;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(remaining: number, limit: number, resetAt: Date) {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.floor(resetAt.getTime() / 1000).toString(),
  };
}
