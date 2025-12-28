const { Sequelize } = require('sequelize');

// XAMPP (MySQL) yerine Render uyumlu SQLite ayarı
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', // Veriler bu dosyada tutulacak
    logging: false // Terminali temiz tutmak için logları kapatıyoruz
});

module.exports = sequelize;