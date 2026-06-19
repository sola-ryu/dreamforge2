import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 32;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export async function hash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(SALT_LENGTH);
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt.toString('base64')}:${key.toString('base64')}`);
    });
  });
}

export async function verify(password: string, hashed: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [saltB64, keyB64] = hashed.split(':');
    if (!saltB64 || !keyB64) {
      resolve(false);
      return;
    }
    const salt = Buffer.from(saltB64, 'base64');
    const key = Buffer.from(keyB64, 'base64');
    scrypt(password.normalize('NFKC'), salt, key.length, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(timingSafeEqual(key, derivedKey));
    });
  });
}
