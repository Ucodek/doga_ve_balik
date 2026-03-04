const express = require('express');
const router = express.Router();
const SharedList = require('../models/SharedList');
const Product = require('../models/Product');
const Category = require('../models/Category');
const crypto = require('crypto');

// Benzersiz paylaşım kodu oluştur (6 karakter, okunabilir)
function generateShareCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Karıştırılabilecek harfleri çıkar (I,O,0,1)
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

// POST /api/lists - Yeni liste oluştur
router.post('/', async (req, res) => {
    try {
        const { name, items } = req.body;

        // Benzersiz shareCode oluştur
        let shareCode;
        let exists = true;
        while (exists) {
            shareCode = generateShareCode();
            exists = await SharedList.findOne({ where: { shareCode } });
        }

        const list = await SharedList.create({
            name: name || 'Listem',
            shareCode,
            items: items || []
        });

        res.status(201).json({
            success: true,
            data: {
                id: list.id,
                name: list.name,
                shareCode: list.shareCode,
                items: list.items,
                createdAt: list.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/lists/:shareCode - Listeyi getir (ürün detaylarıyla birlikte)
router.get('/:shareCode', async (req, res) => {
    try {
        const list = await SharedList.findOne({
            where: { shareCode: req.params.shareCode }
        });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Liste bulunamadı' });
        }

        // Ürün detaylarını getir
        const productIds = list.items || [];
        let products = [];

        if (productIds.length > 0) {
            products = await Product.findAll({
                where: { id: productIds },
                include: [{
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }],
                attributes: ['id', 'name', 'description', 'price', 'oldPrice', 'image', 'rating', 'reviewCount', 'badge', 'badgeColor', 'stock']
            });

            // Orijinal sıraya göre sırala
            products = productIds
                .map(id => products.find(p => p.id === id))
                .filter(Boolean);
        }

        res.json({
            success: true,
            data: {
                id: list.id,
                name: list.name,
                shareCode: list.shareCode,
                items: list.items,
                products: products,
                createdAt: list.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/lists/:shareCode - Listeyi güncelle
router.put('/:shareCode', async (req, res) => {
    try {
        const list = await SharedList.findOne({
            where: { shareCode: req.params.shareCode }
        });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Liste bulunamadı' });
        }

        const { name, items } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (items !== undefined) updateData.items = items;

        await list.update(updateData);

        res.json({
            success: true,
            data: {
                id: list.id,
                name: list.name,
                shareCode: list.shareCode,
                items: list.items
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/lists/:shareCode/add - Listeye ürün ekle
router.post('/:shareCode/add', async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId gerekli' });
        }

        const list = await SharedList.findOne({
            where: { shareCode: req.params.shareCode }
        });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Liste bulunamadı' });
        }

        const currentItems = list.items || [];
        if (currentItems.includes(parseInt(productId))) {
            return res.status(400).json({ success: false, message: 'Ürün zaten listede' });
        }

        currentItems.push(parseInt(productId));
        await list.update({ items: currentItems });

        res.json({
            success: true,
            data: {
                id: list.id,
                shareCode: list.shareCode,
                items: currentItems,
                itemCount: currentItems.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/lists/:shareCode/remove/:productId - Listeden ürün çıkar
router.delete('/:shareCode/remove/:productId', async (req, res) => {
    try {
        const list = await SharedList.findOne({
            where: { shareCode: req.params.shareCode }
        });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Liste bulunamadı' });
        }

        const productId = parseInt(req.params.productId);
        const currentItems = (list.items || []).filter(id => id !== productId);
        await list.update({ items: currentItems });

        res.json({
            success: true,
            data: {
                id: list.id,
                shareCode: list.shareCode,
                items: currentItems,
                itemCount: currentItems.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/lists/:shareCode - Listeyi sil
router.delete('/:shareCode', async (req, res) => {
    try {
        const list = await SharedList.findOne({
            where: { shareCode: req.params.shareCode }
        });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Liste bulunamadı' });
        }

        await list.destroy();
        res.json({ success: true, message: 'Liste silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
