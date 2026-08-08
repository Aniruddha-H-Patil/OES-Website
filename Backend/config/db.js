const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

// Dynamic DB Switch: Production par PROD URL, Development par DEV URL
const connectionString = isProduction 
    ? process.env.PROD_DATABASE_URL 
    : process.env.DATABASE_URL;

// Guardrail 1: Check if connectionString is missing BEFORE creating pool
if (!connectionString) {
    console.error("🛑 FATAL ERROR: Database Connection String is missing!");
    console.error(`Check your .env file for ${isProduction ? 'PROD_DATABASE_URL' : 'DATABASE_URL'}`);
}

// Connection Pool Setup
const pool = new Pool({
    connectionString,
    // Production cloud DBs (Supabase/Neon) require SSL connection
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Idle client timeout
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Guardrail 2: Global Pool Error Listener (Server ko unexpected DB drop par crash hone se bachaane ke liye)
pool.on('error', (err) => {
    console.error('🛑 Unexpected Idle PostgreSQL Client Error:', err.message);
});

// Safe Schema Initialization Logic
const initDB = async () => {
    if (!connectionString) return;

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                app_no VARCHAR(50) PRIMARY KEY,
                roll_no VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                personal_email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                mobile VARCHAR(15),
                gender VARCHAR(20),
                category VARCHAR(20),
                dob DATE,
                exam_password VARCHAR(100),
                photo_link TEXT,
                exam_status VARCHAR(20) DEFAULT 'NOT_STARTED',
                score INT DEFAULT 0,
                is_active BOOLEAN DEFAULT FALSE,
                last_seen INT DEFAULT 0,
                mac_address VARCHAR(50),
                last_login_ip VARCHAR(45),
                last_login_device TEXT,
                last_login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(`🔥 DB Table Active & Connected to [${isProduction ? 'SUPABASE CLOUD DB' : 'LOCAL DB'}]!`);
    } catch (err) {
        console.error("🛑 Critical DB Error during initialization:", err.message);
    }
};

module.exports = {
    pool,
    initDB
};