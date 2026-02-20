require('dotenv').config();
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
const corsOptions = process.env.CORS_ORIGIN
    ? { origin: process.env.CORS_ORIGIN.split(','), credentials: true }
    : {};
app.use(cors(corsOptions));
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

        // Products tablosuna images sütunu ekle
        try {
            const productsInfo = await queryInterface.describeTable('Products');
            if (!productsInfo.images) {
                await queryInterface.addColumn('Products', 'images', { type: require('sequelize').DataTypes.TEXT, allowNull: true });
                console.log('Products tablosuna images sütunu eklendi.');
            }
        } catch (e) { /* tablo yoksa sync zaten oluşturur */ }

        console.log('Tablolar senkronize edildi.');

        // Seed data ekle (eğer boşsa)
        await seedDatabase();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
            if (process.env.NODE_ENV === 'production') {
                console.log('Production modunda çalışıyor.');
            }
        });
    } catch (error) {
        console.error('Sunucu başlatılamadı:', error);
    }
}

startServer();
