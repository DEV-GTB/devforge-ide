import crypto from 'crypto';

export type MediaJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type MediaJobKind = 'image' | 'video';

export interface MediaJobResult {
  videoUrl?: string;
  image?: string;
  mimeType?: string;
  model?: string;
  state?: string;
}

export interface MediaJob {
  id: string;
  kind: MediaJobKind;
  model: string;
  status: MediaJobStatus;
  result?: MediaJobResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_JOBS = 200;

/**
 * Small in-memory job store for long-running media generation. Long-running
 * Cloudflare video jobs are run detached from the request lifecycle; callers
 * start a job, receive an id, and poll for its status. Jobs expire after 30
 * minutes and are capped so a runaway client cannot exhaust memory.
 */
class MediaJobStore {
  private jobs = new Map<string, MediaJob>();

  create(kind: MediaJobKind, model: string): MediaJob {
    this.sweep();
    const now = new Date().toISOString();
    const job: MediaJob = {
      id: `mjob_${crypto.randomUUID()}`,
      kind,
      model,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);

    while (this.jobs.size > MAX_JOBS) {
      const oldest = this.jobs.keys().next().value;
      if (oldest === undefined) break;
      this.jobs.delete(oldest);
    }
    return job;
  }

  markRunning(id: string): void {
    this.update(id, { status: 'running' });
  }

  complete(id: string, result: MediaJobResult): void {
    this.update(id, { status: 'completed', result, error: undefined });
  }

  fail(id: string, error: string): void {
    this.update(id, { status: 'failed', error });
  }

  get(id: string): MediaJob | undefined {
    this.sweep();
    return this.jobs.get(id);
  }

  private update(id: string, patch: Partial<MediaJob>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  }

  private sweep(): void {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (new Date(job.updatedAt).getTime() < cutoff) {
        this.jobs.delete(id);
      }
    }
  }
}

export const mediaJobStore = new MediaJobStore();
