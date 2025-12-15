import Docker from "dockerode";

export type DockerConnectionConfig = {
  type: "socket" | "tcp" | "ssh";
  socketPath?: string;
  host?: string;
  port?: number;
  ca?: string;
  cert?: string;
  key?: string;
};

let dockerClient: Docker | null = null;

export function getDockerClient(config?: DockerConnectionConfig): Docker {
  if (dockerClient && !config) {
    return dockerClient;
  }

  if (!config) {
    dockerClient = new Docker({ socketPath: "/var/run/docker.sock" });
    return dockerClient;
  }

  switch (config.type) {
    case "socket":
      dockerClient = new Docker({
        socketPath: config.socketPath || "/var/run/docker.sock",
      });
      break;
    case "tcp":
      dockerClient = new Docker({
        host: config.host,
        port: config.port || 2375,
        ca: config.ca,
        cert: config.cert,
        key: config.key,
      });
      break;
    case "ssh":
      dockerClient = new Docker({
        host: config.host,
        protocol: "ssh",
      });
      break;
    default:
      dockerClient = new Docker({ socketPath: "/var/run/docker.sock" });
  }

  return dockerClient;
}

export function resetDockerClient(): void {
  dockerClient = null;
}

export async function testDockerConnection(
  config?: DockerConnectionConfig
): Promise<{ success: boolean; error?: string; info?: Record<string, unknown> }> {
  try {
    const client = config ? new Docker(
      config.type === "socket"
        ? { socketPath: config.socketPath || "/var/run/docker.sock" }
        : config.type === "tcp"
        ? {
            host: config.host,
            port: config.port || 2375,
            ca: config.ca,
            cert: config.cert,
            key: config.key,
          }
        : { host: config.host, protocol: "ssh" }
    ) : getDockerClient();

    const info = await client.info();
    return { success: true, info };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
