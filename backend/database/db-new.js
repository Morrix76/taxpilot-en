import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL not set");
  process.exit(1);
}

export const db = createClient({
  url: url,
  authToken: authToken
});

export async function initializeDatabase() {
  console.log('Database ready');
}
