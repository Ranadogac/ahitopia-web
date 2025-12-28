const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    buyer_email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    seller_email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    payment_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING, // 'success', 'pending'
        defaultValue: 'pending'
    },
    ticket_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    seat_numbers: {
        type: DataTypes.STRING, // "A1, A2" gibi string tutuyoruz
        allowNull: true
    },
    is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
// ... (Üst kısımlar aynı) ...

}, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    
    // --- BURAYI GÜNCELLE ---
    timestamps: true,        // Zaman damgalarını aç
    createdAt: 'created_at', // Veritabanındaki 'created_at' sütununu kullan
    updatedAt: false         // 'updated_at' sütunu olmadığı için bunu KAPAT
});

module.exports = Order;