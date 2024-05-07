import { SqliteStore } from './sqliteStore.js';
import { config } from '../config.js';

// Diem khoi tao lop du lieu duy nhat. Hien tai chi co adapter SQLite
// (da kiem chung runtime). Ban production: thay bang Prisma Client
// (PostgreSQL) theo prisma/schema.prisma - cung giao dien collection.
export function createStore(options = {}) {
  return new SqliteStore(options.sqlitePath || config.sqlitePath);
}
