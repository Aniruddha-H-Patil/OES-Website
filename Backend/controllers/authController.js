const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { uploadToImgBB } = require('../utils/imgbb');
const { sanitizeDobToDateType } = require('../utils/helpers');

// ==========================================
// 1. REGISTER API (WEB BROWSER - CLEAN)
// ==========================================
const registerUser = async (req, res) => {
    const { 
        app_no, roll_no, name, mobile, personal_email, 
        gender, category, dob, exam_password, password, 
        photo_base64, photo_link 
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

        // Account Password Hashing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const finalPhotoLink = photo_base64 ? await uploadToImgBB(photo_base64) : (photo_link || "assets/default-avatar.png");
        
        // Registration website se hai, so IP, Device, and MAC strictly NULL initially.
        const insertQuery = `
            INSERT INTO users (
                app_no, roll_no, name, mobile, personal_email, 
                gender, category, dob, exam_password, password, 
                photo_link, last_login_ip, last_login_device, mac_address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, NULL)
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
            finalPhotoLink
        ]);

        return res.status(201).json({ 
            success: true, 
            status: "success", 
            message: "Registered successfully! Account verification pending.", 
            photo_link: finalPhotoLink,
            app_no: app_no,
            roll_no: roll_no 
        });

    } catch (err) {
        console.error("Registration Error:", err);
        return res.status(500).json({ success: false, error: "Server Error during Registration!" });
    }
};

// ==========================================
// 2. LOGIN API (DESKTOP APP ONLY)
// ==========================================
const loginUser = async (req, res) => {
    // App direct payload me exact hardware metrics bhejega
    const { app_no, password, mac_address, local_ip, hostname } = req.body;

    if (!app_no || !password) {
        return res.status(400).json({ 
            success: false, 
            error: "Application Number aur Password dono zaroori hain!" 
        });
    }

    try {
        const cleanAppNo = app_no.trim();

        // Query Strictly by Application Number
        const userQuery = `SELECT * FROM users WHERE app_no = $1`;
        const userResult = await pool.query(userQuery, [cleanAppNo]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: "Galat Application Number!" 
            });
        }

        const user = userResult.rows[0];

        // Verify Password (Account Password Hash OR Exam Password)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        const isExamPasswordValid = user.exam_password && (user.exam_password === password);

        if (!isPasswordValid && !isExamPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                error: "Galat Password!" 
            });
        }

        // Processing App Payload for Hardware Specs
        const sysHost = hostname || "Desktop-PC";
        const sysIp = local_ip || req.socket.remoteAddress || "127.0.0.1";
        const sysMac = mac_address || user.mac_address || null;
        const deviceInfoString = `[Desktop App] Host: ${sysHost} | IP: ${sysIp}`;

        // Login ke waqt saari Hardware Details Update hongi
        await pool.query(
            `UPDATE users SET 
                is_active = TRUE, 
                mac_address = $1, 
                last_login_ip = $2, 
                last_login_device = $3, 
                last_login_time = CURRENT_TIMESTAMP 
             WHERE app_no = $4`,
            [sysMac, sysIp, deviceInfoString, user.app_no]
        );

        // Sensitive Fields Cleanup
        delete user.password;
        delete user.exam_password;

        return res.status(200).json({
            success: true,
            message: "Authentication successful!",
            candidate: {
                app_no: user.app_no,
                roll_no: user.roll_no,
                name: user.name,
                personal_email: user.personal_email,
                gender: user.gender,
                category: user.category,
                dob: user.dob,
                photo_link: user.photo_link,
                exam_status: user.exam_status,
                score: user.score,
                is_active: true
            }
        });

    } catch (err) {
        console.error("Login API Error:", err);
        return res.status(500).json({ 
            success: false, 
            error: "Server Error during Authentication!" 
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};