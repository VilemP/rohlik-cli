import { RohlikCredentials } from '../types.js';

export function getCredentials(): RohlikCredentials | null {
  const username = process.env.ROHLIK_USERNAME;
  const password = process.env.ROHLIK_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}
