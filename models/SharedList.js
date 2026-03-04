const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const SharedList = sequelize.define('SharedList', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Listem',
        comment: 'Liste adı'
    },
    shareCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
        comment: 'Benzersiz paylaşım kodu'
    },
    items: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ürün ID listesi (JSON array)',
        get() {
            const raw = this.getDataValue('items');
            if (!raw) return [];
            try { return JSON.parse(raw); } catch(e) { return []; }
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('items', JSON.stringify(val));
            } else {
                this.setDataValue('items', val);
            }
        }
    }
}, {
    tableName: 'SharedLists',
    timestamps: true
});

module.exports = SharedList;
