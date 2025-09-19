-- Migration: Create Security Tables for Enhanced Authentication
-- Date: 2025-01-19
-- Description: Add MFA settings and session tracking tables

-- Create user_mfa_settings table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "isEnabled" BOOLEAN DEFAULT FALSE,
  "totpSecret" TEXT,
  "backupCodes" JSONB,
  "phoneNumber" VARCHAR(20),
  "recoveryEmail" VARCHAR(255),
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE,
  "deviceFingerprint" VARCHAR(255),
  "ipAddress" INET,
  "userAgent" TEXT,
  location JSONB,
  "isActive" BOOLEAN DEFAULT TRUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "lastActivityAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions("sessionToken");
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions("userId", "isActive");
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions("expiresAt");
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings("userId");

-- Create social_accounts table for OAuth integration
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  "providerId" VARCHAR(255) NOT NULL,
  "providerEmail" VARCHAR(255),
  "providerData" JSONB,
  "linkedAt" TIMESTAMP DEFAULT NOW(),
  "lastUsedAt" TIMESTAMP,
  UNIQUE(provider, "providerId"),
  UNIQUE("userId", provider)
);

-- Create indexes for social accounts
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts("userId");
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider, "providerId");

-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
  event VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  metadata JSONB,
  "ipAddress" INET,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events("userId");
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events("createdAt");
CREATE INDEX IF NOT EXISTS idx_security_events_event ON security_events(event);

-- Create api_keys table for mobile app authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "keyHash" VARCHAR(255) NOT NULL UNIQUE,
  "appId" VARCHAR(100) NOT NULL,
  "appName" VARCHAR(255) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  "rateLimit" JSONB,
  "isActive" BOOLEAN DEFAULT TRUE,
  "expiresAt" TIMESTAMP,
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys("keyHash");
CREATE INDEX IF NOT EXISTS idx_api_keys_app_id ON api_keys("appId");
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys("isActive");

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "ipAddress" INET,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens("expiresAt");

-- Add security columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginIp" INET;

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
DROP TRIGGER IF EXISTS update_user_mfa_settings_updated_at ON user_mfa_settings;
CREATE TRIGGER update_user_mfa_settings_updated_at
  BEFORE UPDATE ON user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default API key for development (remove in production)
INSERT INTO api_keys ("keyHash", "appId", "appName", permissions, "rateLimit") 
VALUES (
  'dev-api-key-hash-12345',
  'moneywise-mobile-dev',
  'MoneyWise Mobile Development',
  '["read", "write"]',
  '{"requests": 1000, "window": 3600}'
) ON CONFLICT ("keyHash") DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_mfa_settings IS 'Multi-factor authentication settings for users';
COMMENT ON TABLE user_sessions IS 'Active user sessions with device tracking';
COMMENT ON TABLE social_accounts IS 'Linked social media accounts for OAuth';
COMMENT ON TABLE security_events IS 'Security audit log for monitoring and compliance';
COMMENT ON TABLE api_keys IS 'API keys for mobile and third-party applications';
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens';

COMMENT ON COLUMN user_mfa_settings."totpSecret" IS 'Encrypted TOTP secret key';
COMMENT ON COLUMN user_mfa_settings."backupCodes" IS 'Hashed backup codes for account recovery';
COMMENT ON COLUMN user_sessions."deviceFingerprint" IS 'Unique device identifier based on browser/device characteristics';
COMMENT ON COLUMN security_events.metadata IS 'Additional context data for security events';
COMMENT ON COLUMN api_keys.permissions IS 'Array of allowed operations for the API key';
COMMENT ON COLUMN api_keys."rateLimit" IS 'Rate limiting configuration for the API key';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO moneywise_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO moneywise_app;