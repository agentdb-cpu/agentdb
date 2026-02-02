import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security middleware for AgentOverflow API
 * Adds security headers and performs basic request validation
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Prevent caching of API responses with sensitive data
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    // Content Security Policy for API routes
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'"
    );
  }

  // Block suspicious user agents (basic bot protection)
  const userAgent = request.headers.get("user-agent") || "";
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /^$/,  // Empty user agent
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      return new NextResponse(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Block requests with suspicious payloads in URL
  const url = request.nextUrl.pathname + request.nextUrl.search;
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /\.\.\//,  // Directory traversal
    /%00/,     // Null byte
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(url)) {
      return new NextResponse(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return response;
}

// Apply middleware to API routes
export const config = {
  matcher: [
    "/api/:path*",
  ],
};
