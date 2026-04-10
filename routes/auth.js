const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth');
const { sendResetCode } = require('../utils/mailer');

// POST /api/auth/register - Kayıt ol
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Ad soyad, e-posta ve şifre zorunludur'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Şifre en az 6 karakter olmalıdır'
            });
        }

        // E-posta daha önce kullanılmış mı?
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı'
            });
        }

        const user = await User.create({
            fullName,
            email,
            password,
            role: 'user'
        });

        // Token oluştur
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            data: { user, token }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/login - Giriş yap
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-posta ve şifre zorunludur'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: { user, token }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/auth/me - Mevcut kullanıcı bilgisi
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/auth/users - Admin için kullanıcı listesi
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'fullName', 'email', 'role', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/forgot-password - Şifre sıfırlama kodu gönder
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'E-posta adresi zorunludur'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı'
            });
        }

        // 6 haneli rastgele kod oluştur
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika geçerli

        await user.update({
            resetToken: resetCode,
            resetTokenExpiry: expiry
        });

        console.log(`[Şifre Sıfırlama] ${email} için kod gönderiliyor...`);

        // E-posta ile kodu gönder
        await sendResetCode(email, resetCode);

        console.log(`[Şifre Sıfırlama] ${email} adresine kod gönderildi.`);

        res.json({
            success: true,
            message: 'Sıfırlama kodu e-posta adresinize gönderildi'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/reset-password - Şifreyi sıfırla
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'E-posta, kod ve yeni şifre zorunludur'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az 6 karakter olmalıdır'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        if (!user.resetToken || user.resetToken !== code) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz sıfırlama kodu'
            });
        }

        if (new Date() > new Date(user.resetTokenExpiry)) {
            return res.status(400).json({
                success: false,
                message: 'Sıfırlama kodunun süresi dolmuş. Lütfen yeni kod isteyin.'
            });
        }

        await user.update({
            password: newPassword,
            resetToken: null,
            resetTokenExpiry: null
        });

        res.json({
            success: true,
            message: 'Şifreniz başarıyla değiştirildi'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
