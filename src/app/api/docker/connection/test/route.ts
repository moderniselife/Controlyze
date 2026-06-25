import { NextResponse } from "next/server";
import { testDockerConnection, type DockerConnectionConfig } from "@/lib/docker/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config: DockerConnectionConfig | undefined = body.config;

    if (config?.type && config.type !== "socket" && process.env.ALLOW_REMOTE_DOCKER_TEST !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "Remote Docker connection tests are disabled",
        },
        { status: 400 }
      );
    }

    if (config?.type === "socket" && config.socketPath && config.socketPath !== "/var/run/docker.sock") {
      return NextResponse.json(
        {
          success: false,
          error: "Only the configured Docker socket may be tested",
        },
        { status: 400 }
      );
    }

    const result = await testDockerConnection(config);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      info: result.info
        ? {
            containers: (result.info as Record<string, unknown>).Containers,
            images: (result.info as Record<string, unknown>).Images,
            serverVersion: (result.info as Record<string, unknown>).ServerVersion,
            operatingSystem: (result.info as Record<string, unknown>).OperatingSystem,
            architecture: (result.info as Record<string, unknown>).Architecture,
            memTotal: (result.info as Record<string, unknown>).MemTotal,
            cpus: (result.info as Record<string, unknown>).NCPU,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing Docker connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
