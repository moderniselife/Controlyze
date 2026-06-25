import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PlexSettings {
  enabled: boolean;
  plexUrl: string;
  plexToken: string;
  plexContainerName: string;
  zurgContainerName: string;
  checkIntervalSeconds: number;
  maxConsecutiveFailures: number;
  restartDelaySeconds: number;
  discordWebhookUrl: string;
  webhookUrl: string;
  monitoredLibraries: string[];
  enableAlerts: boolean;
}

const DEFAULT_SETTINGS: PlexSettings = {
  enabled: false,
  plexUrl: "",
  plexToken: "",
  plexContainerName: "plex",
  zurgContainerName: "pd_zurg",
  checkIntervalSeconds: 60,
  maxConsecutiveFailures: 3,
  restartDelaySeconds: 5,
  discordWebhookUrl: "",
  webhookUrl: "",
  monitoredLibraries: [],
  enableAlerts: false,
};

export async function GET() {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "plex_monitor"));

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_SETTINGS,
      });
    }

    const plexSettings = JSON.parse(result[0].value) as PlexSettings;
    
    return NextResponse.json({
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...plexSettings,
        plexToken: plexSettings.plexToken ? "••••••••" : "",
      },
    });
  } catch (error) {
    console.error("Error fetching Plex settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Plex settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentSettings = await getCurrentSettings();
    const plexUrl = body.plexUrl ?? DEFAULT_SETTINGS.plexUrl;
    const existingUrl = currentSettings?.plexUrl ?? DEFAULT_SETTINGS.plexUrl;
    const preservingToken = body.plexToken === "••••••••";
    const preservedToken = preservingToken && plexUrl === existingUrl
      ? (currentSettings?.plexToken || "")
      : "";

    if (preservingToken && plexUrl !== existingUrl) {
      return NextResponse.json(
        { success: false, error: "Plex token must be re-entered when changing the Plex URL" },
        { status: 400 }
      );
    }

    const plexSettings: PlexSettings = {
      enabled: body.enabled ?? DEFAULT_SETTINGS.enabled,
      plexUrl,
      plexToken: preservingToken ? preservedToken : (body.plexToken ?? DEFAULT_SETTINGS.plexToken),
      plexContainerName: body.plexContainerName ?? DEFAULT_SETTINGS.plexContainerName,
      zurgContainerName: body.zurgContainerName ?? DEFAULT_SETTINGS.zurgContainerName,
      checkIntervalSeconds: body.checkIntervalSeconds ?? DEFAULT_SETTINGS.checkIntervalSeconds,
      maxConsecutiveFailures: body.maxConsecutiveFailures ?? DEFAULT_SETTINGS.maxConsecutiveFailures,
      restartDelaySeconds: body.restartDelaySeconds ?? DEFAULT_SETTINGS.restartDelaySeconds,
      discordWebhookUrl: body.discordWebhookUrl ?? DEFAULT_SETTINGS.discordWebhookUrl,
      webhookUrl: body.webhookUrl ?? DEFAULT_SETTINGS.webhookUrl,
      monitoredLibraries: body.monitoredLibraries ?? DEFAULT_SETTINGS.monitoredLibraries,
      enableAlerts: body.enableAlerts ?? DEFAULT_SETTINGS.enableAlerts,
    };

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "plex_monitor"));

    if (existing.length === 0) {
      await db.insert(settings).values({
        key: "plex_monitor",
        value: JSON.stringify(plexSettings),
        category: "monitoring",
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(settings)
        .set({
          value: JSON.stringify(plexSettings),
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "plex_monitor"));
    }

    return NextResponse.json({
      success: true,
      message: "Plex settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving Plex settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save Plex settings" },
      { status: 500 }
    );
  }
}

async function getCurrentSettings(): Promise<PlexSettings | null> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "plex_monitor"));

    if (result.length > 0) {
      const plexSettings = JSON.parse(result[0].value) as PlexSettings;
      return plexSettings;
    }
  } catch (error) {
    console.error("Error getting current Plex settings:", error);
  }
  return null;
}
