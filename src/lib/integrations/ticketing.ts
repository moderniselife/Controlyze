export interface TicketPayload {
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  priority?: string;
  labels?: string[];
  incidentId: string;
  incidentUrl: string;
  affectedServices: string[];
  logExcerpts?: string;
}

export interface TicketResult {
  success: boolean;
  ticketId?: string;
  ticketUrl?: string;
  error?: string;
}

export interface TicketingProvider {
  name: string;
  createTicket(payload: TicketPayload): Promise<TicketResult>;
  getTicketStatus?(ticketId: string): Promise<{ status: string } | null>;
  closeTicket?(ticketId: string): Promise<{ success: boolean }>;
}

export class LinearProvider implements TicketingProvider {
  name = "Linear";
  private apiKey: string;
  private teamId: string;

  constructor(apiKey: string, teamId: string) {
    this.apiKey = apiKey;
    this.teamId = teamId;
  }

  async createTicket(payload: TicketPayload): Promise<TicketResult> {
    const priorityMap: Record<string, number> = {
      critical: 1,
      warning: 2,
      info: 3,
    };

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;

    const description = `
## Incident Details

${payload.description}

### Affected Services
${payload.affectedServices.map((s) => `- ${s}`).join("\n")}

### Link
[View in Controlyze](${payload.incidentUrl})

${payload.logExcerpts ? `### Log Excerpts\n\`\`\`\n${payload.logExcerpts}\n\`\`\`` : ""}
    `.trim();

    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              teamId: this.teamId,
              title: payload.title,
              description,
              priority: priorityMap[payload.severity] || 3,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.data?.issueCreate?.success) {
        return {
          success: true,
          ticketId: data.data.issueCreate.issue.identifier,
          ticketUrl: data.data.issueCreate.issue.url,
        };
      }

      return {
        success: false,
        error: data.errors?.[0]?.message || "Failed to create Linear issue",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTicketStatus(ticketId: string): Promise<{ status: string } | null> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          state {
            name
          }
        }
      }
    `;

    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          query,
          variables: { id: ticketId },
        }),
      });

      const data = await response.json();
      return { status: data.data?.issue?.state?.name || "unknown" };
    } catch {
      return null;
    }
  }
}

export class GitHubProvider implements TicketingProvider {
  name = "GitHub";
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  async createTicket(payload: TicketPayload): Promise<TicketResult> {
    const body = `
## Incident Details

${payload.description}

### Severity
${payload.severity.toUpperCase()}

### Affected Services
${payload.affectedServices.map((s) => `- ${s}`).join("\n")}

### Link
[View in Controlyze](${payload.incidentUrl})

${payload.logExcerpts ? `### Log Excerpts\n\`\`\`\n${payload.logExcerpts}\n\`\`\`` : ""}

---
*Created by Controlyze*
    `.trim();

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/issues`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            title: payload.title,
            body,
            labels: [
              `severity:${payload.severity}`,
              "incident",
              ...(payload.labels || []),
            ],
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          ticketId: String(data.number),
          ticketUrl: data.html_url,
        };
      }

      return {
        success: false,
        error: data.message || "Failed to create GitHub issue",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTicketStatus(ticketId: string): Promise<{ status: string } | null> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/issues/${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const data = await response.json();
      return { status: data.state || "unknown" };
    } catch {
      return null;
    }
  }
}

export class WebhookProvider implements TicketingProvider {
  name = "Webhook";
  private url: string;
  private headers: Record<string, string>;

  constructor(url: string, headers: Record<string, string> = {}) {
    this.url = url;
    this.headers = headers;
  }

  async createTicket(payload: TicketPayload): Promise<TicketResult> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.headers,
        },
        body: JSON.stringify({
          type: "incident",
          ...payload,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          ticketId: data.ticketId || data.id,
          ticketUrl: data.ticketUrl || data.url,
        };
      }

      return {
        success: false,
        error: `Webhook returned status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export function createTicketingProvider(
  config: {
    provider: "linear" | "github" | "webhook";
    linear?: { apiKey: string; teamId: string };
    github?: { token: string; owner: string; repo: string };
    webhook?: { url: string; headers?: Record<string, string> };
  }
): TicketingProvider | null {
  switch (config.provider) {
    case "linear":
      if (config.linear?.apiKey && config.linear?.teamId) {
        return new LinearProvider(config.linear.apiKey, config.linear.teamId);
      }
      break;
    case "github":
      if (config.github?.token && config.github?.owner && config.github?.repo) {
        return new GitHubProvider(
          config.github.token,
          config.github.owner,
          config.github.repo
        );
      }
      break;
    case "webhook":
      if (config.webhook?.url) {
        return new WebhookProvider(config.webhook.url, config.webhook.headers);
      }
      break;
  }
  return null;
}
