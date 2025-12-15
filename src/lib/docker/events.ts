import Docker from "dockerode";
import { getDockerClient } from "./client";

export interface DockerEventInfo {
  type: string;
  action: string;
  actor: {
    id: string;
    name?: string;
    attributes: Record<string, string>;
  };
  time: Date;
  timeNano: number;
}

export async function getEvents(
  options: { since?: number; until?: number; filters?: Record<string, string[]> } = {}
): Promise<DockerEventInfo[]> {
  const docker = getDockerClient();

  return new Promise((resolve, reject) => {
    const events: DockerEventInfo[] = [];

    docker.getEvents(
      {
        since: options.since,
        until: options.until || Math.floor(Date.now() / 1000),
        filters: options.filters ? JSON.stringify(options.filters) : undefined,
      },
      (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        if (!stream) {
          resolve(events);
          return;
        }

        let buffer = "";

        stream.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event = JSON.parse(line);
                events.push({
                  type: event.Type,
                  action: event.Action,
                  actor: {
                    id: event.Actor?.ID || "",
                    name: event.Actor?.Attributes?.name,
                    attributes: event.Actor?.Attributes || {},
                  },
                  time: new Date(event.time * 1000),
                  timeNano: event.timeNano,
                });
              } catch {
                // Skip malformed events
              }
            }
          }
        });

        stream.on("end", () => {
          resolve(events);
        });

        stream.on("error", reject);

        setTimeout(() => {
          (stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
          resolve(events);
        }, 5000);
      }
    );
  });
}

export async function streamEvents(
  onEvent: (event: DockerEventInfo) => void,
  options: { filters?: Record<string, string[]> } = {}
): Promise<() => void> {
  const docker = getDockerClient();

  return new Promise((resolve, reject) => {
    docker.getEvents(
      {
        filters: options.filters ? JSON.stringify(options.filters) : undefined,
      },
      (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        if (!stream) {
          reject(new Error("No stream returned"));
          return;
        }

        stream.on("data", (chunk: Buffer) => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              try {
                const event = JSON.parse(line);
                onEvent({
                  type: event.Type,
                  action: event.Action,
                  actor: {
                    id: event.Actor?.ID || "",
                    name: event.Actor?.Attributes?.name,
                    attributes: event.Actor?.Attributes || {},
                  },
                  time: new Date(event.time * 1000),
                  timeNano: event.timeNano,
                });
              } catch {
                // Skip malformed events
              }
            }
          }
        });

        resolve(() => {
          (stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        });
      }
    );
  });
}
