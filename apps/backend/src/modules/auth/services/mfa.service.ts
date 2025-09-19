import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMfaSettings } from '../entities/user-mfa-settings.entity';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface MfaSecretResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntryCode: string;
}

export interface MfaVerificationResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(UserMfaSettings)
    private mfaSettingsRepository: Repository<UserMfaSettings>,
  ) {}

  /**
   * Generate TOTP secret for user MFA setup
   */
  async generateTotpSecret(userId: string, email: string): Promise<MfaSecretResponse> {
    // Generate secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `MoneyWise (${email})`,
      issuer: 'MoneyWise',
      length: 32, // Enhanced security with longer secret
    });

    // Generate QR code for easy setup
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled until verified)
    let mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    
    if (!mfaSettings) {
      mfaSettings = this.mfaSettingsRepository.create({
        userId,
        totpSecret: secret.base32,
        isEnabled: false,
      });
    } else {
      mfaSettings.totpSecret = secret.base32;
    }

    await this.mfaSettingsRepository.save(mfaSettings);

    return {
      secret: secret.base32,
      qrCodeUrl,
      manualEntryCode: secret.base32,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyTotpCode(userId: string, code: string): Promise<MfaVerificationResult> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    
    if (!mfaSettings || !mfaSettings.totpSecret) {
      return { isValid: false, error: 'MFA not set up for this user' };
    }

    // Verify TOTP code with time window tolerance
    const verified = speakeasy.totp.verify({
      secret: mfaSettings.totpSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 1 step back and forward for clock drift
    });

    if (verified) {
      // Enable MFA if verification successful
      mfaSettings.isEnabled = true;
      mfaSettings.lastUsedAt = new Date();
      await this.mfaSettingsRepository.save(mfaSettings);

      return { isValid: true };
    }

    return { isValid: false, error: 'Invalid TOTP code' };
  }

  /**
   * Generate backup codes for MFA recovery
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes before storing
    const hashedCodes = await Promise.all(
      backupCodes.map(code => crypto.scrypt(code, 'moneywise-backup', 32))
    );

    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    if (mfaSettings) {
      mfaSettings.backupCodes = hashedCodes.map(hash => hash.toString('hex'));
      await this.mfaSettingsRepository.save(mfaSettings);
    }

    return backupCodes; // Return unhashed codes to user (one-time display)
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MfaVerificationResult> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    
    if (!mfaSettings || !mfaSettings.backupCodes?.length) {
      return { isValid: false, error: 'No backup codes available' };
    }

    // Hash provided code and compare
    const providedHash = await crypto.scrypt(code.toUpperCase(), 'moneywise-backup', 32);
    const providedHashHex = providedHash.toString('hex');

    const codeIndex = mfaSettings.backupCodes.findIndex(hash => hash === providedHashHex);
    
    if (codeIndex !== -1) {
      // Remove used backup code
      mfaSettings.backupCodes.splice(codeIndex, 1);
      mfaSettings.lastUsedAt = new Date();
      await this.mfaSettingsRepository.save(mfaSettings);

      return { isValid: true };
    }

    return { isValid: false, error: 'Invalid backup code' };
  }

  /**
   * Check if user has MFA enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    return mfaSettings?.isEnabled || false;
  }

  /**
   * Disable MFA for user
   */
  async disableMfa(userId: string): Promise<void> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    if (mfaSettings) {
      mfaSettings.isEnabled = false;
      mfaSettings.totpSecret = null;
      mfaSettings.backupCodes = null;
      await this.mfaSettingsRepository.save(mfaSettings);
    }
  }

  /**
   * Get MFA settings for user
   */
  async getMfaSettings(userId: string): Promise<Partial<UserMfaSettings>> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });
    
    if (!mfaSettings) {
      return { isEnabled: false };
    }

    return {
      id: mfaSettings.id,
      isEnabled: mfaSettings.isEnabled,
      phoneNumber: mfaSettings.phoneNumber,
      recoveryEmail: mfaSettings.recoveryEmail,
      lastUsedAt: mfaSettings.lastUsedAt,
      // Never expose secrets in API responses
    };
  }
}