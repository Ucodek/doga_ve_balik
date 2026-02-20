const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require("fs");
let sharp;
try { sharp = require("sharp"); } catch(e) { sharp = null; }

// Multer konfigürasyonu (görsel yükleme)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Sadece görsel dosyaları yükleyebilirsiniz'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/products - Tüm ürünleri getir (filtreleme destekli)
router.get('/', async (req, res) => {
    try {
        const { categoryId, featured, popular, search, limit, offset } = req.query;

        const where = { isActive: true };
        if (categoryId) where.categoryId = categoryId;
        if (featured === 'true') where.isFeatured = true;
        if (popular === 'true') where.isPopular = true;

        if (search) {
            const { Op } = require('sequelize');
            where.name = { [Op.like]: `%${search}%` };
        }

        const products = await Product.findAndCountAll({
            where,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: products.rows,
            total: products.count,
            page: Math.floor((parseInt(offset) || 0) / (parseInt(limit) || 20)) + 1
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/products/:id - Tek bir ürün getir
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }]
        });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/products - Yeni ürün ekle (mobil uygulamadan)
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const {
            name, description, price, oldPrice,
            rating, reviewCount, badge, badgeColor,
            stock, isFeatured, isPopular, categoryId
        } = req.body;

        if (!name || !price || !categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Ürün adı, fiyat ve kategori ID zorunludur'
            });
        }

        // Kategori var mı kontrol et
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(400).json({ success: false, message: 'Geçersiz kategori ID' });
        }

        // Çoklu görsel işleme
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(f => `/uploads/${f.filename}`);
        }

        // Geriye uyumluluk: tek görsel de destekle
        if (req.file) {
            imagePaths = [`/uploads/${req.file.filename}`];
        }

        const product = await Product.create({
            name,
            description: description || null,
            price: parseFloat(price),
            oldPrice: (oldPrice && oldPrice !== '' && !isNaN(parseFloat(oldPrice))) ? parseFloat(oldPrice) : null,
            image: imagePaths.length > 0 ? imagePaths[0] : null,
            images: imagePaths,
            rating: rating ? parseFloat(rating) : 0,
            reviewCount: reviewCount ? parseInt(reviewCount) : 0,
            badge: badge || null,
            badgeColor: badgeColor || '#e53e3e',
            stock: stock ? parseInt(stock) : 0,
            isFeatured: isFeatured === 'true' || isFeatured === true,
            isPopular: isPopular === 'true' || isPopular === true,
            categoryId: parseInt(categoryId)
        });

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/products/:id - Ürün güncelle (mobil uygulamadan)
router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        const {
            name, description, price, oldPrice,
            rating, reviewCount, badge, badgeColor,
            stock, isFeatured, isPopular, isActive, categoryId,
            existingImages, removedImages
        } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price) updateData.price = parseFloat(price);
        if (oldPrice !== undefined) updateData.oldPrice = oldPrice ? parseFloat(oldPrice) : null;
        if (rating !== undefined) updateData.rating = parseFloat(rating);
        if (reviewCount !== undefined) updateData.reviewCount = parseInt(reviewCount);
        if (badge !== undefined) updateData.badge = badge;
        if (badgeColor !== undefined) updateData.badgeColor = badgeColor;
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true' || isFeatured === true;
        if (isPopular !== undefined) updateData.isPopular = isPopular === 'true' || isPopular === true;
        if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
        if (categoryId) updateData.categoryId = parseInt(categoryId);

        // Mevcut görselleri koru, silinen görselleri çıkar, yeni görselleri ekle
        let currentImages = product.images || [];
        
        // existingImages: frontend'den gelen korunacak görseller listesi (JSON string)
        if (existingImages !== undefined) {
            try {
                currentImages = JSON.parse(existingImages);
            } catch(e) {
                currentImages = [];
            }
        }

        // Silinen görselleri dosya sisteminden sil
        if (removedImages) {
            try {
                const removed = JSON.parse(removedImages);
                removed.forEach(imgPath => {
                    const fullPath = path.join(__dirname, '..', imgPath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                });
            } catch(e) { /* ignore */ }
        }

        // Yeni yüklenen görselleri ekle
        if (req.files && req.files.length > 0) {
            const newPaths = req.files.map(f => `/uploads/${f.filename}`);
            currentImages = [...currentImages, ...newPaths];
        }

        updateData.images = currentImages;
        updateData.image = currentImages.length > 0 ? currentImages[0] : null;

        await product.update(updateData);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/products/:id - Ürün sil
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        await product.destroy();
        res.json({ success: true, message: 'Ürün silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
