import Docker from "dockerode";
import { getDockerClient } from "./client";

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  imageId: string;
  status: string;
  state: string;
  healthStatus?: string;
  healthOutput?: string;
  restartCount: number;
  stackName?: string;
  serviceName?: string;
  labels: Record<string, string>;
  ports: PortBinding[];
  mounts: MountInfo[];
  networkMode?: string;
  createdAt: Date;
  startedAt?: Date;
}

export interface PortBinding {
  containerPort: number;
  hostPort?: number;
  hostIp?: string;
  protocol: string;
}

export interface MountInfo {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
}

function extractStackName(labels: Record<string, string>): string | undefined {
  return labels["com.docker.compose.project"] || undefined;
}

function extractServiceName(labels: Record<string, string>): string | undefined {
  return labels["com.docker.compose.service"] || undefined;
}

function parsePorts(container: Docker.ContainerInfo): PortBinding[] {
  return (container.Ports || []).map((port) => ({
    containerPort: port.PrivatePort,
    hostPort: port.PublicPort,
    hostIp: port.IP,
    protocol: port.Type,
  }));
}

function parseMounts(container: Docker.ContainerInfo): MountInfo[] {
  return (container.Mounts || []).map((mount) => ({
    type: mount.Type,
    source: mount.Source || "",
    destination: mount.Destination,
    mode: mount.Mode || "",
    rw: mount.RW,
  }));
}

export async function listContainers(all = true): Promise<ContainerInfo[]> {
  const docker = getDockerClient();
  const containers = await docker.listContainers({ all });

  return containers.map((container) => {
    const labels = container.Labels || {};
    const name = container.Names?.[0]?.replace(/^\//, "") || container.Id.slice(0, 12);

    return {
      id: container.Id,
      name,
      image: container.Image,
      imageId: container.ImageID,
      status: container.Status,
      state: container.State,
      healthStatus: (container as any).Status?.includes("healthy")
        ? container.Status.includes("unhealthy")
          ? "unhealthy"
          : "healthy"
        : undefined,
      restartCount: 0,
      stackName: extractStackName(labels),
      serviceName: extractServiceName(labels),
      labels,
      ports: parsePorts(container),
      mounts: parseMounts(container),
      networkMode: container.HostConfig?.NetworkMode,
      createdAt: new Date(container.Created * 1000),
    };
  });
}

export async function getContainer(id: string): Promise<ContainerInfo | null> {
  const docker = getDockerClient();
  try {
    const container = docker.getContainer(id);
    const info = await container.inspect();
    const labels = info.Config.Labels || {};

    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ""),
      image: info.Config.Image,
      imageId: info.Image,
      status: info.State.Status,
      state: info.State.Status,
      healthStatus: info.State.Health?.Status,
      healthOutput: info.State.Health?.Log?.[0]?.Output,
      restartCount: info.RestartCount,
      stackName: extractStackName(labels),
      serviceName: extractServiceName(labels),
      labels,
      ports: Object.entries(info.HostConfig.PortBindings || {}).map(
        ([containerPort, bindings]) => {
          const [port, protocol] = containerPort.split("/");
          const binding = (bindings as any)?.[0];
          return {
            containerPort: parseInt(port),
            hostPort: binding?.HostPort ? parseInt(binding.HostPort) : undefined,
            hostIp: binding?.HostIp,
            protocol: protocol || "tcp",
          };
        }
      ),
      mounts: (info.Mounts || []).map((mount) => ({
        type: mount.Type,
        source: mount.Source || "",
        destination: mount.Destination,
        mode: mount.Mode || "",
        rw: mount.RW,
      })),
      networkMode: info.HostConfig.NetworkMode,
      createdAt: new Date(info.Created),
      startedAt: info.State.StartedAt ? new Date(info.State.StartedAt) : undefined,
    };
  } catch {
    return null;
  }
}

export async function startContainer(id: string): Promise<void> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.start();
}

export async function stopContainer(id: string): Promise<void> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.stop();
}

export async function restartContainer(id: string): Promise<void> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.restart();
}

export async function getContainerLogs(
  id: string,
  options: { tail?: number; since?: number; until?: number; timestamps?: boolean } = {}
): Promise<string> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);

  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail: options.tail || 100,
    since: options.since,
    until: options.until,
    timestamps: options.timestamps ?? true,
  });

  return logs.toString("utf-8");
}

export async function streamContainerLogs(
  id: string,
  onData: (data: string) => void,
  options: { tail?: number } = {}
): Promise<() => void> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);

  const stream = await container.logs({
    stdout: true,
    stderr: true,
    follow: true,
    tail: options.tail || 100,
    timestamps: true,
  });

  stream.on("data", (chunk: Buffer) => {
    onData(chunk.toString("utf-8"));
  });

  return () => {
    (stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
  };
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
  const docker = getDockerClient();
  const container = docker.getContainer(id);

  const stats = await container.stats({ stream: false });

  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent =
    systemDelta > 0
      ? (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100
      : 0;

  const memoryUsage = stats.memory_stats.usage || 0;
  const memoryLimit = stats.memory_stats.limit || 1;
  const memoryPercent = (memoryUsage / memoryLimit) * 100;

  let networkRxBytes = 0;
  let networkTxBytes = 0;
  if (stats.networks) {
    for (const network of Object.values(stats.networks)) {
      networkRxBytes += (network as any).rx_bytes || 0;
      networkTxBytes += (network as any).tx_bytes || 0;
    }
  }

  let blockReadBytes = 0;
  let blockWriteBytes = 0;
  if (stats.blkio_stats?.io_service_bytes_recursive) {
    for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
      if (entry.op === "read" || entry.op === "Read") {
        blockReadBytes += entry.value;
      } else if (entry.op === "write" || entry.op === "Write") {
        blockWriteBytes += entry.value;
      }
    }
  }

  return {
    cpuPercent,
    memoryUsage,
    memoryLimit,
    memoryPercent,
    networkRxBytes,
    networkTxBytes,
    blockReadBytes,
    blockWriteBytes,
    pids: stats.pids_stats?.current || 0,
  };
}
