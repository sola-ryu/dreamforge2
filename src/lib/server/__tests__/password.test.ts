import { describe, it, expect } from 'vitest';
import { hash, verify } from '../password';

describe('password hashing', () => {
  it('hashes a password', async () => {
    const hashed = await hash('test-password');
    expect(hashed).toBeTruthy();
    expect(hashed).toContain(':');
  });

  it('produces different hashes for the same password', async () => {
    const h1 = await hash('same-password');
    const h2 = await hash('same-password');
    expect(h1).not.toBe(h2);
  });

  it('verifies a correct password', async () => {
    const hashed = await hash('correct-password');
    const result = await verify('correct-password', hashed);
    expect(result).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hashed = await hash('real-password');
    const result = await verify('wrong-password', hashed);
    expect(result).toBe(false);
  });

  it('rejects a malformed hash', async () => {
    const result = await verify('password', 'not-a-valid-hash');
    expect(result).toBe(false);
  });

  it('rejects an empty hash', async () => {
    const result = await verify('password', '');
    expect(result).toBe(false);
  });
});
