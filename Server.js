require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy for accurate IP logging behind reverse proxies (Heroku, Render, Nginx)
app.set('trust proxy', 1);

// 1. MIDDLEWARES & SECURITY
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Bhai bohot zyada requests bhej rahe ho, thoda ruko!" }
});

// 2. DATABASE CONFIG & SAFE SCHEMA INITIALIZATION
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false 
});

const initDB = async () => {
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
        console.log("🔥 Fresh DB Table 'users' Active & Safely Linked!");
    } catch (err) {
        console.error("🛑 Critical DB Error during initialization:", err);
    }
};

initDB();

// 3. STATIC & VIEW ROUTES
['Assets', 'css', 'js'].forEach(dir => app.use(`/${dir}`, express.static(path.join(__dirname, dir))));

['/', '/OES'].forEach(route => app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'OES.html'))));
app.get('/form', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));
app.get('/Contact', (req, res) => res.sendFile(path.join(__dirname, 'Contact.html')));

// 4. HELPERS
async function uploadToImgBB(base64Image) {
    if (!process.env.IMGBB_API_KEY) return base64Image;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const body = new URLSearchParams();
        body.append('image', base64Image.replace(/^data:image\/\w+;base64,/, ''));

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
            method: 'POST',
            body: body,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        return data.success ? data.data.url : base64Image;
    } catch (err) {
        console.error("ImgBB Upload Failed or Timed Out, fallback used:", err.message);
        return base64Image;
    }
}

// Strictly converts incoming strings to PostgreSQL ISO DATE format (YYYY-MM-DD)
function sanitizeDobToDateType(dobStr) {
    if (!dobStr) return null;
    let cleanStr = String(dobStr).trim().replace(/\//g, '-');

    // Case 1: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return isNaN(Date.parse(cleanStr)) ? null : cleanStr;
    }

    // Case 2: DDMMYYYY format (15082005 -> 2005-08-15)
    if (/^\d{8}$/.test(cleanStr)) {
        const day = cleanStr.slice(0, 2);
        const month = cleanStr.slice(2, 4);
        const year = cleanStr.slice(4, 8);
        const isoDate = `${year}-${month}-${day}`;
        return isNaN(Date.parse(isoDate)) ? null : isoDate;
    }

    return null;
}

// 5. API ROUTES

// REGISTRATION API
app.post('/api/register', apiLimiter, async (req, res) => {
    const { 
        app_no, roll_no, name, mobile, personal_email, 
        gender, category, dob, exam_password, password, 
        photo_base64, photo_link, mac_address 
    } = req.body;

    if (!app_no || !roll_no || !name || !personal_email || !password) {
        return res.status(400).json({ success: false, error: "Mandatory details missing!" });
    }

    const sanitizedDob = sanitizeDobToDateType(dob);

    try {
        // Duplicate Check
        const dupCheck = await pool.query(
            `SELECT app_no, roll_no, personal_email FROM users WHERE app_no = $1 OR roll_no = $2 OR personal_email = $3`,
            [app_no, roll_no, personal_email]
        );

        if (dupCheck.rows.length > 0) {
            const match = dupCheck.rows[0];
            if (match.app_no === app_no) return res.status(400).json({ success: false, error: "Application Number pehle se registered hai!" });
            if (match.roll_no === roll_no) return res.status(400).json({ success: false, error: "Roll Number pehle se in use hai!" });
            if (match.personal_email === personal_email) return res.status(400).json({ success: false, error: "Email address pehle se registered hai!" });
        }

        // Account Password -> HASHED (bcrypt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const finalPhotoLink = photo_base64 ? await uploadToImgBB(photo_base64) : (photo_link || "Assets/default-avatar.png");
        
        // IP Parsing Safety
        const rawIp = req.headers['x-forwarded-for'];
        const last_login_ip = rawIp ? (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : rawIp[0]) : req.socket.remoteAddress;
        const last_login_device = req.headers['user-agent'] || "Unknown";

        const insertQuery = `
            INSERT INTO users (
                app_no, roll_no, name, mobile, personal_email, 
                gender, category, dob, exam_password, password, 
                photo_link, last_login_ip, last_login_device, mac_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        await pool.query(insertQuery, [
            app_no, 
            roll_no, 
            name, 
            mobile || null, 
            personal_email, 
            gender || null, 
            category || null, 
            sanitizedDob, 
            exam_password || dob || null, 
            hashedPassword,                
            finalPhotoLink, 
            last_login_ip, 
            last_login_device, 
            mac_address || null
        ]);

        res.status(201).json({ 
            success: true, 
            status: "success", 
            message: "Registered successfully! Account verification pending.", 
            photo_link: finalPhotoLink,
            app_no: app_no,
            roll_no: roll_no 
        });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ success: false, error: "Server Error during Registration!" });
    }
});

// 404 FALLBACK
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

app.listen(PORT, () => console.log(`🚀 Registration Web Portal Active on http://localhost:${PORT}`));