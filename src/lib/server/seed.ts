import { hash } from '$lib/server/password';
import db from './db';
import { migrate } from './migrate';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '$env/dynamic/private';
import { generateId } from '$lib/utils';

const drizzleDb = drizzle(db);

export async function seed() {
  migrate();

  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existing = drizzleDb.select().from(users).where(eq(users.email, adminEmail)).get();

  if (!existing) {
    const passwordHash = await hash(adminPassword);
    drizzleDb.insert(users).values({
      id: generateId(),
      email: adminEmail,
      username: 'admin',
      passwordHash,
      createdAt: new Date().toISOString()
    }).run();

    console.log('Admin user created');
  }
}
