export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || typeof username !== 'string') {
      errors.push('Username is required');
    } else {
      if (username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      }
      if (username.length > 50) {
        errors.push('Username must be no more than 50 characters long');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
    } else {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
      if (password.length > 128) {
        errors.push('Password must be no more than 128 characters long');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLoginRequest(data: any): ValidationResult {
    const errors: string[] = [];

    // Validate username
    const usernameValidation = this.validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }

    // Validate password (less strict for login)
    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRegistrationRequest(data: any): ValidationResult {
    const errors: string[] = [];

    // Validate username
    const usernameValidation = this.validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }

    // Validate password (strict for registration)
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}