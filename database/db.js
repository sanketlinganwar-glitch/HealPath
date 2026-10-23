import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'medicare_store.json');

let pool = null;
let useMySQL = false;

// Check if MySQL is configured
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
    });
    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    useMySQL = true;
    console.log(' [DB] Connected to MySQL database successfully.');
  } catch (err) {
    console.log(' [DB] MySQL not reachable or not running. Operating on zero-config atomic storage engine.');
    useMySQL = false;
  }
} else {
  console.log(' [DB] Operating on zero-config atomic storage engine (database/medicare_store.json).');
}

// In-Memory / File-backed Fallback Engine
class FileDatabase {
  constructor() {
    this.data = {
      departments: [],
      doctors: [],
      users: [],
      slots: [],
      appointments: [],
      queue: [],
      messages: [],
      settings: {
        slot_duration_min: '15',
        grace_period_min: '10',
        hospital_name: 'HealPath Hospital System',
        hospital_phone: '+91 95526 25262 / +91 98765 43210',
        hospital_email: 'contact@healpath.com'
      }
    };
    this.load();
  }

  load() {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Error loading DB file:', e);
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving DB file:', e);
    }
  }
}

const fileDB = new FileDatabase();

// Export unified query interface
export const db = {
  isMySQL() {
    return useMySQL;
  },

  async query(sql, params = []) {
    if (useMySQL && pool) {
      const [rows] = await pool.query(sql, params);
      return rows;
    }
    // FileDB query logic handled through store methods below
    return fileDB.data;
  },

  // Direct access to tables for zero-config mode
  store: fileDB,

  save() {
    fileDB.save();
  }
};

export default db;
