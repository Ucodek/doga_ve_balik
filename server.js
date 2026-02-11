const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./database/db');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const seedDatabase = require('./database/seed');
require('./models/Review'); // Review modelini yükle

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Ürün görselleri
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Assets (logo vb.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Giriş sayfası
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ürün detay sayfası
app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// Veritabanı senkronizasyonu ve sunucu başlatma
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Veritabanı bağlantısı başarılı.');

        await sequelize.sync({ force: false });

        // Eksik sütunları ekle (migration)
        const queryInterface = sequelize.getQueryInterface();
        try {
            const tableInfo = await queryInterface.describeTable('Users');
            if (!tableInfo.resetToken) {
                await queryInterface.addColumn('Users', 'resetToken', { type: require('sequelize').DataTypes.STRING, allowNull: true });
            }
            if (!tableInfo.resetTokenExpiry) {
                await queryInterface.addColumn('Users', 'resetTokenExpiry', { type: require('sequelize').DataTypes.DATE, allowNull: true });
            }
        } catch (e) { /* tablo yoksa sync zaten oluşturur */ }
        console.log('Tablolar senkronize edildi.');

        // Seed data ekle (eğer boşsa)
        await seedDatabase();

        app.listen(PORT, '0.0.0.0', () => {
            // Hamachi IP adresini otomatik bul
            const os = require('os');
            const interfaces = os.networkInterfaces();
            let hamachiIP = null;
            for (const [name, addrs] of Object.entries(interfaces)) {
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && addr.address.startsWith('25.')) {
                        hamachiIP = addr.address;
                    }
                }
            }
            console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
            if (hamachiIP) {
                console.log(`Hamachi ile erişim: http://${hamachiIP}:${PORT}`);
            } else {
                console.log('Hamachi ağı bulunamadı. Hamachi açık olduğundan emin olun.');
            }
        });
    } catch (error) {
        console.error('Sunucu başlatılamadı:', error);
    }
}

startServer();
