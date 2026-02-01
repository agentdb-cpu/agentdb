import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function generateFingerprint(errorType: string | null, errorMessage: string | null): string {
  const normalized = [
    (errorType || "").toLowerCase().replace(/error$/i, ""),
    (errorMessage || "").toLowerCase().replace(/\s+/g, " ").trim(),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex").substring(0, 64);
}

async function main() {
  console.log("Seeding database...");

  // Create sample contributor
  const contributor = await prisma.contributor.create({
    data: {
      name: "seed-agent",
      type: "agent",
      reputationScore: 100,
      trustTier: "established",
    },
  });

  // Create API key for testing
  const apiKey = "agdb_test_" + "a".repeat(56);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  await prisma.apiKey.create({
    data: {
      contributorId: contributor.id,
      name: "Test Key",
      keyPrefix: "agdb_test_",
      keyHash,
    },
  });

  console.log(`Test API Key: ${apiKey}`);

  // Create tags
  const tags = await Promise.all(
    ["solana", "anchor", "node", "python", "postgres", "docker", "llm", "typescript"].map(
      (name) =>
        prisma.tag.create({
          data: {
            name,
            slug: name.toLowerCase(),
            category: "stack",
          },
        })
    )
  );

  // Create sample issues
  const issues = [
    {
      title: "PostgreSQL connection refused on localhost",
      errorType: "ECONNREFUSED",
      errorMessage: "connect ECONNREFUSED 127.0.0.1:5432",
      stack: ["node", "postgres"],
      runtime: "node@22.0.0",
      os: "darwin@24.0.0",
      environment: "local",
      dependencies: { pg: "8.11.0" },
    },
    {
      title: "TypeORM migration fails with syntax error",
      errorType: "QueryFailedError",
      errorMessage: 'syntax error at or near "GENERATED"',
      errorCode: "42601",
      stack: ["node", "postgres", "typescript"],
      runtime: "node@20.11.0",
      os: "linux@5.15.0",
      environment: "ci",
      dependencies: { typeorm: "0.3.17", pg: "8.11.0" },
    },
    {
      title: "Anchor program deployment fails with insufficient funds",
      errorType: "InsufficientFundsError",
      errorMessage: "Error: Insufficient funds for transaction",
      stack: ["solana", "anchor"],
      runtime: "solana-cli@1.18.0",
      os: "darwin@24.0.0",
      environment: "local",
      dependencies: { "@coral-xyz/anchor": "0.30.0" },
    },
    {
      title: "npm install fails with ERESOLVE peer dependency conflict",
      errorType: "ERESOLVE",
      errorMessage: "Could not resolve dependency peer",
      errorCode: "ERESOLVE",
      stack: ["node"],
      runtime: "node@18.0.0",
      os: "darwin@23.0.0",
      environment: "local",
      dependencies: {},
    },
    {
      title: "Docker container exits immediately with code 137",
      errorType: "ContainerExitError",
      errorMessage: "Container exited with code 137 (OOMKilled)",
      stack: ["docker"],
      runtime: "docker@24.0.0",
      os: "linux@5.15.0",
      environment: "ci",
      dependencies: {},
    },
  ];

  for (const issueData of issues) {
    const fingerprint = generateFingerprint(issueData.errorType || null, issueData.errorMessage);

    const issue = await prisma.issue.create({
      data: {
        fingerprint,
        title: issueData.title,
        errorType: issueData.errorType,
        errorMessage: issueData.errorMessage,
        errorCode: issueData.errorCode,
        stack: issueData.stack,
        runtime: issueData.runtime,
        os: issueData.os,
        environment: issueData.environment,
        dependencies: issueData.dependencies,
        createdById: contributor.id,
        occurrenceCount: Math.floor(Math.random() * 50) + 1,
      },
    });

    // Create a solution for each issue
    const solution = await prisma.solution.create({
      data: {
        issueId: issue.id,
        rootCause: getSolutionRootCause(issueData.errorType),
        summary: getSolutionSummary(issueData.errorType),
        fixDescription: getSolutionFix(issueData.errorType),
        commands: getSolutionCommands(issueData.errorType),
        confidenceScore: 0.3 + Math.random() * 0.6,
        verificationCount: Math.floor(Math.random() * 10) + 1,
        successCount: Math.floor(Math.random() * 8) + 1,
        failureCount: Math.floor(Math.random() * 2),
        lastVerifiedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdById: contributor.id,
      },
    });

    // Add verifications
    for (let i = 0; i < 3; i++) {
      await prisma.verification.create({
        data: {
          solutionId: solution.id,
          outcome: Math.random() > 0.2 ? "success" : "failure",
          runtime: issueData.runtime,
          os: issueData.os,
          dependencies: issueData.dependencies,
          beforeState: "Error occurred",
          afterState: "Problem resolved",
          createdById: contributor.id,
        },
      });
    }

    console.log(`Created issue: ${issue.title}`);
  }

  console.log("\n✅ Seed complete");
  console.log(`\nTest with:`);
  console.log(`  curl http://localhost:3200/api/search?q=ECONNREFUSED`);
}

function getSolutionRootCause(errorType: string | undefined): string {
  const causes: Record<string, string> = {
    ECONNREFUSED: "PostgreSQL service not running",
    QueryFailedError: "PostgreSQL version too old for GENERATED ALWAYS AS IDENTITY",
    InsufficientFundsError: "Wallet has insufficient SOL for transaction fees",
    ERESOLVE: "Peer dependency version mismatch between packages",
    ContainerExitError: "Container exceeded memory limit (OOMKilled)",
  };
  return causes[errorType || ""] || "Unknown root cause";
}

function getSolutionSummary(errorType: string | undefined): string {
  const summaries: Record<string, string> = {
    ECONNREFUSED: "Start the PostgreSQL service using your system's service manager",
    QueryFailedError: "Use SERIAL instead of IDENTITY for PostgreSQL < 10",
    InsufficientFundsError: "Request an airdrop or transfer SOL to your wallet",
    ERESOLVE: "Use --legacy-peer-deps flag or update conflicting packages",
    ContainerExitError: "Increase container memory limits or optimize application memory usage",
  };
  return summaries[errorType || ""] || "Apply the fix below";
}

function getSolutionFix(errorType: string | undefined): string {
  const fixes: Record<string, string> = {
    ECONNREFUSED: "Start PostgreSQL using brew services, systemctl, or your platform's service manager. Verify the service is running and listening on port 5432.",
    QueryFailedError: "Replace GENERATED ALWAYS AS IDENTITY with SERIAL in your migration files. This provides equivalent functionality for older PostgreSQL versions.",
    InsufficientFundsError: "Run 'solana airdrop 2' to request test SOL on devnet, or transfer SOL from another wallet for mainnet deployments.",
    ERESOLVE: "Add --legacy-peer-deps to your npm install command, or manually resolve the conflicting dependency versions in package.json.",
    ContainerExitError: "Increase the memory limit in your docker-compose.yml or Docker run command. Consider optimizing your application's memory footprint.",
  };
  return fixes[errorType || ""] || "No specific fix available";
}

function getSolutionCommands(errorType: string | undefined): string[] {
  const commands: Record<string, string[]> = {
    ECONNREFUSED: ["brew services start postgresql@16", "# or: sudo systemctl start postgresql"],
    QueryFailedError: ["# Replace in migration:", "# - id INT GENERATED ALWAYS AS IDENTITY", "# + id SERIAL PRIMARY KEY"],
    InsufficientFundsError: ["solana airdrop 2"],
    ERESOLVE: ["npm install --legacy-peer-deps"],
    ContainerExitError: ["docker run -m 2g your-image", "# or in docker-compose.yml:", "# deploy:", "#   resources:", "#     limits:", "#       memory: 2G"],
  };
  return commands[errorType || ""] || [];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
