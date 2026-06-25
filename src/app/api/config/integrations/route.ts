import { NextRequest, NextResponse } from "next/server";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";

const SECRET_PLACEHOLDER = "********";

function maskSecret(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? SECRET_PLACEHOLDER : "";
}

function preserveSecret(incoming: unknown, current: unknown): unknown {
  if (incoming === undefined || incoming === null || incoming === "") {
    return current;
  }

  if (incoming === SECRET_PLACEHOLDER) {
    return current;
  }

  return incoming;
}

export async function GET() {
  try {
    const config = loadRawConfig();

    return NextResponse.json({
      success: true,
      discord: {
        enabled: config.discord?.enabled || false,
        webhookUrl: maskSecret(config.discord?.webhookUrl),
        botToken: maskSecret(config.discord?.botToken),
      },
      ticketing: {
        provider: config.ticketing?.provider || "linear",
        linear: {
          apiKey: maskSecret((config.ticketing as any)?.linear?.apiKey),
          teamId: (config.ticketing as any)?.linear?.teamId || "",
        },
        github: {
          token: maskSecret((config.ticketing as any)?.github?.token),
          owner: (config.ticketing as any)?.github?.owner || "",
          repo: (config.ticketing as any)?.github?.repo || "",
        },
      },
    });
  } catch (error) {
    console.error("Error getting integrations config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = loadRawConfig();

    if (body.discord !== undefined) {
      config.discord = {
        ...config.discord,
        enabled: body.discord.enabled ?? config.discord?.enabled ?? false,
        webhookUrl: preserveSecret(body.discord.webhookUrl, config.discord?.webhookUrl),
        botToken: preserveSecret(body.discord.botToken, config.discord?.botToken),
      };
    }

    if (body.ticketing !== undefined) {
      const ticketing: any = { ...config.ticketing };

      if (body.ticketing.provider) {
        ticketing.provider = body.ticketing.provider;
      }

      if (body.ticketing.linear) {
        ticketing.linear = {
          ...ticketing.linear,
          apiKey: preserveSecret(body.ticketing.linear.apiKey, ticketing.linear?.apiKey),
          teamId: body.ticketing.linear.teamId || ticketing.linear?.teamId,
        };
      }

      if (body.ticketing.github) {
        ticketing.github = {
          ...ticketing.github,
          token: preserveSecret(body.ticketing.github.token, ticketing.github?.token),
          owner: body.ticketing.github.owner || ticketing.github?.owner,
          repo: body.ticketing.github.repo || ticketing.github?.repo,
        };
      }

      config.ticketing = ticketing;
    }

    saveRawConfig(config);
    resetConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving integrations config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save config" },
      { status: 500 }
    );
  }
}
