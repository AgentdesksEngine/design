import postgres from 'postgres';
import { requireSupabaseEnv } from '../env.js';

let sql: postgres.Sql | undefined;

export function db() {
  if (!sql) sql = postgres(requireSupabaseEnv().DATABASE_URL, { prepare: false });
  return sql;
}
