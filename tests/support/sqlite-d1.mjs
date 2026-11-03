import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function localDatabase(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec(readFileSync(new URL('../../migrations/0001_demo_requests.sql', import.meta.url), 'utf8'));
  return {sqlite, prepare(sql) {
    const statement = (values = []) => ({bind(...args) {return statement(args);},
      async first() {return sqlite.prepare(sql).get(...values) || null;},
      async run() {const result = sqlite.prepare(sql).run(...values); return {success: true, meta: {changes: Number(result.changes)}};}});
    return statement();
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try {const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results;}
    catch (error) {sqlite.exec('ROLLBACK'); throw error;}
  }};
}
