const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class SeatBooking extends Model {}

SeatBooking.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    seat_label: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'sold'
    }
    // created_at sütununu kaldırdım, timestamps ayarı yönetecek
}, {
    sequelize,
    modelName: 'SeatBooking',
    tableName: 'seat_bookings',
    
    // --- BURASI ÖNEMLİ ---
    timestamps: false // Eğer tablonda created_at de yoksa bunu false yap.
    
    // EĞER tablonda 'created_at' varsa ama 'updated_at' yoksa yukarısı yerine şunu kullan:
    /*
    timestamps: true,
    createdAt: 'created_at', // Veritabanındaki ismi
    updatedAt: false         // updated_at sütunu olmadığı için kapattık
    */
});

module.exports = SeatBooking;
