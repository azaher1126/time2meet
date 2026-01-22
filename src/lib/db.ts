import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.join(process.cwd(), "time2meet.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    creator_id TEXT,
    share_link TEXT UNIQUE NOT NULL,
    is_private INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS meeting_invites (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    UNIQUE(meeting_id, email)
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    user_id TEXT,
    guest_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability_slots (
    id TEXT PRIMARY KEY,
    response_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_meetings_share_link ON meetings(share_link);
  CREATE INDEX IF NOT EXISTS idx_meetings_creator ON meetings(creator_id);
  CREATE INDEX IF NOT EXISTS idx_responses_meeting ON responses(meeting_id);
  CREATE INDEX IF NOT EXISTS idx_availability_response ON availability_slots(response_id);
  CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(logged_in_at);
`);

// Add is_admin and is_active columns if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
} catch {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`);
} catch {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
} catch {
  // Column already exists
}

// Initialize admin user on startup if no admin exists
function initializeAdminUser() {
  // Check if any admin exists
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE is_admin = 1")
    .get();

  if (existingAdmin) {
    return; // Admin already exists
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn(
      "WARNING: No Admin user exists and ADMIN_EMAIL or ADMIN_PASSWORD was not provided.",
    );
    return; // No admin credentials provided
  }

  // Check if user with admin email already exists
  const existingUser = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(adminEmail) as { id: string } | undefined;

  if (existingUser) {
    // Elevate existing user to admin
    db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(
      existingUser.id,
    );
    console.log(`Elevated existing user ${adminEmail} to admin`);
  } else {
    // Create new admin user
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const userId = uuidv4();

    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, is_admin, is_active) VALUES (?, ?, ?, ?, 1, 1)",
    ).run(userId, adminEmail, "Administrator", hashedPassword);

    console.log(`Created admin user: ${adminEmail}`);
  }
}

// Run admin initialization
initializeAdminUser();

export default db;
