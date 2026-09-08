import type {UserProfile} from '../types';

/** Defaults for first install */
export const DEFAULT_USERNAME = 'ajith';
export const DEFAULT_PASSWORD = '123456';

export function verifyLocalCredentials(
  username: string,
  password: string,
  storedUsername?: string,
  storedPassword?: string,
): boolean {
  const expectedUser = (storedUsername || DEFAULT_USERNAME).trim().toLowerCase();
  const expectedPass = storedPassword || DEFAULT_PASSWORD;
  const u = username.trim().toLowerCase();
  return u === expectedUser && password === expectedPass;
}

export function buildSignedInProfile(
  existing: UserProfile,
  username: string,
): UserProfile {
  const expectedUser = (
    existing.username ||
    username ||
    DEFAULT_USERNAME
  )
    .trim()
    .toLowerCase();
  return {
    ...existing,
    displayName: existing.displayName || 'Ajith',
    email: existing.email || `${expectedUser}@local`,
    username: expectedUser,
    password: existing.password || DEFAULT_PASSWORD,
    signedIn: true,
  };
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  storedPassword: string,
): string | null {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return 'Fill all password fields';
  }
  if (currentPassword !== (storedPassword || DEFAULT_PASSWORD)) {
    return 'Current password is incorrect';
  }
  if (newPassword.length < 4) {
    return 'New password must be at least 4 characters';
  }
  if (newPassword !== confirmPassword) {
    return 'New passwords do not match';
  }
  if (newPassword === currentPassword) {
    return 'New password must be different';
  }
  return null;
}

export function validateUsernameChange(
  newUsername: string,
  currentUsername: string,
): string | null {
  const next = newUsername.trim().toLowerCase();
  if (!next) {
    return 'Username is required';
  }
  if (next.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (!/^[a-z0-9._-]+$/.test(next)) {
    return 'Use letters, numbers, . _ - only';
  }
  if (next === (currentUsername || DEFAULT_USERNAME).trim().toLowerCase()) {
    return 'New username must be different';
  }
  return null;
}
