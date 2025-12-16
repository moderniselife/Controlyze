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
  createdAt: string;
  startedAt?: string;
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
  cpuPercent: number;         // Total CPU % across all cores (can exceed 100%)
  cpuPercentNormalized: number; // CPU % normalized to 0-100 (divided by core count)
  cpuCores: number;           // Number of CPU cores available
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pids: number;
}

export interface StackInfo {
  name: string;
  services: ServiceInfo[];
  serviceCount: number;
  runningCount: number;
  unhealthyCount: number;
  restartingCount: number;
}

export interface ServiceInfo {
  name: string;
  containers: ContainerInfo[];
  replicas: number;
  runningReplicas: number;
  healthyReplicas: number;
}

export interface LogLine {
  timestamp: string | null;
  message: string;
  stream: "stdout" | "stderr";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface DockerInfo {
  containers: number;
  images: number;
  serverVersion: string;
  operatingSystem: string;
  architecture: string;
  memTotal: number;
  cpus: number;
}

export interface IncidentStatus {
  value: "open" | "investigating" | "mitigated" | "resolved";
  label: string;
  color: string;
}

export interface Severity {
  value: "info" | "warning" | "critical";
  label: string;
  color: string;
}
