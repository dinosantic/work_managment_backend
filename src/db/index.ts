import sqlite3 from "sqlite3";
import path from "node:path";

type TableColumn = {
  name: string;
};

const dbPath = path.join(__dirname, "../../database.sqlite");

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to DB", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

function getColumnNames(columns: TableColumn[]) {
  return new Set(columns.map((column) => column.name));
}

function migrateLegacyTasksTable(columns: TableColumn[]) {
  const columnNames = getColumnNames(columns);

  if (!columnNames.has("user_id")) {
    return;
  }

  const descriptionExpression = columnNames.has("description")
    ? "description"
    : "''";
  const statusExpression = columnNames.has("status") ? "status" : "'OPEN'";
  const priorityExpression = columnNames.has("priority")
    ? "priority"
    : "'MEDIUM'";
  const dueDateExpression = columnNames.has("due_date") ? "due_date" : "NULL";
  const createdByExpression = columnNames.has("created_by")
    ? "COALESCE(created_by, user_id)"
    : "user_id";
  const assigneeExpression = columnNames.has("assignee_user_id")
    ? "COALESCE(assignee_user_id, created_by, user_id)"
    : createdByExpression;

  db.run("ALTER TABLE tasks RENAME TO tasks_legacy", (renameErr) => {
    if (renameErr) {
      console.error("Failed to rename legacy tasks table", renameErr);
      return;
    }

    db.run(
      `
        CREATE TABLE tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'OPEN',
          priority TEXT NOT NULL DEFAULT 'MEDIUM',
          due_date TEXT,
          created_by INTEGER NOT NULL,
          assignee_user_id INTEGER,
          project_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (assignee_user_id) REFERENCES users(id),
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `,
      (createErr) => {
        if (createErr) {
          console.error("Failed to create migrated tasks table", createErr);
          return;
        }

        db.run(
          `
            INSERT INTO tasks (
              id,
              title,
              description,
              status,
              priority,
              due_date,
              created_by,
              assignee_user_id,
              project_id,
              created_at
            )
            SELECT
              id,
              title,
              ${descriptionExpression},
              ${statusExpression},
              ${priorityExpression},
              ${dueDateExpression},
              ${createdByExpression},
              ${assigneeExpression},
              NULL,
              created_at
            FROM tasks_legacy
          `,
          (copyErr) => {
            if (copyErr) {
              console.error(
                "Failed to copy legacy tasks into migrated table",
                copyErr,
              );
              return;
            }

            db.run("DROP TABLE tasks_legacy", (dropErr) => {
              if (dropErr) {
                console.error("Failed to drop legacy tasks table", dropErr);
                return;
              }

              console.log(
                "Migrated legacy tasks table to creator/assignee schema",
              );

              backfillTaskProjects();
            });
          },
        );
      },
    );
  });
}

function backfillTaskProjects() {
  db.all(
    `
      SELECT id, created_by, assignee_user_id
      FROM tasks
      WHERE project_id IS NULL
      ORDER BY created_by ASC, id ASC
    `,
    (
      err,
      rows: Array<{
        id: number;
        created_by: number;
        assignee_user_id: number | null;
      }> = [],
    ) => {
      if (err) {
        console.error("Failed to load tasks for project backfill", err);
        return;
      }

      if (rows.length === 0) {
        return;
      }

      const tasksByCreator = new Map<
        number,
        Array<{ id: number; assignee_user_id: number | null }>
      >();

      for (const row of rows) {
        const creatorTasks = tasksByCreator.get(row.created_by) ?? [];
        creatorTasks.push({
          id: row.id,
          assignee_user_id: row.assignee_user_id,
        });
        tasksByCreator.set(row.created_by, creatorTasks);
      }

      const creators = Array.from(tasksByCreator.entries());

      const processCreator = (index: number) => {
        if (index >= creators.length) {
          console.log("Backfilled task project assignments");
          return;
        }

        const [creatorId, creatorTasks] = creators[index];
        const projectName = `Migrated Tasks - User ${creatorId}`;

        db.get(
          "SELECT id FROM projects WHERE created_by = ? AND name = ?",
          [creatorId, projectName],
          (projectLookupErr, existingProject: { id: number } | undefined) => {
            if (projectLookupErr) {
              console.error(
                "Failed to look up migrated project for creator",
                projectLookupErr,
              );
              return;
            }

            const useProject = (projectId: number) => {
              db.run(
                "INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, 'MANAGER')",
                [projectId, creatorId],
                (creatorMembershipErr) => {
                  if (creatorMembershipErr) {
                    console.error(
                      "Failed to attach creator to migrated project",
                      creatorMembershipErr,
                    );
                    return;
                  }

                  const assigneeIds = Array.from(
                    new Set(
                      creatorTasks
                        .map((task) => task.assignee_user_id)
                        .filter(
                          (assigneeId): assigneeId is number =>
                            assigneeId !== null && assigneeId !== creatorId,
                        ),
                    ),
                  );

                  const attachAssignee = (assigneeIndex: number) => {
                    if (assigneeIndex >= assigneeIds.length) {
                      db.run(
                        "UPDATE tasks SET project_id = ? WHERE created_by = ? AND project_id IS NULL",
                        [projectId, creatorId],
                        (updateErr) => {
                          if (updateErr) {
                            console.error(
                              "Failed to update tasks with migrated project id",
                              updateErr,
                            );
                            return;
                          }

                          processCreator(index + 1);
                        },
                      );
                      return;
                    }

                    db.run(
                      "INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, 'MEMBER')",
                      [projectId, assigneeIds[assigneeIndex]],
                      (assigneeMembershipErr) => {
                        if (assigneeMembershipErr) {
                          console.error(
                            "Failed to attach assignee to migrated project",
                            assigneeMembershipErr,
                          );
                          return;
                        }

                        attachAssignee(assigneeIndex + 1);
                      },
                    );
                  };

                  attachAssignee(0);
                },
              );
            };

            if (existingProject) {
              useProject(existingProject.id);
              return;
            }

            db.run(
              "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)",
              [
                projectName,
                "Auto-created during task-to-project migration",
                creatorId,
              ],
              function (createProjectErr) {
                if (createProjectErr) {
                  console.error(
                    "Failed to create migrated project for creator",
                    createProjectErr,
                  );
                  return;
                }

                useProject(this.lastID);
              },
            );
          },
        );
      };

      processCreator(0);
    },
  );
}

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON", (err) => {
    if (err) {
      console.error("Failed to enable SQLite foreign keys", err);
    }
  });

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
  db.run(
    "UPDATE users SET role = 'ADMIN' WHERE id = ? AND email = ?",
    [2, "admin@mail.com"],
    (err) => {
      if (err) {
        console.error("Failed to promote local admin user", err);
      }
    },
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'OPEN',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    due_date TEXT,
    created_by INTEGER NOT NULL,
    assignee_user_id INTEGER,
    project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assignee_user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);
  db.all("PRAGMA table_info(tasks)", (err, columns: TableColumn[] = []) => {
    if (err) {
      console.error("Failed to inspect tasks schema", err);
      return;
    }

    const columnNames = getColumnNames(columns);

    if (columnNames.has("user_id")) {
      migrateLegacyTasksTable(columns);
      return;
    }

    const hasDescription = columnNames.has("description");

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

    const hasPriority = columnNames.has("priority");

    if (!hasPriority) {
      db.run(
        "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add priority column", alterErr);
          }
        },
      );
    }

    const hasDueDate = columnNames.has("due_date");

    if (!hasDueDate) {
      db.run("ALTER TABLE tasks ADD COLUMN due_date TEXT", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add due_date column", alterErr);
        }
      });
    }

    const hasCreatedBy = columnNames.has("created_by");

    if (!hasCreatedBy) {
      db.run("ALTER TABLE tasks ADD COLUMN created_by INTEGER", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add created_by column", alterErr);
          return;
        }

        db.run(
          "UPDATE tasks SET created_by = user_id WHERE created_by IS NULL",
          (updateErr) => {
            if (updateErr) {
              console.error("Failed to backfill created_by column", updateErr);
            }
          },
        );
      });
    }

    const hasAssigneeUserId = columnNames.has("assignee_user_id");

    if (!hasAssigneeUserId) {
      db.run(
        "ALTER TABLE tasks ADD COLUMN assignee_user_id INTEGER",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add assignee_user_id column", alterErr);
            return;
          }

          db.run(
            "UPDATE tasks SET assignee_user_id = COALESCE(created_by, user_id) WHERE assignee_user_id IS NULL",
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "Failed to backfill assignee_user_id column",
                  updateErr,
                );
              }
            },
          );
        },
      );
    }

    const hasProjectId = columnNames.has("project_id");

    if (!hasProjectId) {
      db.run("ALTER TABLE tasks ADD COLUMN project_id INTEGER", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add project_id column", alterErr);
          return;
        }

        backfillTaskProjects();
      });

      return;
    }

    backfillTaskProjects();
  });
});
