export interface PasswordPolicyConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  maxRepeatingChars: number;
  preventCommonPasswords: boolean;
  preventPersonalInfo: boolean;
  historyCount: number; // Number of previous passwords to remember
  expirationDays: number; // Days until password expires
  warningDays: number; // Days before expiration to warn user
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  maxRepeatingChars: 2,
  preventCommonPasswords: true,
  preventPersonalInfo: true,
  historyCount: 5,
  expirationDays: 90,
  warningDays: 7,
};

export const SPECIAL_CHARACTERS = '@$!%*?&^#()_+-=[]{}|;:,.<>~`';

export const COMMON_PASSWORDS = [
  'password',
  'password123',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'password1',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'superman',
  'batman',
];