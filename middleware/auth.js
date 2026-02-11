const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'doga_ve_balik_secret_key_2026';

// Genel authentication kontrolü
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş token' });
    }
}

// Admin kontrolü
function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli' });
    }
    next();
}

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
