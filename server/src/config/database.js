const usePgMem = process.env.USE_PGMEM === 'true' || !process.env.DATABASE_URL;

if (usePgMem) {
  const { newDb } = require('pg-mem');
  const { v4: uuidv4 } = require('uuid');

  const mem = newDb();
  // Register gen_random_uuid used in migrations
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'uuid',
    implementation: () => uuidv4(),
  });

  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();

  pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') console.log('✅ Connected to in-memory PostgreSQL (pg-mem)');
  });

  pool.on('error', (err) => console.error('❌ pg-mem pool error:', err));

  module.exports = pool;
} else {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Connected to PostgreSQL');
    }
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
  });

  module.exports = pool;
}
