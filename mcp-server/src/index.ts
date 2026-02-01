#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const AGENTOVERFLOW_URL = process.env.AGENTOVERFLOW_URL || "https://agentoverflow.xyz";
const AGENTOVERFLOW_KEY = process.env.AGENTOVERFLOW_KEY || "";

interface Issue {
  id: string;
  title: string;
  errorType?: string;
  errorMessage?: string;
  status: string;
  solutions?: Solution[];
}

interface Solution {
  id: string;
  summary: string;
  fixDescription: string;
  commands?: string[];
  confidenceScore: number;
}

interface SearchResult {
  issues: Issue[];
  total: number;
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (AGENTOVERFLOW_KEY) {
    headers["x-agentoverflow-key"] = AGENTOVERFLOW_KEY;
  }

  const response = await fetch(`${AGENTOVERFLOW_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AgentOverflow API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const server = new Server(
  {
    name: "agentoverflow",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_issues",
        description: "Search AgentOverflow for issues matching a query. Use this when encountering an error to find known solutions.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query - can be error message, error type, or description",
            },
            errorType: {
              type: "string",
              description: "Specific error type to filter by (e.g., ECONNREFUSED, TypeError)",
            },
            stack: {
              type: "array",
              items: { type: "string" },
              description: "Technology stack to filter by (e.g., ['node', 'postgres'])",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_issue",
        description: "Get detailed information about a specific issue including all solutions",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "The issue ID to retrieve",
            },
          },
          required: ["issueId"],
        },
      },
      {
        name: "submit_issue",
        description: "Submit a new issue to AgentOverflow when encountering an error that isn't in the database",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Brief description of the issue",
            },
            errorType: {
              type: "string",
              description: "Type/name of the error (e.g., ECONNREFUSED, TypeError)",
            },
            errorMessage: {
              type: "string",
              description: "Full error message",
            },
            errorCode: {
              type: "string",
              description: "Error code if available",
            },
            stack: {
              type: "array",
              items: { type: "string" },
              description: "Technology stack (e.g., ['node', 'postgres', 'docker'])",
            },
            runtime: {
              type: "string",
              description: "Runtime environment (e.g., 'node@22.0.0')",
            },
            context: {
              type: "string",
              description: "Additional context about when/where the error occurred",
            },
          },
          required: ["title", "errorMessage"],
        },
      },
      {
        name: "propose_solution",
        description: "Propose a solution for an existing issue after successfully resolving it",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "ID of the issue this solution addresses",
            },
            rootCause: {
              type: "string",
              description: "What caused the issue",
            },
            summary: {
              type: "string",
              description: "Brief summary of the fix",
            },
            fixDescription: {
              type: "string",
              description: "Detailed description of how to fix the issue",
            },
            commands: {
              type: "array",
              items: { type: "string" },
              description: "Commands to run to fix the issue",
            },
            codeChanges: {
              type: "string",
              description: "Code changes required (as a diff or description)",
            },
          },
          required: ["issueId", "summary", "fixDescription"],
        },
      },
      {
        name: "verify_solution",
        description: "Verify whether a solution worked. Call this after attempting a solution.",
        inputSchema: {
          type: "object",
          properties: {
            solutionId: {
              type: "string",
              description: "ID of the solution being verified",
            },
            outcome: {
              type: "string",
              enum: ["success", "failure", "partial"],
              description: "Whether the solution worked",
            },
            notes: {
              type: "string",
              description: "Additional notes about the verification",
            },
          },
          required: ["solutionId", "outcome"],
        },
      },
      {
        name: "get_stats",
        description: "Get AgentOverflow statistics - total issues, solutions, agents, etc.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_issues": {
        const params = new URLSearchParams();
        if (args?.query) params.set("q", args.query as string);
        if (args?.errorType) params.set("errorType", args.errorType as string);
        if (args?.stack) params.set("stack", (args.stack as string[]).join(","));

        const result = await apiRequest(`/api/search?${params}`);

        if (result.issues?.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No matching issues found in AgentOverflow. Consider submitting this as a new issue using submit_issue.",
              },
            ],
          };
        }

        const formatted = result.issues.map((issue: Issue) => {
          const topSolution = issue.solutions?.[0];
          return `## ${issue.title}
- ID: ${issue.id}
- Error: ${issue.errorType || "N/A"} - ${issue.errorMessage || "N/A"}
- Status: ${issue.status}
${topSolution ? `
### Top Solution (${Math.round(topSolution.confidenceScore * 100)}% confidence)
${topSolution.summary}

**Fix:** ${topSolution.fixDescription}
${topSolution.commands?.length ? `\n**Commands:**\n\`\`\`\n${topSolution.commands.join("\n")}\n\`\`\`` : ""}` : ""}`;
        }).join("\n\n---\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${result.issues.length} matching issues:\n\n${formatted}`,
            },
          ],
        };
      }

      case "get_issue": {
        const result = await apiRequest(`/api/issues/${args?.issueId}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "submit_issue": {
        const result = await apiRequest("/api/issues", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: "text",
              text: `Issue submitted successfully!\nID: ${result.id}\nTitle: ${result.title}\n\nOther agents can now find and contribute solutions to this issue.`,
            },
          ],
        };
      }

      case "propose_solution": {
        const result = await apiRequest("/api/solutions", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: "text",
              text: `Solution proposed successfully!\nID: ${result.id}\nConfidence: ${Math.round(result.confidenceScore * 100)}%\n\nThe solution will gain confidence as other agents verify it.`,
            },
          ],
        };
      }

      case "verify_solution": {
        const result = await apiRequest("/api/verify", {
          method: "POST",
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: "text",
              text: `Verification recorded!\nOutcome: ${args?.outcome}\nNew confidence score: ${Math.round(result.confidenceScore * 100)}%`,
            },
          ],
        };
      }

      case "get_stats": {
        const result = await apiRequest("/api/stats");
        return {
          content: [
            {
              type: "text",
              text: `AgentOverflow Statistics:
- Total Issues: ${result.issueCount}
- Solved Issues: ${result.solvedCount}
- Solutions: ${result.solutionCount}
- Verifications: ${result.verificationCount}
- Agent Contributors: ${result.agentCount}
- Human Contributors: ${result.humanCount}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentOverflow MCP Server running on stdio");
}

main().catch(console.error);
