import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { getCredentials } from '../src/commands/utils';

describe('getCredentials', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ROHLIK_USERNAME;
    delete process.env.ROHLIK_PASSWORD;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('returns null when credentials are missing', () => {
    expect(getCredentials()).toBeNull();
  });

  test('returns null when only username is set', () => {
    process.env.ROHLIK_USERNAME = 'test@example.com';
    expect(getCredentials()).toBeNull();
  });

  test('returns null when only password is set', () => {
    process.env.ROHLIK_PASSWORD = 'password123';
    expect(getCredentials()).toBeNull();
  });

  test('returns credentials when both are set', () => {
    process.env.ROHLIK_USERNAME = 'test@example.com';
    process.env.ROHLIK_PASSWORD = 'password123';

    const creds = getCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.username).toBe('test@example.com');
    expect(creds?.password).toBe('password123');
  });
});
