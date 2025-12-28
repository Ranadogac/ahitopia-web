// ==========================================
// AHITOPHIA - APP.JS (IYZICO PAYMENT VERSION)
// ==========================================

// 1. GEREKLİ PAKETLER
require('dotenv').config();
const { sequelize, User, Event, Order, SeatBooking, Review } = require('./models'); 
const { Op } = require('sequelize'); 
const QRCode = require('qrcode');
const express = require('express');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const passport = require('passport');
//const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const port = 3000;

// VERİTABANI SENKRONİZASYONU
sequelize.sync({ force: false }).then(() => {
    console.log("✅ Veritabanı tabloları senkronize edildi.");
}).catch(err => {
    console.error("❌ Veritabanı Hatası:", err);
});


// 2. AYARLAR & MIDDLEWARE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli_anahtar',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// 3. PASSPORT GOOGLE STRATEJİSİ
/*passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
      try {
          const email = profile.emails[0].value;
          const googleId = profile.id;
          const name = profile.displayName;

          let user = await User.findOne({ where: { email: email } });

          if (user) {
              return cb(null, user.toJSON());
          } else {
              const newUser = await User.create({
                  email: email,
                  google_id: googleId,
                  name: name,
                  role: 'user',
                  is_verified: true, 
                  is_organizer_approved: true
              });
              return cb(null, newUser.toJSON());
          }
      } catch (err) {
          return cb(err);
      }
  }
));

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((user, done) => { done(null, user); });
*/
// 4. E-POSTA AYARLARI
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 numaralı port için false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Bazen sertifika hatası verirse bunu görmezden gelmesi için
    }
});

// ==========================================
// ROTALAR (ROUTES)
// ==========================================

// --- ANA SAYFA ---
app.get('/', async (req, res, next) => {
    try {
        const events = await Event.findAll({
            attributes: [
                'id', 'title', 'category', 'type', 'price', 'date', 'time', 'location', 'image_url', 'seller',
                [sequelize.fn('COUNT', sequelize.col('SeatBookings.id')), 'sold_count']
            ],
            include: [{
                model: SeatBooking,
                attributes: [] 
            }],
            group: ['Event.id'], 
            order: [
                [sequelize.literal('sold_count'), 'DESC'], 
                ['date', 'ASC'] 
            ],
            raw: true 
        });

        const mappedEvents = events.map(e => ({
            ...e,
            cat: e.category,
            loc: e.location,
            img: e.image_url
        }));

        const currentUser = req.user || req.session.user || null;
        
        res.render('index', { 
            biletler: mappedEvents || [],
            user: currentUser
        });

    } catch (err) {
        console.error("Ana Sayfa Hatası:", err);
        return next(err);
    }
});

// --- SEARCH ---
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    try {
        const results = await Event.findAll({
            where: {
                title: { [Op.like]: `%${query}%` } 
            },
            raw: true
        });

        const mappedResults = results.map(e => ({
            id: e.id,
            title: e.title,
            cat: e.category,
            type: e.type,
            price: e.price,
            date: e.date,
            time: e.time,
            img: e.image_url, 
            seller: e.seller
        }));

        res.json(mappedResults);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- AUTH İŞLEMLERİ ---
/*app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/?error=google_fail' }),
  function(req, res) {
    req.session.user = req.user;
    res.redirect(`/?google_login=true`);
  }
);
*/
app.post('/register', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) return res.json({ success: false, message: 'Bu e-posta zaten kayıtlı.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const token = uuidv4();
        const isApproved = (role === 'organizer') ? false : true; 

        await User.create({
            email: email,
            password: hashedPassword,
            role: role,
            is_verified: false,
            verification_token: token,
            is_organizer_approved: isApproved
        });

        const verifyLink = `http://localhost:3000/verify/${token}`;
        transporter.sendMail({
            from: `"AhiTopia" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Hesap Doğrulama',
            html: `<p>Hesabını doğrula: <a href="${verifyLink}">Doğrula</a></p>`
        }, (mailErr) => {
            if (mailErr) console.error("Mail Hatası:", mailErr);
        });

        res.json({ success: true, message: 'Doğrulama maili gönderildi.' });
    } catch (error) {
        console.error("Register Hatası:", error);
        res.json({ success: false, message: 'Sunucu hatası.' });
    }
});

app.get('/verify/:token', async (req, res) => {
    try {
        const user = await User.findOne({ where: { verification_token: req.params.token } });
        if (user) {
            user.is_verified = true;
            user.verification_token = null; 
            await user.save(); 
            if (user.role === 'organizer') res.redirect('/?status=wait_approval');
            else res.redirect('/?status=verified');
        } else {
            res.redirect('/?status=error');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/?status=error');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email: email } });
        if (user) {
            if (!user.password) return res.json({ success: false, message: 'Lütfen Google ile giriş yapın.' });
            if (!user.is_verified) return res.json({ success: false, message: 'E-posta doğrulanmamış.' });
            if (user.role === 'organizer' && !user.is_organizer_approved) return res.json({ success: false, message: 'Hesap onayı bekleniyor.' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = user.toJSON(); 
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'Şifre yanlış.' });
            }
        } else {
            res.json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Sunucu hatası.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => { res.redirect('/'); });
});


// ==========================================
// 💳 BASİT ÖDEME SİMÜLASYONU (DEMO MODU)
// ==========================================

app.post('/start-payment', async (req, res) => {
    const { cartItems } = req.body;
    const currentUser = req.session.user || req.user;

    // 1. Güvenlik Kontrolleri
    if (!currentUser) return res.json({ status: 'fail', errorMessage: 'Oturum açmalısınız.' });
    if (!cartItems || cartItems.length === 0) return res.json({ status: 'fail', errorMessage: 'Sepet boş.' });

    const t = await sequelize.transaction();

    try {
        // Rastgele bir ödeme ID'si oluştur (Sanki bankadan gelmiş gibi)
        const fakePaymentId = 'DEMO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        // 2. Koltukları 'Dolu' (sold) olarak işaretle
        const bookingData = cartItems.map(item => ({
            event_id: item.id,
            seat_label: item.seatLabel,
            status: 'sold'
        }));
        await SeatBooking.bulkCreate(bookingData, { transaction: t });

        // 3. Etkinlik verilerini çek (Satıcıyı bulmak için)
        const eventIds = [...new Set(cartItems.map(c => c.id))];
        const events = await Event.findAll({ where: { id: eventIds } });

        // 4. Siparişleri Oluştur
        const orderData = cartItems.map(item => {
            const ev = events.find(e => e.id == item.id);
            return {
                buyer_email: currentUser.email,
                payment_id: fakePaymentId,
                event_id: item.id,
                price: item.price,
                seller_email: ev ? ev.seller : 'admin@ahitopia.com',
                status: 'success', // Doğrudan başarılı sayıyoruz
                ticket_code: 'AHI-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                seat_numbers: item.seatLabel
            };
        });

        await Order.bulkCreate(orderData, { transaction: t });

        // İşlemi onayla
        await t.commit();

        // Başarılı cevabı dön
        res.json({ status: 'success' });

    } catch (err) {
        // Hata varsa geri al
        await t.rollback();
        console.error("Demo Ödeme Hatası:", err);
        res.json({ status: 'fail', errorMessage: 'Veritabanı hatası oluştu.' });
    }
});

// --- ETKİNLİK YÖNETİMİ ---
app.post('/add-event', async (req, res) => {
    const currentUser = req.session.user || req.user;
    if (!currentUser) {
        return res.send("<script>alert('Lütfen önce giriş yapın.'); window.location.href='/';</script>");
    }

    const { title, cat, price, date, time, capacity, loc, img } = req.body;

    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    if (!dateRegex.test(date)) {
        return res.send("<script>alert('HATA: Tarih formatı geçersiz! Örn: 25.12.2025'); window.history.back();</script>");
    }
    const [day, month, year] = date.split('.'); 
    const formattedDate = `${year}-${month}-${day}`;

    if (!time) {
        return res.send("<script>alert('HATA: Saat seçiniz.'); window.history.back();</script>");
    }

    try {
        await Event.create({
            title: title,
            description: `Kategori: ${cat}`,
            category: cat, 
            date: formattedDate,
            time: time,
            location: loc,
            price: price,
            capacity: capacity,
            image_url: img,
            organizer_id: currentUser.id,
            seller: currentUser.email
        });

        res.send("<script>alert('Etkinlik başarıyla yayınlandı!'); window.location.href='/';</script>");

    } catch (err) {
        console.error("Etkinlik Ekleme Hatası:", err);
        return res.send(`<script>alert('Veritabanı hatası: ${err.message}'); window.history.back();</script>`);
    }
});

const ADMIN_EMAIL = "dogac.rana@ogr.ahievran.edu.tr"; 

app.post('/delete-event/:id', async (req, res) => {
    if (!req.user && !req.session.user) return res.json({ success: false, message: "Oturum açmalısınız." });

    const eventId = req.params.id;
    const currentUser = req.user || req.session.user;
    const isAdmin = (currentUser.email === ADMIN_EMAIL);

    try {
        const deletedCount = await Event.destroy({
            where: {
                id: eventId,
                [Op.or]: [
                    { seller: currentUser.email },
                    { organizer_id: currentUser.id },
                    isAdmin ? {} : null 
                ].filter(Boolean) 
            }
        });

        if (deletedCount === 0) return res.json({ success: false, message: "Yetkiniz yok." });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Veritabanı hatası." });
    }
});

// --- BİLET İŞLEMLERİ & PDF ---
app.get('/download-ticket/:code', async (req, res) => {
    const ticketCode = req.params.code;

    try {
        const order = await Order.findOne({
            where: { ticket_code: ticketCode },
            include: [
                { model: Event },
                { model: User, as: 'buyer' } 
            ]
        });

        if (!order) return res.status(404).send("Bilet bulunamadı.");

        const ticket = {
            ...order.toJSON(),
            title: order.Event.title,
            date: order.Event.date,
            time: order.Event.time,
            location: order.Event.location,
            buyer_name: order.buyer ? order.buyer.name : 'Misafir',
            buyer_surname: order.buyer ? order.buyer.surname : '',
            ticket_code: order.ticket_code,
            seat_numbers: order.seat_numbers
        };

        const trFix = (text) => {
            if (!text) return "";
            const map = {
                'ğ': 'g', 'Ğ': 'G', 'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I',
                'ü': 'u', 'Ü': 'U', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
            };
            return text.toString().replace(/[ğĞşŞıİüÜöÖçÇ]/g, (char) => map[char]);
        };

        const doc = new PDFDocument({ size: 'A5', margin: 0 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=AhiTopia-${ticketCode}.pdf`);
        doc.pipe(res);

        const colors = { bg: '#0f172a', cardBg: '#1e293b', primary: '#6366f1', accent: '#f59e0b', textWhite: '#f8fafc', textGray: '#94a3b8' };
        const w = doc.page.width; const h = doc.page.height;

        doc.rect(0, 0, w, h).fill(colors.bg);
        doc.rect(0, 0, w, 60).fill(colors.cardBg);
        doc.font('Helvetica-Bold').fontSize(18).fillColor(colors.primary).text('AHITOPIA', 20, 20);
        doc.font('Helvetica').fontSize(10).fillColor(colors.textGray).text('EVENT PASS', w - 100, 25, { align: 'right', width: 80 });

        const contentStart = 90;
        doc.font('Helvetica-Bold').fontSize(22).fillColor(colors.textWhite).text(trFix(ticket.title).toUpperCase(), 20, contentStart, { align: 'left', width: w - 40 });
        doc.rect(20, contentStart + 35, 50, 3).fill(colors.primary);

        const row1 = contentStart + 60;
        doc.font('Helvetica').fontSize(9).fillColor(colors.textGray).text('DATE & TIME', 20, row1);
        doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.textWhite).text(`${new Date(ticket.date).toLocaleDateString('tr-TR')} | ${ticket.time || '21:00'}`, 20, row1 + 15);
        doc.font('Helvetica').fontSize(9).fillColor(colors.textGray).text('LOCATION', 20, row1 + 45);
        doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.textWhite).text(trFix(ticket.location), 20, row1 + 60);

        const boxY = row1 + 100;
        doc.roundedRect(20, boxY, w - 40, 60, 8).fill(colors.cardBg);
        doc.font('Helvetica').fontSize(9).fillColor(colors.textGray).text('GUEST NAME', 35, boxY + 12);
        doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.textWhite).text(trFix(`${ticket.buyer_name} ${ticket.buyer_surname}`).toUpperCase(), 35, boxY + 28);
        doc.font('Helvetica').fontSize(9).fillColor(colors.textGray).text('SEAT / ROW', w - 100, boxY + 12);
        doc.font('Helvetica-Bold').fontSize(16).fillColor(colors.accent).text(ticket.seat_numbers || 'GENEL', w - 100, boxY + 28);

        const qrSectionY = h - 220;
        doc.path(`M 0 ${qrSectionY} L ${w} ${qrSectionY} L ${w} ${h} L 0 ${h} Z`).fill('#ffffff');
        doc.moveTo(0, qrSectionY).lineTo(w, qrSectionY).strokeColor(colors.bg).lineWidth(2).dash(5, { space: 5 }).stroke();
        doc.font('Helvetica').fontSize(10).fillColor('#333').text('SCAN THIS CODE AT THE ENTRANCE', 0, qrSectionY + 20, { align: 'center' });

        try {
            const qrImage = await QRCode.toDataURL(ticket.ticket_code, { width: 400, margin: 1 });
            const qrSize = 120;
            doc.image(qrImage, (w - qrSize) / 2, qrSectionY + 45, { width: qrSize });
            doc.font('Courier-Bold').fontSize(14).fillColor('#000').text(ticket.ticket_code, 0, qrSectionY + 45 + qrSize + 10, { align: 'center', characterSpacing: 3 });
        } catch (error) { doc.fillColor('red').text("QR ERROR", 0, qrSectionY + 60, { align: 'center' }); }

        doc.end();

    } catch (err) {
        console.error("PDF Hatası:", err);
        res.status(500).send("PDF oluşturulurken hata oluştu.");
    }
});

app.get('/taken-seats/:id', async (req, res) => {
    try {
        const seats = await SeatBooking.findAll({
            where: { event_id: req.params.id },
            attributes: ['seat_label']
        });
        res.json(seats.map(s => s.seat_label));
    } catch (err) {
        res.json([]);
    }
});

// --- BİLETLERİM ---
app.get('/my-tickets', async (req, res) => {
    if (!req.user && !req.session.user) return res.redirect('/');
    const currentUser = req.user || req.session.user;

    try {
        const tickets = await Order.findAll({
            where: { buyer_email: currentUser.email },
            include: [{ model: Event }],
            order: [['created_at', 'DESC']]
        });

        const ticketsWithQR = await Promise.all(tickets.map(async (order) => {
            const ticket = order.toJSON();
            const eventData = ticket.Event || {}; 

            const formattedTicket = {
                ...ticket,
                event_title: eventData.title || 'Etkinlik Bilgisi Yok (Silinmiş)',
                event_date: eventData.date || new Date(),
                event_loc: eventData.location || 'Bilinmiyor',
                is_valid_event: !!ticket.Event
            };

            try {
                formattedTicket.qr_url = await QRCode.toDataURL(ticket.ticket_code);
            } catch (e) { formattedTicket.qr_url = ''; }
            
            return formattedTicket;
        }));

        const now = new Date();
        const upcoming = ticketsWithQR.filter(t => new Date(t.event_date) >= now);
        const past = ticketsWithQR.filter(t => new Date(t.event_date) < now);

        res.render('my-tickets', { upcoming, past, user: currentUser });

    } catch (err) {
        console.error("Biletlerim Sayfası Hatası:", err);
        res.render('my-tickets', { upcoming: [], past: [], user: currentUser });
    }
});

// --- YORUMLAR ---
app.post('/add-review', async (req, res) => {
    if (!req.user && !req.session.user) return res.json({ success: false, message: 'Giriş yapmalısın.' });
    const currentUser = req.user || req.session.user;
    const { event_id, rating, comment } = req.body;

    try {
        await Review.create({
            event_id: event_id,
            user_email: currentUser.email,
            user_name: currentUser.name || 'Kullanıcı',
            rating: rating,
            comment: comment
        });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: 'Hata oluştu' });
    }
});

app.get('/reviews/:id', async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { event_id: req.params.id },
            order: [['id', 'DESC']]
        });
        res.json(reviews);
    } catch (err) {
        res.json([]);
    }
});

// --- PROFİL ROTASI ---
app.get('/profile', async (req, res) => {
    if (!req.user && !req.session.user) return res.redirect('/');
    const currentUser = req.user || req.session.user;
    try {
        const user = await User.findOne({ where: { email: currentUser.email } });
        if (!user) return res.redirect('/');
        res.render('profile', { user: user.toJSON() });
    } catch (err) {
        res.redirect('/');
    }
});

// --- ORGANİZATÖR PANELİ ---
app.get('/dashboard', async (req, res) => {
    const currentUser = req.user || req.session.user;
    if (!currentUser) return res.redirect('/');
    if (currentUser.role !== 'organizer') return res.redirect('/profile');

    try {
        const events = await Event.findAll({
            where: { seller: currentUser.email },
            attributes: [
                'id', 'title', 'date', 'capacity', 'price',
                [sequelize.literal(`(
                    SELECT COALESCE(SUM(price), 0) 
                    FROM orders AS o 
                    WHERE o.event_id = Event.id AND o.status = 'success'
                )`), 'revenue'],
                [sequelize.literal(`(
                    SELECT COUNT(*) 
                    FROM seat_bookings AS sb 
                    WHERE sb.event_id = Event.id
                )`), 'sold_count']
            ],
            order: [['date', 'DESC']],
            raw: true
        });

        let totalRevenue = 0;
        let totalTicketsSold = 0;

        events.forEach(ev => {
            ev.revenue = parseFloat(ev.revenue);
            ev.sold_count = parseInt(ev.sold_count);
            totalRevenue += ev.revenue;
            totalTicketsSold += ev.sold_count;
            ev.revenue = ev.revenue.toFixed(2);
        });

        const chartLabels = events.map(e => e.title);
        const chartData = events.map(e => e.revenue);

        res.render('dashboard', { 
            user: currentUser,
            events: events,
            stats: {
                revenue: totalRevenue.toFixed(2),
                sales: totalTicketsSold,
                eventCount: events.length
            },
            chartLabels: JSON.stringify(chartLabels),
            chartData: JSON.stringify(chartData)
        });

    } catch (err) {
        console.error("Dashboard Hatası:", err);
        res.send("Veritabanı hatası");
    }
});

app.get('/dashboard/participants', async (req, res) => {
    const currentUser = req.user || req.session.user;
    if (!currentUser || currentUser.role !== 'organizer') return res.redirect('/');

    try {
        const participants = await Order.findAll({
            include: [
                { 
                    model: Event, 
                    where: { seller: currentUser.email }, 
                    attributes: ['title']
                },
                {
                    model: User,
                    as: 'buyer', 
                    attributes: ['name', 'surname', 'email']
                }
            ],
            where: { status: 'success' },
            order: [['id', 'DESC']]
        });

        const list = participants.map(p => {
            const json = p.toJSON();
            return {
                ticket_code: json.ticket_code,
                seat_numbers: json.seat_numbers,
                price: json.price,
                created_at: json.created_at,
                event_title: json.Event.title,
                buyer_name: json.buyer ? json.buyer.name : '',
                buyer_surname: json.buyer ? json.buyer.surname : '',
                buyer_email: json.buyer ? json.buyer.email : json.buyer_email
            };
        });

        res.render('participants', { user: currentUser, list: list });

    } catch (err) {
        res.redirect('/dashboard');
    }
});

app.get('/verify-ticket', (req, res) => {
    const currentUser = req.user || req.session.user;
    if (!currentUser || currentUser.role !== 'organizer') return res.redirect('/');
    res.render('verify-ticket');
});

app.post('/api/check-ticket', async (req, res) => {
    const { ticketCode } = req.body;
    try {
        const ticket = await Order.findOne({ where: { ticket_code: ticketCode } });
        if (!ticket) {
            return res.json({ status: 'invalid', message: '❌ GEÇERSİZ BİLET!' });
        }
        if (ticket.is_used) {
            return res.json({ 
                status: 'used', 
                message: `⚠️ BU BİLET KULLANILMIŞ!`,
                detail: `İlk giriş: ${ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('tr-TR') : 'Bilinmiyor'}`
            });
        }
        ticket.is_used = true;
        await ticket.save();

        res.json({ 
            status: 'valid', 
            message: '✅ GİRİŞ ONAYLANDI', 
            detail: `Misafir: ${ticket.buyer_email} | Koltuk: ${ticket.seat_numbers || 'Ayakta'}`
        });

    } catch (err) {
        res.json({ status: 'error', message: 'Sunucu hatası' });
    }
});

// ==========================================
// 🔥 GLOBAL HATA YAKALAYICI
// ==========================================
app.use((err, req, res, next) => {
    console.error("🔥🔥 SUNUCUDA KRİTİK HATA:", err.stack);
    res.status(500).send(`
        <h1>Bir şeyler ters gitti! (500 Error)</h1>
        <p>Lütfen terminaldeki hatayı kontrol edin.</p>
        <pre>${err.message}</pre>
        <br>
        <a href="/">Ana Sayfaya Dön</a>
    `);
});
// GÜNCELLENMİŞ ADMIN KONTROL KODU (HATAYI GÖSTEREN VERSİYON)
function adminKontrol(req, res, next) {
    // BURAYA KENDİ MAİLİNİ YAZ (Hepsini küçük harfle yaz) 👇
    const ADMIN_EMAIL = "senin_gercek_mailin@gmail.com"; 

    // 1. Kullanıcı giriş yapmış mı?
    if (!req.isAuthenticated() || !req.user) {
        return res.send("<h1>⛔ Önce Siteye Giriş Yapmalısın!</h1><a href='/login'>Giriş Yap</a>");
    }

    // 2. Mail kontrolü (Büyük küçük harf duyarlılığını kaldırıyoruz)
    // Sistemin gördüğü mail ile senin yazdığın maili kıyaslıyoruz
    const girisYapanMail = req.user.email.trim().toLowerCase();
    const patronMaili = ADMIN_EMAIL.trim().toLowerCase();

    if (girisYapanMail === patronMaili) {
        return next(); // Geçiş izni verildi
    }

    // 3. Eğer eşleşmezse ekrana hatayı bas:
    res.send(`
        <div style="font-family: sans-serif; padding: 50px; text-align: center;">
            <h1 style="color: red;">⛔ Yetkisiz Giriş!</h1>
            <p>Sistem senin mailini şu olarak görüyor: <br> <strong>${req.user.email}</strong></p>
            <hr>
            <p>Ama app.js kodunda izin verilen mail şu: <br> <strong>${ADMIN_EMAIL}</strong></p>
            <hr>
            <h3>Çözüm:</h3>
            <p>Lütfen app.js dosyasındaki <b>ADMIN_EMAIL</b> kısmını, yukarıda koyu renkli yazan mail adresinle BİREBİR aynı yap.</p>
            <a href="/">Ana Sayfaya Dön</a>
        </div>
    `);
}
// ==========================================
app.listen(port, () => {
    console.log(`🚀 AhiTopia Sunucusu Yayında: http://localhost:${port}`);
});
