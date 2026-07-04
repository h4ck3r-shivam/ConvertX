import * as SQLite from "expo-sqlite";

const DB_NAME = "convertor_king.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initSchema(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date_created TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      num_files INTEGER NOT NULL DEFAULT 0,
      finished_files INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      output_file_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      local_uri TEXT,
      output_uri TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_job ON files(job_id);
    CREATE INDEX IF NOT EXISTS idx_queue_job ON job_queue(job_id);
  `);
}

// ===== Job Operations =====
export async function insertJob(job: {
  id: string;
  user_id: number;
  date_created: string;
  status: string;
  num_files: number;
  synced?: boolean;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO jobs (id, user_id, date_created, status, num_files, finished_files, synced) VALUES (?, ?, ?, ?, ?, 0, ?)`,
    job.id,
    job.user_id,
    job.date_created,
    job.status,
    job.num_files,
    job.synced ? 1 : 0,
  );
}

export async function getLocalJobs(userId: number): Promise<any[]> {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT * FROM jobs WHERE user_id = ? ORDER BY date_created DESC`,
    userId,
  );
}

export async function getLocalJob(jobId: string): Promise<any | null> {
  const database = await getDb();
  return database.getFirstAsync(`SELECT * FROM jobs WHERE id = ?`, jobId);
}

export async function updateJobStatus(jobId: string, status: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE jobs SET status = ? WHERE id = ?`, status, jobId);
}

export async function deleteLocalJob(jobId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM files WHERE job_id = ?`, jobId);
  await database.runAsync(`DELETE FROM jobs WHERE id = ?`, jobId);
}

// ===== File Operations =====
export async function insertFile(file: {
  job_id: string;
  file_name: string;
  output_file_name?: string;
  status?: string;
  local_uri?: string;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO files (job_id, file_name, output_file_name, status, local_uri) VALUES (?, ?, ?, ?, ?)`,
    file.job_id,
    file.file_name,
    file.output_file_name ?? "",
    file.status ?? "pending",
    file.local_uri ?? "",
  );
}

export async function getLocalFiles(jobId: string): Promise<any[]> {
  const database = await getDb();
  return database.getAllAsync(`SELECT * FROM files WHERE job_id = ?`, jobId);
}

// ===== Queue Operations =====
export async function enqueueSync(jobId: string, action: string, payload: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO job_queue (job_id, action, payload) VALUES (?, ?, ?)`,
    jobId,
    action,
    payload,
  );
}

export async function getQueuedJobs(): Promise<any[]> {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT * FROM job_queue WHERE attempts < max_attempts ORDER BY created_at ASC`,
  );
}

export async function incrementQueueAttempt(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE job_queue SET attempts = attempts + 1 WHERE id = ?`, id);
}

export async function dequeueSync(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM job_queue WHERE id = ?`, id);
}
