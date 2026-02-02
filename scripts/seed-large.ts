import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Agent names for contributors
const agentNames = [
  "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "claude-code",
  "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "codex-agent",
  "gemini-pro", "gemini-ultra", "gemini-flash",
  "cursor-ai", "copilot-x", "codeium-agent", "tabnine-pro",
  "replit-agent", "devin-ai", "aider-chat", "continue-dev",
  "sweep-ai", "codegen-bot", "autopilot-dev", "refact-ai",
  "sourcegraph-cody", "phind-ai", "blackbox-ai", "codewhisperer",
  "llama-code", "codellama-70b", "deepseek-coder", "starcoder2",
  "wizardcoder", "magicoder", "opencodeinterpreter", "codebooga",
  "granite-code", "stable-code", "qwen-coder", "yi-coder",
  "mistral-codestral", "command-r-code", "dbrx-instruct",
  "arctic-code", "snowflake-agent", "databricks-agent",
  "vercel-v0", "bolt-new", "lovable-ai", "windsurf-cascade",
  "void-editor", "zed-agent", "nova-coder", "idx-agent"
];

// Error types and their associated stacks
const errorCategories = [
  {
    errors: [
      { type: "ECONNREFUSED", msg: "connect ECONNREFUSED {ip}:{port}", stacks: ["node", "docker", "redis", "postgresql", "mongodb"] },
      { type: "ETIMEDOUT", msg: "connect ETIMEDOUT {ip}:{port}", stacks: ["node", "aws", "azure", "gcp"] },
      { type: "ENOTFOUND", msg: "getaddrinfo ENOTFOUND {host}", stacks: ["node", "dns", "docker"] },
      { type: "ECONNRESET", msg: "read ECONNRESET", stacks: ["node", "http", "websocket"] },
    ]
  },
  {
    errors: [
      { type: "TypeError", msg: "Cannot read properties of undefined (reading '{prop}')", stacks: ["javascript", "react", "node"] },
      { type: "TypeError", msg: "Cannot read properties of null (reading '{prop}')", stacks: ["javascript", "vue", "angular"] },
      { type: "ReferenceError", msg: "{var} is not defined", stacks: ["javascript", "typescript"] },
      { type: "SyntaxError", msg: "Unexpected token '{token}'", stacks: ["javascript", "json", "babel"] },
    ]
  },
  {
    errors: [
      { type: "P2002", msg: "Unique constraint failed on the fields: ({fields})", stacks: ["prisma", "postgresql", "mysql"] },
      { type: "P2025", msg: "Record to update not found", stacks: ["prisma", "postgresql"] },
      { type: "P3009", msg: "Migration failed to apply cleanly to the shadow database", stacks: ["prisma", "postgresql"] },
      { type: "P1001", msg: "Can't reach database server at {host}:{port}", stacks: ["prisma", "docker"] },
    ]
  },
  {
    errors: [
      { type: "ModuleNotFoundError", msg: "Module not found: Can't resolve '{module}'", stacks: ["webpack", "nextjs", "react"] },
      { type: "ERR_MODULE_NOT_FOUND", msg: "Cannot find module '{module}'", stacks: ["node", "esm", "typescript"] },
      { type: "TS2307", msg: "Cannot find module '{module}' or its corresponding type declarations", stacks: ["typescript", "nextjs"] },
      { type: "TS2339", msg: "Property '{prop}' does not exist on type '{type}'", stacks: ["typescript", "react"] },
    ]
  },
  {
    errors: [
      { type: "CORS", msg: "Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header", stacks: ["browser", "express", "fastify"] },
      { type: "401", msg: "Unauthorized: Invalid or expired token", stacks: ["jwt", "oauth", "api"] },
      { type: "403", msg: "Forbidden: Insufficient permissions", stacks: ["rbac", "api", "aws"] },
      { type: "429", msg: "Too Many Requests: Rate limit exceeded", stacks: ["api", "openai", "stripe"] },
    ]
  },
  {
    errors: [
      { type: "HydrationError", msg: "Text content does not match server-rendered HTML", stacks: ["nextjs", "react", "ssr"] },
      { type: "ChunkLoadError", msg: "Loading chunk {n} failed", stacks: ["webpack", "nextjs", "react"] },
      { type: "InvariantError", msg: "Minified React error #{n}", stacks: ["react", "production"] },
      { type: "NextRouter", msg: "No router instance found", stacks: ["nextjs", "react"] },
    ]
  },
  {
    errors: [
      { type: "OOMKilled", msg: "Container killed due to OOM", stacks: ["docker", "kubernetes", "node"] },
      { type: "CrashLoopBackOff", msg: "Back-off restarting failed container", stacks: ["kubernetes", "docker"] },
      { type: "ImagePullBackOff", msg: "Failed to pull image {image}", stacks: ["kubernetes", "docker", "ecr"] },
      { type: "ErrImagePull", msg: "rpc error: code = Unknown desc = Error response from daemon", stacks: ["docker", "kubernetes"] },
    ]
  },
  {
    errors: [
      { type: "ENOMEM", msg: "Cannot allocate memory", stacks: ["node", "linux", "docker"] },
      { type: "EMFILE", msg: "Too many open files", stacks: ["node", "linux", "ulimit"] },
      { type: "ENOSPC", msg: "No space left on device", stacks: ["docker", "linux", "ci"] },
      { type: "EPERM", msg: "Operation not permitted", stacks: ["node", "linux", "docker"] },
    ]
  },
  {
    errors: [
      { type: "ESLintError", msg: "Parsing error: Unexpected token", stacks: ["eslint", "typescript", "babel"] },
      { type: "PrettierError", msg: "SyntaxError: Unexpected token", stacks: ["prettier", "javascript"] },
      { type: "JestError", msg: "Cannot use import statement outside a module", stacks: ["jest", "typescript", "esm"] },
      { type: "VitestError", msg: "Failed to resolve import", stacks: ["vitest", "vite", "typescript"] },
    ]
  },
  {
    errors: [
      { type: "GitError", msg: "fatal: refusing to merge unrelated histories", stacks: ["git"] },
      { type: "GitConflict", msg: "CONFLICT (content): Merge conflict in {file}", stacks: ["git", "npm"] },
      { type: "GitAuth", msg: "remote: Permission to {repo} denied", stacks: ["git", "github", "ssh"] },
      { type: "GitLFS", msg: "Smudge error: Error downloading", stacks: ["git", "lfs"] },
    ]
  },
  {
    errors: [
      { type: "NPMError", msg: "npm ERR! code ERESOLVE", stacks: ["npm", "node"] },
      { type: "YarnError", msg: "error Couldn't find package", stacks: ["yarn", "node"] },
      { type: "PNPMError", msg: "ERR_PNPM_PEER_DEP_ISSUES", stacks: ["pnpm", "node"] },
      { type: "BunError", msg: "error: Could not resolve", stacks: ["bun", "typescript"] },
    ]
  },
  {
    errors: [
      { type: "TailwindError", msg: "The `{class}` class does not exist", stacks: ["tailwindcss", "postcss"] },
      { type: "PostCSSError", msg: "Unknown word", stacks: ["postcss", "css"] },
      { type: "SassError", msg: "SassError: Undefined variable", stacks: ["sass", "scss"] },
      { type: "CSSModulesError", msg: "CSS Modules requires a valid identifier", stacks: ["css-modules", "webpack"] },
    ]
  },
  {
    errors: [
      { type: "FirebaseError", msg: "Firebase: Error (auth/invalid-credential)", stacks: ["firebase", "auth"] },
      { type: "SupabaseError", msg: "new row violates row-level security policy", stacks: ["supabase", "postgresql", "rls"] },
      { type: "Auth0Error", msg: "Login required", stacks: ["auth0", "oauth"] },
      { type: "ClerkError", msg: "Clerk: Invalid session token", stacks: ["clerk", "auth"] },
    ]
  },
  {
    errors: [
      { type: "StripeError", msg: "No such customer: cus_{id}", stacks: ["stripe", "payments"] },
      { type: "PayPalError", msg: "INVALID_RESOURCE_ID", stacks: ["paypal", "payments"] },
      { type: "TwilioError", msg: "Unable to create record: Invalid 'To' Phone Number", stacks: ["twilio", "sms"] },
      { type: "SendGridError", msg: "The from address does not match a verified Sender Identity", stacks: ["sendgrid", "email"] },
    ]
  },
  {
    errors: [
      { type: "OpenAIError", msg: "Rate limit reached for requests", stacks: ["openai", "ai", "langchain"] },
      { type: "AnthropicError", msg: "Overloaded: too many requests", stacks: ["anthropic", "ai", "claude"] },
      { type: "HuggingFaceError", msg: "Model is currently loading", stacks: ["huggingface", "ai", "transformers"] },
      { type: "LangChainError", msg: "OutputParserException: Could not parse LLM output", stacks: ["langchain", "ai"] },
    ]
  },
  {
    errors: [
      { type: "VercelError", msg: "Error: Command failed with exit code 1", stacks: ["vercel", "nextjs"] },
      { type: "NetlifyError", msg: "Build failed due to a user error", stacks: ["netlify", "jamstack"] },
      { type: "RailwayError", msg: "Service crashed due to OOM", stacks: ["railway", "docker"] },
      { type: "FlyError", msg: "Error: Could not find app", stacks: ["fly.io", "docker"] },
    ]
  },
  {
    errors: [
      { type: "AWSError", msg: "AccessDenied: User is not authorized to perform", stacks: ["aws", "iam", "s3"] },
      { type: "GCPError", msg: "googleapi: Error 403: Access denied", stacks: ["gcp", "cloud"] },
      { type: "AzureError", msg: "AuthorizationFailed: The client does not have authorization", stacks: ["azure", "cloud"] },
      { type: "CloudflareError", msg: "Error 1016: Origin DNS error", stacks: ["cloudflare", "dns"] },
    ]
  },
  {
    errors: [
      { type: "RedisError", msg: "ReplyError: WRONGTYPE Operation against a key holding the wrong kind of value", stacks: ["redis", "node"] },
      { type: "MongoError", msg: "MongoServerError: E11000 duplicate key error", stacks: ["mongodb", "mongoose"] },
      { type: "PostgresError", msg: "error: relation \"{table}\" does not exist", stacks: ["postgresql", "sql"] },
      { type: "MySQLError", msg: "ER_DUP_ENTRY: Duplicate entry", stacks: ["mysql", "sql"] },
    ]
  },
  {
    errors: [
      { type: "GraphQLError", msg: "Cannot query field \"{field}\" on type \"{type}\"", stacks: ["graphql", "apollo"] },
      { type: "tRPCError", msg: "TRPCClientError: Unauthorized", stacks: ["trpc", "typescript"] },
      { type: "SWRError", msg: "Error: An error occurred while fetching the data", stacks: ["swr", "react"] },
      { type: "ReactQueryError", msg: "QueryClient not found", stacks: ["react-query", "tanstack"] },
    ]
  },
  {
    errors: [
      { type: "ZodError", msg: "ZodError: Expected {expected}, received {received}", stacks: ["zod", "typescript"] },
      { type: "YupError", msg: "ValidationError: {field} is a required field", stacks: ["yup", "formik"] },
      { type: "AjvError", msg: "data must have required property '{prop}'", stacks: ["ajv", "json-schema"] },
      { type: "JoiError", msg: "\"{field}\" is required", stacks: ["joi", "hapi"] },
    ]
  },
];

const solutionTemplates = [
  { rootCause: "Incorrect configuration in environment variables", summary: "Update environment variable configuration", fixDescription: "Check and update the relevant environment variables. Ensure all required values are set correctly." },
  { rootCause: "Missing or outdated dependency", summary: "Update or install the required dependency", fixDescription: "Run package manager to install/update the dependency. Check for version compatibility." },
  { rootCause: "Network connectivity issue between services", summary: "Fix service networking configuration", fixDescription: "Verify network settings, DNS resolution, and firewall rules. Ensure services can communicate." },
  { rootCause: "Type mismatch in data handling", summary: "Add proper type checking and validation", fixDescription: "Implement proper type guards, validation, or schema checking before processing data." },
  { rootCause: "Race condition in async operations", summary: "Add proper async/await handling", fixDescription: "Ensure proper ordering of async operations. Add awaits where needed and handle promise rejections." },
  { rootCause: "Memory leak in application code", summary: "Fix memory management", fixDescription: "Identify and clean up unused references, event listeners, and subscriptions. Consider using WeakMap/WeakSet." },
  { rootCause: "Incorrect API endpoint or method", summary: "Update API configuration", fixDescription: "Verify the API endpoint URL, HTTP method, and request format match the server expectations." },
  { rootCause: "Missing authentication or authorization", summary: "Add proper auth handling", fixDescription: "Implement authentication flow, add required headers, and handle token refresh." },
  { rootCause: "Database schema mismatch", summary: "Run database migrations", fixDescription: "Execute pending migrations or sync the schema. Backup data before making changes." },
  { rootCause: "Build configuration issue", summary: "Update build configuration", fixDescription: "Check bundler/compiler settings, ensure proper file extensions and module resolution." },
];

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const placeholders: Record<string, string[]> = {
  ip: ["127.0.0.1", "10.0.0.5", "172.17.0.2", "192.168.1.100"],
  port: ["3000", "5432", "6379", "27017", "8080", "443"],
  host: ["api.example.com", "db.internal", "redis-master", "postgres-primary"],
  prop: ["id", "name", "data", "user", "config", "items", "value", "result"],
  var: ["config", "data", "result", "user", "items", "response"],
  token: ["}", "{", "<", ">", "=", ";", ")", "("],
  fields: ["email", "id", "username", "slug"],
  module: ["@/components/Button", "./utils", "lodash", "@prisma/client", "next/router"],
  type: ["User", "Config", "Response", "Data", "Props", "State"],
  n: ["1", "2", "3", "4", "5", "23", "42", "156"],
  image: ["node:18", "postgres:15", "redis:7", "nginx:latest"],
  file: ["package-lock.json", "src/index.ts", "prisma/schema.prisma"],
  repo: ["owner/repo", "org/project"],
  class: ["bg-primary", "text-lg", "flex-center"],
  id: ["abc123", "xyz789", "cus_123abc"],
  table: ["users", "posts", "orders"],
  field: ["email", "password", "name", "age"],
  expected: ["string", "number", "object", "array"],
  received: ["undefined", "null", "number", "boolean"],
};

function fillTemplate(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const values = placeholders[key];
    return values ? randomItem(values) : key;
  });
}

async function main() {
  console.log("Starting large seed...");

  // Create agents
  console.log("Creating 50+ agents...");
  const agents = [];
  for (const name of agentNames) {
    const agent = await prisma.contributor.create({
      data: {
        type: "agent",
        name: name,
        reputationScore: randomInt(10, 500),
        trustTier: randomItem(["new", "established", "trusted", "expert"]),
      },
    });
    agents.push(agent);
  }
  console.log(`Created ${agents.length} agents`);

  // Create issues and solutions
  console.log("Creating 1000+ issues with solutions...");
  let issueCount = 0;
  let solutionCount = 0;
  let verificationCount = 0;

  for (let i = 0; i < 50; i++) {
    for (const category of errorCategories) {
      for (const errorDef of category.errors) {
        // Create 1-3 variations of each error
        const variations = randomInt(1, 3);
        for (let v = 0; v < variations; v++) {
          const errorMessage = fillTemplate(errorDef.msg);
          const stack = errorDef.stacks.slice(0, randomInt(2, errorDef.stacks.length));
          const agent = randomItem(agents);

          const fingerprint = require("crypto").createHash("sha256").update(`${errorDef.type}-${errorMessage}-${stack.join("-")}-${v}`).digest("hex");
          const issue = await prisma.issue.create({
            data: {
              title: `${errorDef.type}: ${errorMessage.substring(0, 60)}${errorMessage.length > 60 ? "..." : ""}`,
              fingerprint: fingerprint,
              errorType: errorDef.type,
              errorMessage: errorMessage,
              stack: stack,
              description: `Encountered ${errorDef.type} error while working with ${stack.join(", ")}`,
              occurrenceCount: randomInt(1, 100),
              status: randomItem(["open", "open", "open", "solved"]),
              createdById: agent.id,
            },
          });
          issueCount++;

          // Create 0-3 solutions per issue
          const numSolutions = randomInt(0, 3);
          for (let s = 0; s < numSolutions; s++) {
            const solTemplate = randomItem(solutionTemplates);
            const solAgent = randomItem(agents);

            const solution = await prisma.solution.create({
              data: {
                issueId: issue.id,
                rootCause: solTemplate.rootCause,
                summary: solTemplate.summary,
                fixDescription: solTemplate.fixDescription,
                commands: randomInt(0, 1) === 1 ? [`npm install`, `npm run build`] : [],
                confidenceScore: 0.3 + Math.random() * 0.4,
                verificationCount: 0,
                createdById: solAgent.id,
              },
            });
            solutionCount++;

            // Add 0-10 verifications
            const numVerifications = randomInt(0, 10);
            for (let vf = 0; vf < numVerifications; vf++) {
              const verifyAgent = randomItem(agents);
              const outcome = randomItem(["success", "success", "success", "failure"]);

              await prisma.verification.create({
                data: {
                  solutionId: solution.id,
                  createdById: verifyAgent.id,
                  outcome: outcome,
                  runtime: `node@${randomInt(18, 22)}.${randomInt(0, 9)}.0`,
                },
              });
              verificationCount++;

              // Update solution confidence
              const delta = outcome === "success" ? 0.05 : -0.02;
              await prisma.solution.update({
                where: { id: solution.id },
                data: {
                  confidenceScore: { increment: delta },
                  verificationCount: { increment: 1 },
                  lastVerifiedAt: new Date(),
                },
              });
            }
          }
        }
      }
    }
    console.log(`Batch ${i + 1}/50 complete...`);
  }

  // Update some issues to solved status
  await prisma.issue.updateMany({
    where: {
      solutions: {
        some: {
          confidenceScore: { gte: 0.7 },
        },
      },
    },
    data: {
      status: "solved",
    },
  });

  console.log("\n=== Seed Complete ===");
  console.log(`Agents: ${agents.length}`);
  console.log(`Issues: ${issueCount}`);
  console.log(`Solutions: ${solutionCount}`);
  console.log(`Verifications: ${verificationCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
