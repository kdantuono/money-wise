import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SaltEdge Configuration Module
 *
 * Loads SaltEdge API credentials and RSA private key for secure request signing.
 * The private key is used to sign all API requests according to SaltEdge security requirements.
 *
 * Environment Variables Required:
 * - SALTEDGE_CLIENT_ID: Your SaltEdge application Client ID
 * - SALTEDGE_APP_ID: Your SaltEdge application App ID
 * - SALTEDGE_API_URL: SaltEdge API endpoint (default: https://api.saltedge.com/api/v5)
 * - SALTEDGE_PRIVATE_KEY_PATH: Path to RSA private key file (e.g., ./apps/backend/.secrets/private.pem)
 * - SALTEDGE_REDIRECT_URI: OAuth callback URI (e.g., http://localhost:3000/banking/callback)
 * - BANKING_INTEGRATION_ENABLED: Enable/disable banking integration (true/false)
 * - BANKING_SYNC_ENABLED: Enable/disable automatic sync (true/false)
 * - BANKING_SYNC_INTERVAL: Sync interval in seconds (default: 86400 = 24 hours)
 * - APP_URL: Base URL of your application
 */
export const saltEdgeConfig = registerAs('saltedge', () => {
  const clientId = process.env.SALTEDGE_CLIENT_ID;
  const appId = process.env.SALTEDGE_APP_ID;
  const apiUrl = process.env.SALTEDGE_API_URL || 'https://api.saltedge.com/api/v5';
  const privateKeyPath = process.env.SALTEDGE_PRIVATE_KEY_PATH;
  const redirectUri = process.env.SALTEDGE_REDIRECT_URI;
  const appUrl = process.env.APP_URL;
  const enabled = process.env.BANKING_INTEGRATION_ENABLED === 'true';
  const syncEnabled = process.env.BANKING_SYNC_ENABLED === 'true';
  const syncInterval = parseInt(process.env.BANKING_SYNC_INTERVAL || '86400', 10);

  // Load private key from file
  const privateKey = loadPrivateKey(privateKeyPath);

  // Validate required fields
  if (enabled) {
    const required = { clientId, appId, privateKey, redirectUri, appUrl };
    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `Missing SaltEdge configuration: ${missing.join(', ')}. ` +
        `Check your .env.local file and ensure all required environment variables are set.`,
      );
    }
  }

  return {
    // API Credentials
    clientId,
    appId,
    apiUrl,
    redirectUri,
    appUrl,

    // Security
    privateKeyPath,
    privateKey,

    // Feature Flags
    enabled,
    syncEnabled,
    syncInterval,

    // Derived values for convenience
    connectUrl: `${apiUrl}/connect_sessions/create`,
    accountsUrl: `${apiUrl}/accounts`,
    connectionsUrl: `${apiUrl}/connections`,
  };
});

/**
 * Validate that a file path is within the allowed config directory
 * Prevents directory traversal attacks via environment variables
 *
 * @param targetPath - Path to validate
 * @returns Normalized path if valid
 * @throws Error if path is outside allowed directory
 */
function validateConfigPath(targetPath: string): string {
  // Define allowed base directory (config and secrets)
  const allowedBases = [
    path.normalize(path.resolve(process.cwd(), 'apps/backend/config')),
    path.normalize(path.resolve(process.cwd(), 'apps/backend/.secrets')),
    path.normalize(path.resolve(process.cwd(), '.secrets')),
  ];

  // Normalize and resolve the target path
  const normalizedPath = path.normalize(path.resolve(targetPath));

  // Check if path is within any allowed base directory
  const isAllowed = allowedBases.some(base => normalizedPath.startsWith(base));

  if (!isAllowed) {
    throw new Error(
      `Security: Invalid config path "${targetPath}". ` +
      `Path must be within allowed directories: ${allowedBases.join(', ')}`,
    );
  }

  return normalizedPath;
}

/**
 * Load RSA private key from file system
 *
 * Security Notes:
 * - Private key should be in PEM format
 * - File should have restricted permissions (chmod 600)
 * - Key is loaded into memory - never logged or exposed
 * - Path traversal protection: validates path is within allowed directories
 *
 * @param keyPath - Absolute or relative path to private key file
 * @returns Private key content in PEM format, or null if not found/disabled
 * @throws Error if key file is invalid or unreadable
 */
function loadPrivateKey(keyPath?: string): string | null {
  if (!keyPath) {
    console.warn(
      'SALTEDGE_PRIVATE_KEY_PATH not set. Banking integration may not work. ' +
      'Set this to the path of your private.pem file.',
    );
    return null;
  }

  try {
    // Resolve path relative to process.cwd()
    const resolvedPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(process.cwd(), keyPath);

    // Validate path is within allowed directories (prevent directory traversal)
    const validatedPath = validateConfigPath(resolvedPath);

    // Check file exists
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Path validated by validateConfigPath()
    if (!fs.existsSync(validatedPath)) {
      throw new Error(`Private key file not found at: ${validatedPath}`);
    }

    // Read file
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Path validated by validateConfigPath()
    const keyContent = fs.readFileSync(validatedPath, 'utf8');

    // Validate PEM format
    if (!keyContent.includes('BEGIN') || !keyContent.includes('END')) {
      throw new Error(`Invalid private key format at: ${validatedPath}. Expected PEM format.`);
    }

    console.log(`✅ Loaded SaltEdge private key from: ${validatedPath}`);
    return keyContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to load SaltEdge private key: ${message}`);
    throw error;
  }
}

/**
 * Type definition for SaltEdge configuration
 */
export interface SaltEdgeConfiguration {
  clientId: string;
  appId: string;
  apiUrl: string;
  redirectUri: string;
  appUrl: string;
  privateKeyPath?: string;
  privateKey: string | null;
  enabled: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  connectUrl: string;
  accountsUrl: string;
  connectionsUrl: string;
}
