const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');
const Category = require('./Category');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    oldPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'İndirim öncesi fiyat'
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Ana ürün görseli dosya yolu (thumbnail)'
    },
    images: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ürün görselleri (JSON array)',
        get() {
            const raw = this.getDataValue('images');
            if (!raw) return [];
            try { return JSON.parse(raw); } catch(e) { return []; }
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('images', JSON.stringify(val));
            } else {
                this.setDataValue('images', val);
            }
        }
    },
    rating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        defaultValue: 0
    },
    reviewCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    badge: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Ürün rozeti: YENİ, %20 İNDİRİM, TÜKENİYOR, vb.'
    },
    badgeColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#e53e3e',
        comment: 'Rozet arka plan rengi'
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Öne çıkan ürün mü?'
    },
    isPopular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Popüler ürün mü? Admin tarafından seçilir, hero bölümünde gösterilir.'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Categories',
            key: 'id'
        }
    }
}, {
    tableName: 'Products',
    timestamps: true
});

// İlişkiler
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = Product;
