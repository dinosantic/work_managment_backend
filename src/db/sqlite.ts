import type sqlite3 from "sqlite3";
import { db } from ".";

type SqlParams = unknown[];

export type SqlRunResult = {
  lastID: number;
  changes: number;
};

export function dbRun(sql: string, params: SqlParams = []) {
  return new Promise<SqlRunResult>((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
}

export function dbGet<T>(sql: string, params: SqlParams = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (err, row: T | undefined) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

export function dbAll<T>(sql: string, params: SqlParams = []) {
  return new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (err, rows: T[]) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}
