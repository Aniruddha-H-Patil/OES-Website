const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser } = require('../controllers/authController');

// Rate Limiter for Auth Endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Bhai bohot zyada requests bhej rahe ho, thoda ruko!" }
});

// Endpoint Mapping: POST /api/auth/register (Web Website se aayega)
router.post('/register', apiLimiter, registerUser);

// 2. Endpoint Mapping: POST /api/auth/login (Desktop WinUI 3 App se aayega)
router.post('/login', apiLimiter, loginUser);

module.exports = router;