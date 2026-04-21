import sqlite3 from "sqlite3";
import path from "node:path";

const dbPath = path.join(__dirname, "../../database.sqlite");

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to DB", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.all(
    "PRAGMA table_info(users)",
    (err, columns: Array<{ name: string }> = []) => {
      if (err) {
        console.error("Failed to inspect users schema", err);
        return;
      }

      const hasDisplayName = columns.some(
        (column) => column.name === "display_name",
      );

      if (!hasDisplayName) {
        db.run("ALTER TABLE users ADD COLUMN display_name TEXT", (alterErr) => {
          if (alterErr) {
            console.error("Failed to add display_name column", alterErr);
          }
        });
      }
    },
  );
  db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'OPEN',
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);
  db.all(
    "PRAGMA table_info(tasks)",
    (err, columns: Array<{ name: string }> = []) => {
      if (err) {
        console.error("Failed to inspect tasks schema", err);
        return;
      }

      const hasDescription = columns.some(
        (column) => column.name === "description",
      );

      if (!hasDescription) {
        db.run(
          "ALTER TABLE tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''",
          (alterErr) => {
            if (alterErr) {
              console.error("Failed to add description column", alterErr);
            }
          },
        );
      }
    },
  );
});
