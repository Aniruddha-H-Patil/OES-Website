const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { uploadToImgBB } = require('../utils/imgbb');
const { sanitizeDobToDateType } = require('../utils/helpers');

// Registration Logic
const registerUser = async (req, res) => {
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

        const finalPhotoLink = photo_base64 ? await uploadToImgBB(photo_base64) : (photo_link || "assets/default-avatar.png");
        
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

module.exports = {
    registerUser
};