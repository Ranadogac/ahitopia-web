// models/index.js
const sequelize = require('../config/db');

// Modelleri İçe Aktar
const User = require('./User');
const Event = require('./Event');
const Order = require('./Order');
const SeatBooking = require('./SeatBooking');
const Review = require('./Review');

// --- İLİŞKİLERİ TANIMLA (ASSOCIATIONS) ---

// 1. Etkinlik ve Koltuklar (1 Etkinlik -> Çok Koltuk)
Event.hasMany(SeatBooking, { foreignKey: 'event_id' });
SeatBooking.belongsTo(Event, { foreignKey: 'event_id' });

// 2. Sipariş ve Etkinlik (1 Sipariş -> 1 Etkinliğe aittir)
Event.hasMany(Order, { foreignKey: 'event_id' });
Order.belongsTo(Event, { foreignKey: 'event_id' });

// 3. Sipariş ve Kullanıcı (Satın Alan)
// Not: Veritabanında ID yerine email üzerinden eşleşme yaptığımız için 'targetKey' kullanıyoruz.
User.hasMany(Order, { foreignKey: 'buyer_email', sourceKey: 'email' });
Order.belongsTo(User, { foreignKey: 'buyer_email', targetKey: 'email', as: 'buyer' }); 
// 'as: buyer' dedik çünkü sipariş detayında 'buyer' ismiyle çağıracağız.

// 4. Etkinlik ve Yorumlar
Event.hasMany(Review, { foreignKey: 'event_id' });
Review.belongsTo(Event, { foreignKey: 'event_id' });

// Hepsini Paketliyoruz
module.exports = {
    sequelize,
    User,
    Event,
    Order,
    SeatBooking,
    Review
};