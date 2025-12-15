import { listContainers, ContainerInfo } from "./containers";

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

export async function listStacks(): Promise<StackInfo[]> {
  const containers = await listContainers(true);

  const stackMap = new Map<string, ContainerInfo[]>();

  for (const container of containers) {
    const stackName = container.stackName || "_standalone";
    if (!stackMap.has(stackName)) {
      stackMap.set(stackName, []);
    }
    stackMap.get(stackName)!.push(container);
  }

  const stacks: StackInfo[] = [];

  for (const [name, stackContainers] of stackMap) {
    if (name === "_standalone") continue;

    const serviceMap = new Map<string, ContainerInfo[]>();

    for (const container of stackContainers) {
      const serviceName = container.serviceName || container.name;
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, []);
      }
      serviceMap.get(serviceName)!.push(container);
    }

    const services: ServiceInfo[] = [];
    let runningCount = 0;
    let unhealthyCount = 0;
    let restartingCount = 0;

    for (const [serviceName, serviceContainers] of serviceMap) {
      const runningReplicas = serviceContainers.filter(
        (c) => c.state === "running"
      ).length;
      const healthyReplicas = serviceContainers.filter(
        (c) => c.healthStatus === "healthy" || (!c.healthStatus && c.state === "running")
      ).length;

      runningCount += runningReplicas;
      unhealthyCount += serviceContainers.filter(
        (c) => c.healthStatus === "unhealthy"
      ).length;
      restartingCount += serviceContainers.filter(
        (c) => c.state === "restarting"
      ).length;

      services.push({
        name: serviceName,
        containers: serviceContainers,
        replicas: serviceContainers.length,
        runningReplicas,
        healthyReplicas,
      });
    }

    stacks.push({
      name,
      services,
      serviceCount: services.length,
      runningCount,
      unhealthyCount,
      restartingCount,
    });
  }

  return stacks;
}

export async function getStack(name: string): Promise<StackInfo | null> {
  const stacks = await listStacks();
  return stacks.find((s) => s.name === name) || null;
}

export async function getStandaloneContainers(): Promise<ContainerInfo[]> {
  const containers = await listContainers(true);
  return containers.filter((c) => !c.stackName);
}
