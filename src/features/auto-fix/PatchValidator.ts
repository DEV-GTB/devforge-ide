// Patch Validator - Validates patches before application
import { Patch } from './PatchGenerator';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  line?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  file: string;
  message: string;
}

export class PatchValidator {
  constructor(private projectPath: string) {}

  validatePatch(patch: Patch): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check file exists
    const filePath = resolve(this.projectPath, patch.file);
    if (!existsSync(filePath)) {
      errors.push({
        file: patch.file,
        message: `File does not exist: ${patch.file}`,
        severity: 'critical',
      });
    }

    // Check original content matches
    if (errors.length === 0) {
      const currentContent = readFileSync(filePath, 'utf-8');
      if (currentContent !== patch.originalContent) {
        errors.push({
          file: patch.file,
          message: 'File content has changed since patch was generated',
          severity: 'high',
        });
      }
    }

    // Check syntax (basic)
    if (patch.file.endsWith('.ts') || patch.file.endsWith('.tsx') || patch.file.endsWith('.js') || patch.file.endsWith('.jsx')) {
      const syntaxErrors = this.validateJavaScriptSyntax(patch.newContent);
      errors.push(...syntaxErrors);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.checkSuspiciousPatterns(patch.newContent);
    warnings.push(...suspiciousPatterns);

    // Check patch size
    if (patch.estimatedLinesChanged > 50) {
      warnings.push({
        file: patch.file,
        message: `Patch changes ${patch.estimatedLinesChanged} lines, which is large`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateBatchPatches(patches: Patch[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const patch of patches) {
      const result = this.validatePatch(patch);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    // Check for conflicting patches
    const conflicts = this.detectConflicts(patches);
    allErrors.push(...conflicts);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  private validateJavaScriptSyntax(content: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic syntax checks
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        file: '',
        message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
        severity: 'high',
      });
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        file: '',
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
        severity: 'high',
      });
    }

    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        file: '',
        message: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
        severity: 'high',
      });
    }

    return errors;
  }

  private checkSuspiciousPatterns(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for potential secrets
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['"][\w-]+['"]/gi,
      /password\s*[:=]\s*['"][\w-]+['"]/gi,
      /secret\s*[:=]\s*['"][\w-]+['"]/gi,
      /token\s*[:=]\s*['"][\w-]+['"]/gi,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        warnings.push({
          file: '',
          message: 'Content may contain sensitive information (API keys, passwords, etc.)',
        });
        break;
      }
    }

    // Check for eval (dangerous)
    if (/\beval\s*\(/.test(content)) {
      warnings.push({
        file: '',
        message: 'Content contains eval() which is potentially dangerous',
      });
    }

    // Check for large inline scripts
    if (content.length > 10000) {
      warnings.push({
        file: '',
        message: 'Content is very large, consider splitting into smaller files',
      });
    }

    return warnings;
  }

  private detectConflicts(patches: Patch[]): ValidationError[] {
    const conflicts: ValidationError[] = [];
    const fileMap = new Map<string, Patch[]>();

    // Group patches by file
    for (const patch of patches) {
      if (!fileMap.has(patch.file)) {
        fileMap.set(patch.file, []);
      }
      fileMap.get(patch.file)!.push(patch);
    }

    // Check for multiple patches to same file
    for (const [file, filePatches] of fileMap.entries()) {
      if (filePatches.length > 1) {
        conflicts.push({
          file,
          message: `${filePatches.length} patches target the same file, may conflict`,
          severity: 'medium',
        });
      }
    }

    return conflicts;
  }

  validateScope(patch: Patch, allowedPaths: string[]): boolean {
    for (const allowedPath of allowedPaths) {
      if (patch.file.startsWith(allowedPath)) {
        return true;
      }
    }
    return false;
  }

  validateProtectedPaths(patch: Patch, protectedPaths: string[]): boolean {
    for (const protectedPath of protectedPaths) {
      if (patch.file.startsWith(protectedPath)) {
        return false;
      }
    }
    return true;
  }

  calculateRiskScore(patch: Patch): number {
    let score = 0;

    // Risk factors
    if (patch.risk === 'high') score += 30;
    if (patch.risk === 'medium') score += 15;
    if (patch.estimatedLinesChanged > 20) score += 10;
    if (patch.estimatedLinesChanged > 50) score += 20;
    if (patch.newContent.length > 5000) score += 5;

    return Math.min(score, 100);
  }
}
