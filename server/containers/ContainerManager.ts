import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'exited';
  ports: string[];
  created: Date;
}

export interface ContainerConfig {
  name: string;
  image: string;
  ports?: { host: number; container: number }[];
  environment?: Record<string, string>;
  volumes?: { host: string; container: string }[];
  command?: string;
}

/**
 * Container Manager
 * Purpose: Manage Docker containers for development environments
 * Features:
 * - List containers
 * - Start/stop/restart containers
 * - Create new containers
 * - View container logs
 * - Execute commands in containers
 * - Container health monitoring
 */
export class ContainerManager {
  private isDockerAvailable: boolean = false;

  constructor() {
    this.checkDockerAvailability();
  }

  private async checkDockerAvailability(): Promise<void> {
    try {
      await execAsync('docker --version');
      this.isDockerAvailable = true;
    } catch (error) {
      this.isDockerAvailable = false;
      console.warn('Docker not available. Container features disabled.');
    }
  }

  async listContainers(all: boolean = false): Promise<Container[]> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      const cmd = all ? 'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"' : 'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"';
      const { stdout } = await execAsync(cmd);

      if (!stdout.trim()) return [];

      return stdout.split('\n').map(line => {
        const [id, name, image, status, ports] = line.split('\t');
        return {
          id,
          name,
          image,
          status: this.parseStatus(status),
          ports: ports ? ports.split(',').map(p => p.trim()) : [],
          created: new Date(),
        };
      });
    } catch (error) {
      throw new Error(`Failed to list containers: ${error}`);
    }
  }

  async startContainer(containerId: string): Promise<void> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      await execAsync(`docker start ${containerId}`);
    } catch (error) {
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      await execAsync(`docker stop ${containerId}`);
    } catch (error) {
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      await execAsync(`docker restart ${containerId}`);
    } catch (error) {
      throw new Error(`Failed to restart container: ${error}`);
    }
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      const cmd = force ? `docker rm -f ${containerId}` : `docker rm ${containerId}`;
      await execAsync(cmd);
    } catch (error) {
      throw new Error(`Failed to remove container: ${error}`);
    }
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      const { stdout } = await execAsync(`docker logs --tail ${tail} ${containerId}`);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get container logs: ${error}`);
    }
  }

  async executeCommand(containerId: string, command: string): Promise<string> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      const { stdout } = await execAsync(`docker exec ${containerId} ${command}`);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to execute command: ${error}`);
    }
  }

  async createContainer(config: ContainerConfig): Promise<string> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      let cmd = `docker run -d --name ${config.name}`;

      // Add ports
      if (config.ports) {
        config.ports.forEach(port => {
          cmd += ` -p ${port.host}:${port.container}`;
        });
      }

      // Add environment variables
      if (config.environment) {
        Object.entries(config.environment).forEach(([key, value]) => {
          cmd += ` -e ${key}=${value}`;
        });
      }

      // Add volumes
      if (config.volumes) {
        config.volumes.forEach(volume => {
          cmd += ` -v ${volume.host}:${volume.container}`;
        });
      }

      // Add command
      if (config.command) {
        cmd += ` ${config.command}`;
      }

      cmd += ` ${config.image}`;

      const { stdout } = await execAsync(cmd);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to create container: ${error}`);
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available');
    }

    try {
      const { stdout } = await execAsync(`docker stats ${containerId} --no-stream --format "{{json .}}"`);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to get container stats: ${error}`);
    }
  }

  isAvailable(): boolean {
    return this.isDockerAvailable;
  }

  private parseStatus(status: string): Container['status'] {
    const lower = status.toLowerCase();
    if (lower.includes('running')) return 'running';
    if (lower.includes('paused')) return 'paused';
    if (lower.includes('exited')) return 'exited';
    return 'stopped';
  }
}
