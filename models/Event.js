const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING, // 'official' veya 'secondary'
        defaultValue: 'official'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY, // Sadece tarih (2025-12-25)
        allowNull: false
    },
    time: {
        type: DataTypes.STRING, // Saat (21:00)
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    seller: {
        type: DataTypes.STRING, // Satıcının emaili
        allowNull: false
    },
    organizer_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    }
}, {
    tableName: 'events',
    timestamps: false
});

module.exports = Event;