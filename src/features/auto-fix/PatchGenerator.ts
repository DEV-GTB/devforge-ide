// Patch Generator - Generates patches from AI suggestions
import { Fix } from './FixOrchestrator';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

export interface Patch {
  id: string;
  file: string;
  originalContent: string;
  newContent: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  estimatedLinesChanged: number;
}

export interface PatchOptions {
  createBackup?: boolean;
  validateSyntax?: boolean;
  maxFileSize?: number;
}

export class PatchGenerator {
  private patchCounter = 0;

  constructor(private projectPath: string) {}

  generatePatch(fix: Fix, options: PatchOptions = {}): Patch {
    const filePath = resolve(this.projectPath, fix.file);

    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    const lines = originalContent.split('\n');

    if (fix.line < 1 || fix.line > lines.length) {
      throw new Error(`Line ${fix.line} is out of range for file ${fix.file}`);
    }

    // Replace the line
    lines[fix.line - 1] = fix.replacement;
    const newContent = lines.join('\n');

    const patch: Patch = {
      id: `PATCH-${++this.patchCounter}`,
      file: fix.file,
      originalContent,
      newContent,
      description: fix.description,
      risk: this.estimateRisk(fix),
      estimatedLinesChanged: this.countChangedLines(originalContent, newContent),
    };

    return patch;
  }

  generateMultiFilePatch(fixes: Fix[], options: PatchOptions = {}): Patch[] {
    const patches: Patch[] = [];

    for (const fix of fixes) {
      try {
        const patch = this.generatePatch(fix, options);
        patches.push(patch);
      } catch (error) {
        console.error(`Failed to generate patch for ${fix.file}:`, error);
      }
    }

    return patches;
  }

  applyPatch(patch: Patch, options: PatchOptions = {}): void {
    const filePath = resolve(this.projectPath, patch.file);

    // Create backup if requested
    if (options.createBackup) {
      const backupPath = `${filePath}.backup`;
      writeFileSync(backupPath, patch.originalContent, 'utf-8');
    }

    // Write new content
    writeFileSync(filePath, patch.newContent, 'utf-8');
  }

  revertPatch(patch: Patch): void {
    const filePath = resolve(this.projectPath, patch.file);
    writeFileSync(filePath, patch.originalContent, 'utf-8');
  }

  generateDiff(patch: Patch): string {
    const originalLines = patch.originalContent.split('\n');
    const newLines = patch.newContent.split('\n');

    let diff = `--- ${patch.file}\n`;
    diff += `+++ ${patch.file}\n`;

    for (let i = 0; i < Math.max(originalLines.length, newLines.length); i++) {
      const original = originalLines[i];
      const newLine = newLines[i];

      if (original !== newLine) {
        if (original !== undefined) {
          diff += `-${original}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      }
    }

    return diff;
  }

  estimateRisk(fix: Fix): 'low' | 'medium' | 'high' {
    const description = fix.description.toLowerCase();

    // High risk indicators
    if (description.includes('delete') || description.includes('remove') || description.includes('security')) {
      return 'high';
    }

    // Medium risk indicators
    if (description.includes('change') || description.includes('modify') || description.includes('refactor')) {
      return 'medium';
    }

    // Low risk indicators
    if (description.includes('add') || description.includes('fix') || description.includes('import')) {
      return 'low';
    }

    return 'medium';
  }

  private countChangedLines(original: string, modified: string): number {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    let changes = 0;
    for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
      if (originalLines[i] !== modifiedLines[i]) {
        changes++;
      }
    }

    return changes;
  }

  validatePatchSize(patch: Patch, maxLines: number = 100): boolean {
    return patch.estimatedLinesChanged <= maxLines;
  }

  validateFileSize(patch: Patch, maxSize: number = 100000): boolean {
    return patch.newContent.length <= maxSize;
  }

  createCheckpoint(files: string[]): string {
    const checkpointId = `CHECKPOINT-${Date.now()}`;
    // In a real implementation, this would create a proper checkpoint
    console.log(`Created checkpoint ${checkpointId} for ${files.length} files`);
    return checkpointId;
  }

  restoreCheckpoint(checkpointId: string): void {
    // In a real implementation, this would restore from checkpoint
    console.log(`Restored checkpoint ${checkpointId}`);
  }
}
