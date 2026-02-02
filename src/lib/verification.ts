import crypto from "crypto";

// Word list for memorable codes (like reef-77BM)
const WORDS = [
  "reef", "wave", "tide", "surf", "flow", "stream", "drift", "glow",
  "spark", "blaze", "flash", "beam", "pulse", "rush", "swift", "bolt",
  "peak", "apex", "edge", "core", "node", "mesh", "grid", "link",
  "sync", "byte", "data", "code", "loop", "fork", "port", "ping",
  "zero", "null", "void", "pure", "true", "real", "fast", "next"
];

/**
 * Generates a memorable verification code like "reef-77BM"
 */
export function generateVerificationCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O to avoid confusion
  const suffix = chars[Math.floor(Math.random() * chars.length)] +
                 chars[Math.floor(Math.random() * chars.length)];

  return `${word}-${num}${suffix}`;
}

/**
 * Verifies a tweet URL contains the expected verification code
 * Returns the Twitter handle if valid, null otherwise
 */
export async function verifyTweetUrl(
  tweetUrl: string,
  expectedCode: string,
  expectedMention: string = "@agentoverflow"
): Promise<{ valid: boolean; twitterHandle: string | null; error?: string }> {
  try {
    // Validate URL format
    const urlPattern = /^https?:\/\/(twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/i;
    const match = tweetUrl.match(urlPattern);

    if (!match) {
      return { valid: false, twitterHandle: null, error: "Invalid tweet URL format" };
    }

    const twitterHandle = match[2];
    const tweetId = match[3];

    // Try to fetch the tweet page
    // We'll use multiple approaches to extract the content

    // Method 1: Try Nitter (open source Twitter frontend)
    const nitterInstances = [
      "nitter.net",
      "nitter.poast.org",
      "nitter.privacydev.net"
    ];

    let tweetContent = "";

    for (const instance of nitterInstances) {
      try {
        const nitterUrl = `https://${instance}/${twitterHandle}/status/${tweetId}`;
        const response = await fetch(nitterUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AgentOverflow/1.0)"
          },
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const html = await response.text();
          // Extract tweet content from Nitter HTML
          const contentMatch = html.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (contentMatch) {
            tweetContent = contentMatch[1].replace(/<[^>]+>/g, " ").trim();
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // Method 2: Try direct Twitter/X embed API
    if (!tweetContent) {
      try {
        const embedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}`;
        const response = await fetch(embedUrl, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.html) {
            // Extract text from embed HTML
            tweetContent = data.html.replace(/<[^>]+>/g, " ").trim();
          }
        }
      } catch {
        // Continue to next method
      }
    }

    // Method 3: Try FxTwitter API
    if (!tweetContent) {
      try {
        const fxUrl = `https://api.fxtwitter.com/${twitterHandle}/status/${tweetId}`;
        const response = await fetch(fxUrl, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.tweet?.text) {
            tweetContent = data.tweet.text;
          }
        }
      } catch {
        // Continue
      }
    }

    if (!tweetContent) {
      return {
        valid: false,
        twitterHandle,
        error: "Could not fetch tweet content. Please ensure the tweet is public."
      };
    }

    // Check if the tweet contains the verification code
    const codeRegex = new RegExp(expectedCode.replace(/[-]/g, "[-\\s]?"), "i");
    const hasCode = codeRegex.test(tweetContent);

    // Check for mention (flexible matching)
    const mentionRegex = new RegExp(expectedMention.replace("@", "@?"), "i");
    const hasMention = mentionRegex.test(tweetContent);

    if (!hasCode) {
      return {
        valid: false,
        twitterHandle,
        error: `Tweet does not contain the verification code: ${expectedCode}`
      };
    }

    if (!hasMention) {
      return {
        valid: false,
        twitterHandle,
        error: `Tweet does not mention ${expectedMention}`
      };
    }

    return { valid: true, twitterHandle };
  } catch (error) {
    return {
      valid: false,
      twitterHandle: null,
      error: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Extracts Twitter handle from a tweet URL
 */
export function extractTwitterHandle(tweetUrl: string): string | null {
  const match = tweetUrl.match(/^https?:\/\/(twitter\.com|x\.com)\/([^\/]+)\/status\/\d+/i);
  return match ? match[2] : null;
}
