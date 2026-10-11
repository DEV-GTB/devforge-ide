// Index Queue - Background processing queue for indexing tasks
export interface IndexJob {
  id: string;
  projectId: string;
  type: 'file' | 'directory' | 'project';
  path: string;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
}

export class IndexQueue {
  private queue: IndexJob[] = [];
  private running: Map<string, IndexJob> = new Map();
  private completed: IndexJob[] = [];
  private failed: IndexJob[] = [];
  private cancelled: IndexJob[] = [];
  private workers: number = 0;
  private maxWorkers: number = 4;
  private processing: boolean = false;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = maxWorkers;
  }

  async enqueue(job: Omit<IndexJob, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const indexJob: IndexJob = {
      ...job,
      id: crypto.randomUUID(),
      status: 'queued',
      createdAt: new Date(),
    };

    this.queue.push(indexJob);
    this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first

    this.startProcessing();

    return indexJob.id;
  }

  async dequeue(jobId: string): Promise<boolean> {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index === -1) return false;

    const job = this.queue[index];
    job.status = 'cancelled';
    this.cancelled.push(job);
    this.queue.splice(index, 1);

    return true;
  }

  getJob(jobId: string): IndexJob | undefined {
    // Check all queues
    return (
      this.queue.find(j => j.id === jobId) ||
      this.running.get(jobId) ||
      this.completed.find(j => j.id === jobId) ||
      this.failed.find(j => j.id === jobId) ||
      this.cancelled.find(j => j.id === jobId)
    );
  }

  getJobsByProject(projectId: string): IndexJob[] {
    return [
      ...this.queue.filter(j => j.projectId === projectId),
      ...Array.from(this.running.values()).filter(j => j.projectId === projectId),
      ...this.completed.filter(j => j.projectId === projectId),
      ...this.failed.filter(j => j.projectId === projectId),
      ...this.cancelled.filter(j => j.projectId === projectId),
    ];
  }

  getJobsByStatus(status: IndexJob['status']): IndexJob[] {
    switch (status) {
      case 'queued':
        return this.queue;
      case 'running':
        return Array.from(this.running.values());
      case 'completed':
        return this.completed;
      case 'failed':
        return this.failed;
      case 'cancelled':
        return this.cancelled;
    }
  }

  getStats(): QueueStats {
    return {
      totalJobs: this.queue.length + this.running.size + this.completed.length + this.failed.length + this.cancelled.length,
      queuedJobs: this.queue.length,
      runningJobs: this.running.size,
      completedJobs: this.completed.length,
      failedJobs: this.failed.length,
      cancelledJobs: this.cancelled.length,
    };
  }

  clear(): void {
    this.queue = [];
    this.running.clear();
    this.completed = [];
    this.failed = [];
    this.cancelled = [];
  }

  clearProject(projectId: string): void {
    this.queue = this.queue.filter(j => j.projectId !== projectId);
    this.completed = this.completed.filter(j => j.projectId !== projectId);
    this.failed = this.failed.filter(j => j.projectId !== projectId);
    this.cancelled = this.cancelled.filter(j => j.projectId !== projectId);

    // Cancel running jobs for this project
    for (const [id, job] of this.running) {
      if (job.projectId === projectId) {
        job.status = 'cancelled';
        this.cancelled.push(job);
        this.running.delete(id);
      }
    }
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.workers < this.maxWorkers) {
      const job = this.queue.shift();
      if (!job) break;

      this.workers++;
      job.status = 'running';
      job.startedAt = new Date();
      this.running.set(job.id, job);

      // Process job (this would be replaced with actual indexing logic)
      this.processJob(job).finally(() => {
        this.workers--;
        this.running.delete(job.id);
      });
    }

    this.processing = false;
  }

  private async processJob(job: IndexJob): Promise<void> {
    try {
      // Placeholder - actual indexing would happen here
      await new Promise(resolve => setTimeout(resolve, 100));

      job.status = 'completed';
      job.completedAt = new Date();
      this.completed.push(job);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : String(error);
      this.failed.push(job);
    }
  }

  pause(): void {
    this.processing = false;
  }

  resume(): void {
    this.processing = false;
    this.startProcessing();
  }

  setMaxWorkers(max: number): void {
    this.maxWorkers = max;
  }
}
