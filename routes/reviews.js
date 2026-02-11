const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/reviews - Tüm yorumları getir (Admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'fullName']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'image']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/reviews/:productId - Ürüne ait yorumları getir
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { productId: req.params.productId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'fullName']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Ortalama puanı hesapla
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

        // Puan dağılımı
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => distribution[r.rating]++);

        res.json({
            success: true,
            data: reviews,
            stats: {
                total: reviews.length,
                average: parseFloat(averageRating),
                distribution
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/reviews/:productId - Yorum ekle (giriş yapmış kullanıcı)
router.post('/:productId', authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;

        if (!rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Puan ve yorum zorunludur'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Puan 1-5 arasında olmalıdır'
            });
        }

        // Ürün var mı kontrol et
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        // Kullanıcı bu ürüne daha önce yorum yapmış mı?
        const existingReview = await Review.findOne({
            where: { productId, userId: req.user.id }
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Bu ürüne zaten yorum yaptınız'
            });
        }

        const review = await Review.create({
            rating: parseInt(rating),
            comment: comment.trim(),
            productId: parseInt(productId),
            userId: req.user.id
        });

        // Ürünün ortalama puanını ve yorum sayısını güncelle
        const allReviews = await Review.findAll({ where: { productId } });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = (totalRating / allReviews.length).toFixed(1);

        await product.update({
            rating: parseFloat(avgRating),
            reviewCount: allReviews.length
        });

        // Kullanıcı bilgisiyle birlikte dön
        const reviewWithUser = await Review.findByPk(review.id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'fullName']
            }]
        });

        res.status(201).json({ success: true, data: reviewWithUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/reviews/:id - Yorum sil (kendi yorumunu veya admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Yorum bulunamadı' });
        }

        // Sadece kendi yorumunu veya admin silebilir
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bu yorumu silme yetkiniz yok' });
        }

        const productId = review.productId;
        await review.destroy();

        // Ürünün ortalama puanını güncelle
        const allReviews = await Review.findAll({ where: { productId } });
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

        await Product.update(
            { rating: parseFloat(avgRating), reviewCount: allReviews.length },
            { where: { id: productId } }
        );

        res.json({ success: true, message: 'Yorum silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
