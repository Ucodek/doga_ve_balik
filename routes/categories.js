const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET /api/categories - Tüm kategorileri getir (alt kategorileriyle birlikte)
router.get('/', async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { parentId: null },
            include: [{
                model: Category,
                as: 'subCategories',
                where: { isActive: true },
                required: false
            }],
            order: [['id', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/categories/:id - Tek bir kategori getir
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id, {
            include: [{
                model: Category,
                as: 'subCategories',
                where: { isActive: true },
                required: false
            }]
        });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/categories - Yeni kategori ekle (mobil uygulamadan)
router.post('/', async (req, res) => {
    try {
        const { name, icon, parentId, isActive } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Kategori adı zorunludur' });
        }

        const category = await Category.create({
            name,
            icon: icon || null,
            parentId: parentId || null,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'Bu kategori adı zaten mevcut' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

 // PUT /api/categories/:id - Kategori güncelle (mobil uygulamadan)
router.put('/:id', async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }

        const { name, icon, parentId, isActive } = req.body;
        await category.update({
            name: name || category.name,
            icon: icon !== undefined ? icon : category.icon,
            parentId: parentId !== undefined ? parentId : category.parentId,
            isActive: isActive !== undefined ? isActive : category.isActive
        });

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/categories/:id - Kategori sil
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }
        await category.destroy();
        res.json({ success: true, message: 'Kategori silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
