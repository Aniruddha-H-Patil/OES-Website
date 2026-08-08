const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser } = require('../controllers/authController');

// Rate Limiter for Auth Endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Bhai bohot zyada requests bhej rahe ho, thoda ruko!" }
});

// Endpoint Mapping: POST /api/register
router.post('/register', apiLimiter, registerUser);

module.exports = router;