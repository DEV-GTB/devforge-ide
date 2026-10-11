export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateString(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    errors.push(`${fieldName} is required`);
  } else if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  } else if (value.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateObject(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    errors.push(`${fieldName} is required`);
  } else if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${fieldName} must be an object`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateArray(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    errors.push(`${fieldName} is required`);
  } else if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationResult {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    errors.push(`${fieldName} is required`);
  } else if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
  } else {
    if (min !== undefined && value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      errors.push(`${fieldName} must be at most ${max}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFilePath(path: string): ValidationResult {
  const errors: string[] = [];

  if (!path || path.trim().length === 0) {
    errors.push('File path is required');
  } else if (path.includes('..')) {
    errors.push('File path cannot contain parent directory references');
  } else if (/^[a-zA-Z]:/.test(path) && !/^[a-zA-Z]:\\/.test(path)) {
    errors.push('Invalid Windows path format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePermission(permission: string, allowedPermissions: string[]): ValidationResult {
  const errors: string[] = [];

  if (!allowedPermissions.includes(permission)) {
    errors.push(`Permission '${permission}' is not allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
