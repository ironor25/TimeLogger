import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface SavedCredentials {
  email: string;
  password?: string;
  serverUrl: string;
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  employee?: any;
  organization?: any;
  device?: any;
  schedule?: any;
  savedAt: string;
}

interface StoredAuthFile {
  version: number;
  email: string;
  serverUrl: string;
  encryptedPassword?: string;
  encryptionMethod: 'safeStorage' | 'machineKey';
  iv?: string;
  authTag?: string;
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  employee?: any;
  organization?: any;
  device?: any;
  schedule?: any;
  savedAt: string;
}

function getCredentialsFilePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'timelogger_secure_auth.json');
}

function getMachineDerivedKey(): Buffer {
  const secret = `${os.hostname()}-${os.userInfo().username}-${os.arch()}-TimeLogger-Salt-2026`;
  return crypto.scryptSync(secret, 'salt-timelogger', 32);
}

function encryptWithMachineKey(plainText: string): { encrypted: string; iv: string; authTag: string } {
  const key = getMachineDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag,
  };
}

function decryptWithMachineKey(encryptedBase64: string, ivBase64: string, authTagBase64: string): string {
  const key = getMachineDerivedKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const secureStorage = {
  saveCredentials(data: {
    email: string;
    password?: string;
    serverUrl: string;
    tokens?: any;
    employee?: any;
    organization?: any;
    device?: any;
    schedule?: any;
  }): boolean {
    try {
      const filePath = getCredentialsFilePath();
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      let encryptedPassword = '';
      let encryptionMethod: 'safeStorage' | 'machineKey' = 'machineKey';
      let iv = '';
      let authTag = '';

      if (data.password) {
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          try {
            const encBuffer = safeStorage.encryptString(data.password);
            encryptedPassword = encBuffer.toString('base64');
            encryptionMethod = 'safeStorage';
          } catch (e) {
            console.warn('[SecureStorage] safeStorage.encryptString failed, using machine key fallback:', e);
            const enc = encryptWithMachineKey(data.password);
            encryptedPassword = enc.encrypted;
            iv = enc.iv;
            authTag = enc.authTag;
            encryptionMethod = 'machineKey';
          }
        } else {
          const enc = encryptWithMachineKey(data.password);
          encryptedPassword = enc.encrypted;
          iv = enc.iv;
          authTag = enc.authTag;
          encryptionMethod = 'machineKey';
        }
      }

      const stored: StoredAuthFile = {
        version: 1,
        email: data.email,
        serverUrl: data.serverUrl,
        encryptedPassword,
        encryptionMethod,
        iv: iv || undefined,
        authTag: authTag || undefined,
        tokens: data.tokens,
        employee: data.employee,
        organization: data.organization,
        device: data.device,
        schedule: data.schedule,
        savedAt: new Date().toISOString(),
      };

      const tmpPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(stored, null, 2), 'utf8');
      fs.renameSync(tmpPath, filePath);
      console.log(`[SecureStorage] Saved credentials for ${data.email} via ${encryptionMethod}`);
      return true;
    } catch (err) {
      console.error('[SecureStorage] Failed to save credentials:', err);
      return false;
    }
  },

  getCredentials(): SavedCredentials | null {
    try {
      const filePath = getCredentialsFilePath();
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const stored: StoredAuthFile = JSON.parse(raw);

      let password = '';
      if (stored.encryptedPassword) {
        if (stored.encryptionMethod === 'safeStorage' && safeStorage && safeStorage.isEncryptionAvailable()) {
          try {
            const buf = Buffer.from(stored.encryptedPassword, 'base64');
            password = safeStorage.decryptString(buf);
          } catch (decErr) {
            console.warn('[SecureStorage] safeStorage decryption error:', decErr);
          }
        } else if (stored.encryptionMethod === 'machineKey' && stored.iv && stored.authTag) {
          try {
            password = decryptWithMachineKey(stored.encryptedPassword, stored.iv, stored.authTag);
          } catch (decErr) {
            console.warn('[SecureStorage] machineKey decryption error:', decErr);
          }
        }
      }

      return {
        email: stored.email,
        password: password || undefined,
        serverUrl: stored.serverUrl,
        tokens: stored.tokens,
        employee: stored.employee,
        organization: stored.organization,
        device: stored.device,
        schedule: stored.schedule,
        savedAt: stored.savedAt,
      };
    } catch (err) {
      console.error('[SecureStorage] Failed to read credentials:', err);
      return null;
    }
  },

  hasCredentials(): boolean {
    try {
      const filePath = getCredentialsFilePath();
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf8');
      const stored: StoredAuthFile = JSON.parse(raw);
      return !!(stored.email && (stored.encryptedPassword || stored.tokens?.accessToken));
    } catch {
      return false;
    }
  },

  clearCredentials(): boolean {
    try {
      const filePath = getCredentialsFilePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.log('[SecureStorage] Cleared saved credentials');
      return true;
    } catch (err) {
      console.error('[SecureStorage] Failed to clear credentials:', err);
      return false;
    }
  },
};
