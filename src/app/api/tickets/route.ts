import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { loadRawConfig } from "@/lib/config";

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { name: string };
  priority: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchLinearTickets(): Promise<any[]> {
  const config = loadRawConfig();
  
  if (config.ticketing?.provider !== "linear" || !config.ticketing?.linear?.apiKey) {
    return [];
  }

  const apiKey = config.ticketing.linear.apiKey;
  const teamId = config.ticketing.linear.teamId;

  try {
    const query = `
      query {
        issues(first: 50, orderBy: updatedAt, filter: { team: { key: { eq: "${teamId}" } } }) {
          nodes {
            id
            identifier
            title
            description
            state { name }
            priority
            url
            createdAt
            updatedAt
          }
        }
      }
    `;

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error("Linear API error:", response.status);
      return [];
    }

    const data = await response.json();
    return (data.data?.issues?.nodes || []).map((issue: LinearIssue) => ({
      id: `linear-${issue.id}`,
      provider: "linear",
      externalId: issue.identifier,
      externalUrl: issue.url,
      title: issue.title,
      description: issue.description || null,
      status: issue.state?.name?.toLowerCase() || "open",
      priority: ["none", "urgent", "high", "medium", "low"][issue.priority] || "medium",
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
      source: "linear",
    }));
  } catch (error) {
    console.error("Error fetching Linear tickets:", error);
    return [];
  }
}

async function createLinearTicket(title: string, description: string, priority?: string): Promise<any> {
  const config = loadRawConfig();
  
  if (config.ticketing?.provider !== "linear" || !config.ticketing?.linear?.apiKey) {
    throw new Error("Linear integration not configured");
  }

  const apiKey = config.ticketing.linear.apiKey;
  const teamId = config.ticketing.linear.teamId;

  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
    none: 0,
  };

  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
          state { name }
          priority
          createdAt
        }
      }
    }
  `;

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          teamId,
          title,
          description,
          priority: priorityMap[priority || "medium"] || 3,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.data?.issueCreate?.success) {
    throw new Error("Failed to create Linear issue");
  }

  const issue = data.data.issueCreate.issue;
  return {
    id: `linear-${issue.id}`,
    provider: "linear",
    externalId: issue.identifier,
    externalUrl: issue.url,
    title: issue.title,
    status: issue.state?.name?.toLowerCase() || "open",
    priority: ["none", "urgent", "high", "medium", "low"][issue.priority] || "medium",
    createdAt: new Date(issue.createdAt),
    source: "linear",
  };
}

export async function GET() {
  try {
    // Get local tickets from database
    const localTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    
    const formattedLocal = localTickets.map((ticket) => ({
      ...ticket,
      source: "local",
    }));

    // Get Linear tickets
    const linearTickets = await fetchLinearTickets();

    // Merge: Linear tickets first, then local
    const allTickets = [...linearTickets, ...formattedLocal];

    return NextResponse.json({
      success: true,
      data: allTickets,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = loadRawConfig();
    const provider = body.provider || config.ticketing?.provider || "local";

    if (provider === "linear") {
      const linearTicket = await createLinearTicket(
        body.title,
        body.description || "",
        body.priority
      );
      return NextResponse.json({
        success: true,
        data: linearTicket,
        timestamp: new Date().toISOString(),
      });
    }

    // Create local ticket
    const newTicket = {
      id: nanoid(),
      incidentId: body.incidentId || null,
      provider: "local",
      externalId: `LOCAL-${Date.now()}`,
      externalUrl: null,
      title: body.title,
      status: body.status || "open",
      priority: body.priority || "medium",
      syncEnabled: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(tickets).values(newTicket);

    return NextResponse.json({
      success: true,
      data: { ...newTicket, source: "local" },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}
