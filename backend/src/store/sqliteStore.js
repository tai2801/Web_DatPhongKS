// Lop du lieu SQLite dung node:sqlite tich hop trong Node >= 22.
// Mo hinh "document store": moi collection la cac dong (id, doc JSON).
// Ban production dung Prisma + PostgreSQL voi cung mo hinh du lieu
// (xem prisma/schema.prisma) - tang service/route khong phu thuoc engine.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export class SqliteStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = null;
  }

  async init() {
    if (this.filePath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    }
    this.db = new DatabaseSync(this.filePath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS docs (
      collection TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL,
      PRIMARY KEY (collection, id))`);
  }

  async close() { this.db?.close(); }

  async count(coll) {
    return this.db.prepare('SELECT COUNT(*) AS c FROM docs WHERE collection = ?').get(coll).c;
  }

  async insert(coll, doc) {
    this.db.prepare('INSERT OR REPLACE INTO docs (collection, id, doc) VALUES (?, ?, ?)')
      .run(coll, String(doc.id), JSON.stringify(doc));
    return doc;
  }

  async getAll(coll) {
    return this.db.prepare('SELECT doc FROM docs WHERE collection = ?').all(coll)
      .map((r) => JSON.parse(r.doc));
  }

  async getById(coll, id) {
    const row = this.db.prepare('SELECT doc FROM docs WHERE collection = ? AND id = ?')
      .get(coll, String(id));
    return row ? JSON.parse(row.doc) : null;
  }

  async update(coll, id, patch) {
    const current = await this.getById(coll, id);
    if (!current) return null;
    const next = { ...current, ...patch, id: current.id };
    await this.insert(coll, next);
    return next;
  }

  async remove(coll, id) {
    const info = this.db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?')
      .run(coll, String(id));
    return info.changes > 0;
  }
}
