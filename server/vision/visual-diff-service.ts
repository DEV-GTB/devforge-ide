import fs from 'fs';
import { decodePng, encodePng, DecodedPng } from './png';
import { VisionError } from './vision.errors';

export interface DiffMask {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiffComputeInput {
  baselinePath: string;
  currentPath: string;
  /** 0..1 fraction of the 0..255 channel range treated as noise. */
  threshold: number;
  masks: DiffMask[];
}

export interface DiffComputeResult {
  diffBuffer: Buffer;
  changedPixels: number;
  totalPixels: number;
  changedRatio: number;
  dimensionsMatch: boolean;
  width: number;
  height: number;
}

/** 40 megapixels is far beyond any preview capture; rejects decompression bombs. */
const MAX_TOTAL_PIXELS = 40_000_000;

function readPng(filePath: string): DecodedPng {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    throw new VisionError('VISION_ARTIFACT_MISSING', 'Screenshot artifact could not be read.', {
      status: 404,
    });
  }
  try {
    const decoded = decodePng(buffer);
    if (decoded.width * decoded.height > MAX_TOTAL_PIXELS) {
      throw new VisionError('VISION_DIFF_FAILED', 'Image exceeds the maximum pixel budget.', {
        status: 413,
      });
    }
    return decoded;
  } catch (error) {
    if (error instanceof VisionError) throw error;
    throw new VisionError(
      'VISION_DIFF_FAILED',
      error instanceof Error ? error.message : 'Image could not be decoded.',
      { status: 400 }
    );
  }
}

function isMasked(masks: DiffMask[], x: number, y: number): boolean {
  for (const mask of masks) {
    if (
      x >= mask.x &&
      x < mask.x + mask.width &&
      y >= mask.y &&
      y < mask.y + mask.height
    ) {
      return true;
    }
  }
  return false;
}

export function computeVisualDiff(input: DiffComputeInput): DiffComputeResult {
  const baseline = readPng(input.baselinePath);
  const current = readPng(input.currentPath);

  if (baseline.width !== current.width || baseline.height !== current.height) {
    throw new VisionError(
      'VISION_DIFF_DIMENSIONS_MISMATCH',
      `Baseline is ${baseline.width}×${baseline.height} but the current capture is ${current.width}×${current.height}.`,
      { status: 409, hint: 'Recapture the current screenshot at the baseline viewport.' }
    );
  }

  const { width, height } = current;
  const totalPixels = width * height;
  const channelThreshold = Math.round(input.threshold * 255);

  const diff = Buffer.alloc(width * height * 4);
  let changedPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const masked = isMasked(input.masks, x, y);

      const dr = Math.abs(current.data[idx] - baseline.data[idx]);
      const dg = Math.abs(current.data[idx + 1] - baseline.data[idx + 1]);
      const db = Math.abs(current.data[idx + 2] - baseline.data[idx + 2]);
      const changed = !masked && Math.max(dr, dg, db) > channelThreshold;

      if (masked) {
        diff[idx] = 60;
        diff[idx + 1] = 60;
        diff[idx + 2] = 70;
        diff[idx + 3] = 255;
      } else if (changed) {
        changedPixels++;
        diff[idx] = 255;
        diff[idx + 1] = 60;
        diff[idx + 2] = 60;
        diff[idx + 3] = 255;
      } else {
        const gray = Math.round(
          (current.data[idx] + current.data[idx + 1] + current.data[idx + 2]) / 3
        );
        diff[idx] = gray;
        diff[idx + 1] = gray;
        diff[idx + 2] = gray;
        diff[idx + 3] = 255;
      }
    }
  }

  return {
    diffBuffer: encodePng({ width, height, data: diff }),
    changedPixels,
    totalPixels,
    changedRatio: totalPixels === 0 ? 0 : changedPixels / totalPixels,
    dimensionsMatch: true,
    width,
    height,
  };
}
