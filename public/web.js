// =========================================================
// 1. GLOBAL DEĞİŞKENLER VE AYARLAR
// =========================================================

// index.ejs'den gelen verileri alıyoruz
const currentUser = window.serverUser || null;
const eventsDB = window.eventsDB || []; 

const ADMIN_EMAIL = "dogac.rana@ogr.ahievran.edu.tr"; 

// İşlem değişkenleri
let selectedEventId = null;
let selectedSeats = [];
let currentRating = 0;
let cart = []; // EKLENDİ: Sepet dizisi artık tanımlı

// FİLTRE DEĞİŞKENLERİ
let currentFilterType = 'official'; 
let currentCategory = 'all';        
let filterCity = '';                
let filterMaxPrice = null;          

// =========================================================
// 2. SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR (INIT)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- A. ARAYÜZÜ (UI) AYARLA ---
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    const userInitials = document.getElementById('user-initials');
    const createBtn = document.getElementById('create-event-btn');

    if (currentUser) {
        if(guestActions) guestActions.classList.add('hidden');
        if(userActions) userActions.classList.remove('hidden');
        
        if(userInitials && currentUser.name) {
            userInitials.innerText = currentUser.name.charAt(0).toUpperCase();
        } else if (userInitials && currentUser.email) {
            userInitials.innerText = currentUser.email.charAt(0).toUpperCase();
        }

        if (currentUser.role === 'organizer' && createBtn) {
            createBtn.classList.remove('hidden');
        } else if (createBtn) {
            createBtn.classList.add('hidden');
        }

    } else {
        if(guestActions) guestActions.classList.remove('hidden');
        if(userActions) userActions.classList.add('hidden');
        if(createBtn) createBtn.classList.add('hidden');
    }

    // --- B. FONKSİYONLARI BAŞLAT ---
    renderEvents();    
    initSlider();      
    updateCountdown(); 
    initSearch(); 
    initRegisterValidation(); 
    initFilterListeners(); 

    // --- C. FORM DİNLEYİCİLERİ ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if(loginForm) loginForm.addEventListener('submit', handleLogin);
    if(registerForm) registerForm.addEventListener('submit', handleRegister);

    // --- D. URL PARAMETRE KONTROLLERİ ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
        alert("✅ Ödeme Başarılı! Biletleriniz hesabınıza tanımlandı. İyi eğlenceler! 🎉");
        window.history.replaceState({}, document.title, "/");
        cart = [];
        updateCartUI();
    } else if (urlParams.get('status') === 'fail') {
        alert("❌ Ödeme başarısız oldu veya iptal edildi.");
        window.history.replaceState({}, document.title, "/");
    }
});

// =========================================================
// 3. YARDIMCI FONKSİYONLAR
// =========================================================

function handleSessionError(msg) {
    if (msg && (typeof msg === 'string') && (msg.toLowerCase().includes("giriş") || msg.toLowerCase().includes("login"))) {
        alert("Oturum süreniz doldu. Lütfen tekrar giriş yapın.");
        window.location.reload(); 
        return true; 
    }
    return false;
}

window.openLoginModal = function() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    switchAuthMode('login');
}

window.closeAuthModal = function() { 
    document.getElementById('auth-modal').classList.add('hidden'); 
    document.getElementById('overlay').classList.add('hidden'); 
}

window.openCreateModal = function() {
    if (!currentUser) { 
        alert("Etkinlik oluşturmak için giriş yapmalısınız."); 
        window.openLoginModal(); 
        return; 
    }
    document.getElementById('create-event-modal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
}

window.closeCreateModal = function() { 
    document.getElementById('create-event-modal').classList.add('hidden'); 
    document.getElementById('overlay').classList.add('hidden'); 
}

window.closeTicketModal = function() { 
    document.getElementById('ticket-modal').classList.add('hidden'); 
    document.getElementById('overlay').classList.add('hidden'); 
}

window.closePaymentModal = function() {
    document.getElementById('payment-modal').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('iyzico-form-container').innerHTML = ''; // Temizle
}

window.closeAllSidebars = function() {
    document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('sidebar-overlay').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
}

window.toggleSidebar = function(id) { 
    document.getElementById(id).classList.toggle('active'); 
    document.getElementById('sidebar-overlay').classList.remove('hidden'); 
}

document.getElementById('overlay')?.addEventListener('click', () => {
    window.closeAuthModal();
    window.closeCreateModal();
    window.closeTicketModal();
    window.closePaymentModal();
});

window.switchAuthMode = function(mode) {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    if (mode === 'register') { 
        loginContainer.classList.add('hidden'); 
        registerContainer.classList.remove('hidden'); 
    } else { 
        loginContainer.classList.remove('hidden'); 
        registerContainer.classList.add('hidden'); 
    }
}

function initRegisterValidation() {
    const passwordInput = document.querySelector('#register-form input[name="password"]');
    const registerBtn = document.querySelector('#register-btn');
    
    const ruleLength = document.getElementById('rule-length');
    const ruleUpper = document.getElementById('rule-upper');
    const ruleNumber = document.getElementById('rule-number');

    if (!passwordInput || !registerBtn) return;

    registerBtn.disabled = true;
    registerBtn.style.opacity = '0.5';
    registerBtn.style.cursor = 'not-allowed';

    passwordInput.addEventListener('input', function(e) {
        const val = e.target.value;
        const isLengthValid = val.length >= 8;
        updateRuleStyle(ruleLength, isLengthValid);
        const isUpperValid = /[A-Z]/.test(val);
        updateRuleStyle(ruleUpper, isUpperValid);
        const isNumberValid = /\d/.test(val);
        updateRuleStyle(ruleNumber, isNumberValid);

        if (isLengthValid && isUpperValid && isNumberValid) {
            registerBtn.disabled = false;
            registerBtn.style.opacity = '1';
            registerBtn.style.cursor = 'pointer';
            registerBtn.classList.remove('btn-glow'); 
            void registerBtn.offsetWidth; 
            registerBtn.classList.add('btn-glow');
        } else {
            registerBtn.disabled = true;
            registerBtn.style.opacity = '0.5';
            registerBtn.style.cursor = 'not-allowed';
        }
    });

    function updateRuleStyle(element, isValid) {
        const icon = element.querySelector('i');
        if (isValid) {
            element.style.color = '#00ff88'; 
            element.style.fontWeight = 'bold';
            icon.classList.remove('fa-circle-dot');
            icon.classList.add('fa-circle-check');
        } else {
            element.style.color = '#666'; 
            element.style.fontWeight = 'normal';
            icon.classList.remove('fa-circle-check');
            icon.classList.add('fa-circle-dot');
        }
    }
}

// =========================================================
// 4. GİRİŞ / KAYIT / ÇIKIŞ İŞLEMLERİ
// =========================================================

function handleLogin(e) {
    e.preventDefault();
    const email = document.querySelector('#login-form input[name="email"]').value;
    const password = document.querySelector('#login-form input[name="password"]').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("👋 Hoşgeldin!");
            window.location.reload(); 
        } else {
            alert("Hata: " + data.message);
        }
    });
}

function handleRegister(e) {
    e.preventDefault();
    const email = document.querySelector('#register-form input[name="email"]').value;
    const password = document.querySelector('#register-form input[name="password"]').value;
    const role = document.querySelector('#register-form input[name="role"]:checked').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            window.switchAuthMode('login');
        } else {
            alert("Hata: " + data.message);
        }
    });
}

window.logout = function() {
    fetch('/logout')
    .then(() => {
        alert("Çıkış yapıldı.");
        window.location.href = "/";
    });
}

// =========================================================
// 5. ETKİNLİK LİSTELEME
// =========================================================

window.renderEvents = function() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    
    if (!eventsDB || eventsDB.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;">Etkinlik verisi bulunamadı.</p>'; return;
    }

    let filtered = eventsDB.filter(e => {
        const typeMatch = (e.type || 'official') === currentFilterType;
        const catMatch = (currentCategory === 'all') || (e.cat === currentCategory);
        const cityMatch = filterCity === '' || e.loc.toLowerCase().includes(filterCity.toLowerCase());
        const priceMatch = filterMaxPrice === null || parseFloat(e.price) <= parseFloat(filterMaxPrice);
        return typeMatch && catMatch && cityMatch && priceMatch;
    });

    const isDefaultView = (filterCity === '' && filterMaxPrice === null && currentCategory === 'all');
    let infoMessage = "";

    if (isDefaultView) {
        filtered = filtered.slice(0, 8); 
        infoMessage = '<p style="width:100%; text-align:center; color:#666; font-size:0.9rem; margin-bottom:20px;">🔥 En popüler etkinlikler listeleniyor.</p>';
    } else {
        infoMessage = `<p style="width:100%; text-align:center; color:#666; font-size:0.9rem; margin-bottom:20px;">🔍 Kriterlerinize uygun <strong>${filtered.length}</strong> sonuç bulundu.</p>`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="width:100%; text-align:center; padding:40px; color:#aaa;"><i class="fa-solid fa-filter-circle-xmark" style="font-size:2rem; display:block; margin-bottom:10px;"></i>Aradığınız kriterlere uygun etkinlik bulunamadı.</div>';
        return;
    }

    const cardsHTML = filtered.map(e => {
        let deleteBtnHTML = '';
        if (currentUser) {
            const isMyEvent = e.seller === currentUser.email;
            const isAdmin = currentUser.email === ADMIN_EMAIL; 
            if (isMyEvent || isAdmin) deleteBtnHTML = `<button onclick="deleteEvent(${e.id})" class="btn btn-outline" style="width:100%; margin-top:5px; border:1px solid red; color:red;">Sil</button>`;
        }
        
        return `
        <div class="event-card">
            <div class="card-image">
                <span class="tag-resale" style="${e.type === 'secondary' ? 'background:purple' : ''}">
                    ${e.type === 'secondary' ? 'İkinci El' : 'Resmi'}
                </span>
                <img src="${e.img || 'https://placehold.co/600x400'}" onerror="this.src='https://placehold.co/600x400'">
            </div>
            <div class="card-content">
                <h3 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e.title}</h3>
                
                <div style="display:flex; justify-content:space-between; color:#aaa; font-size:0.85rem; margin-bottom:10px;">
                    <span><i class="fa-regular fa-calendar"></i> ${new Date(e.date).toLocaleDateString('tr-TR')}</span>
                    <span style="max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><i class="fa-solid fa-location-dot"></i> ${e.loc}</span>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <p class="price">${e.price}₺</p>
                    <small style="color:#666; font-size:0.75rem;">${e.sold_count || 0} bilet satıldı</small>
                </div>
                
                <button class="btn btn-primary" onclick="openTicketModal(${e.id})" style="width:100%; margin-top:10px;">Bilet Al</button>
                ${deleteBtnHTML}
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = infoMessage + cardsHTML;
}

// =========================================================
// 6. ÖDEME SİMÜLASYONU (IYZICO İPTAL EDİLDİ)
// =========================================================

window.startIyzicoPayment = async function() {
    // Sepet boşsa dur
    if (cart.length === 0) {
        alert("Sepetiniz boş! Lütfen önce bilet ekleyin.");
        return;
    }

    // Kullanıcı kontrolü
    if (!currentUser) {
        alert("Ödeme yapmak için lütfen giriş yapın.");
        window.openLoginModal();
        return;
    }

    // Butonu yükleniyor moduna al
    const btn = document.querySelector('.cart-total + button'); 
    const originalText = btn ? btn.innerHTML : 'Ödemeyi Tamamla';
    if(btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İşleniyor...';
        btn.disabled = true;
    }

    try {
        // Backend'deki simülasyon rotasına istek at
        const response = await fetch('/start-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cartItems: cart,
                user: currentUser 
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Başarılı ise konfetiler patlasın (Opsiyonel: alert yeterli)
            alert("✅ Ödeme Başarılı! (Demo Modu)\nBiletleriniz hesabınıza tanımlandı. İyi eğlenceler! 🎉");
            
            // Sepeti Temizle
            cart = [];
            updateCartUI();
            
            // Sepet Sidebar'ını kapat
            toggleSidebar('cart-sidebar');

            // Sayfayı yenile veya Biletlerim'e yönlendir
            // window.location.href = "/my-tickets"; // İstersen bunu açabilirsin
            window.location.reload(); 
        } else {
            alert('İşlem başarısız: ' + result.errorMessage);
        }

    } catch (err) {
        console.error(err);
        alert('Sunucu hatası oluştu.');
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// =========================================================
// 7. SEPET YÖNETİMİ (CART UI)
// =========================================================

// Koltukları "Satın Al" yerine "Sepete Ekle" yapıyoruz
window.buySeats = function() {
    if (selectedSeats.length === 0) { 
        alert("Lütfen en az bir koltuk seçin."); 
        return; 
    }

    // Etkinlik detaylarını bul
    const event = eventsDB.find(e => e.id === selectedEventId);
    if (!event) return;

    // Seçilen koltukları sepete ekle
    selectedSeats.forEach(seatLabel => {
        // Zaten sepette var mı kontrolü (Basit)
        const exists = cart.find(item => item.id === event.id && item.seatLabel === seatLabel);
        if(!exists) {
            cart.push({
                id: event.id,
                title: event.title,
                price: event.price,
                seatLabel: seatLabel,
                type: 'virtual'
            });
        }
    });

    // Modalı kapat, Sepeti güncelle ve Aç
    closeTicketModal();
    updateCartUI();
    toggleSidebar('cart-sidebar');
    
    // Temizlik
    selectedSeats = [];
}

// Sepet Görünümünü Güncelleme
window.updateCartUI = function() {
    const cartContainer = document.getElementById('cart-items');
    const totalElem = document.getElementById('cart-total-price');
    
    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">Sepetiniz boş.</p>';
        if(totalElem) totalElem.innerText = '0₺';
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cart.map((item, index) => {
        total += parseFloat(item.price);
        return `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <div>
                    <h5 style="margin:0; font-size:0.9rem; color:white;">${item.title}</h5>
                    <small style="color:#aaa;">Koltuk: ${item.seatLabel}</small>
                </div>
                <div style="text-align:right;">
                    <span style="display:block; color:var(--accent);">${item.price}₺</span>
                    <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; font-size:0.8rem; cursor:pointer;">Sil</button>
                </div>
            </div>
        `;
    }).join('');

    if(totalElem) totalElem.innerText = total + '₺';
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// =========================================================
// 8. FİLTRELER VE ARAMA
// =========================================================

function initFilterListeners() {
    const btnFilter = document.getElementById('btn-apply-filter');
    if(btnFilter) {
        btnFilter.addEventListener('click', () => {
            const cityVal = document.getElementById('filter-city').value;
            const priceVal = document.getElementById('filter-price').value;
            const catVal = document.getElementById('filter-category').value;

            filterCity = cityVal.trim();
            filterMaxPrice = priceVal ? parseFloat(priceVal) : null;
            currentCategory = catVal;

            renderEvents();
            document.getElementById('events-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });

            document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
            const activeCard = document.querySelector(`.cat-card[data-cat="${currentCategory}"]`);
            if(activeCard) activeCard.classList.add('active');
        });
    }

    window.clearFilters = function() {
        filterCity = '';
        filterMaxPrice = null;
        currentCategory = 'all';
        
        const elCity = document.getElementById('filter-city');
        const elPrice = document.getElementById('filter-price');
        const elCat = document.getElementById('filter-category');
        
        if(elCity) elCity.value = '';
        if(elPrice) elPrice.value = '';
        if(elCat) elCat.value = 'all';
        
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
        document.querySelector('.cat-card[data-cat="all"]').classList.add('active');

        renderEvents();
    }

    document.querySelectorAll('.cat-card').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('.cat-card').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            currentCategory = c.getAttribute('data-cat');
            const catSelect = document.getElementById('filter-category');
            if(catSelect) catSelect.value = currentCategory;
            renderEvents();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilterType = e.target.getAttribute('data-target');
            renderEvents();
        });
    });
}

window.deleteEvent = function(id) {
    if(!confirm("Silmek istediğine emin misin?")) return;
    fetch(`/delete-event/${id}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => { if(data.success) { alert("Silindi!"); window.location.reload(); } });
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.trim();
        const grid = document.getElementById('events-grid');
        const marketSection = document.getElementById('marketplace');

        if (searchTerm.length > 0 && marketSection) {
            marketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (searchTerm.length === 0) {
            renderEvents(); 
            return;
        }

        fetch(`/search?q=${searchTerm}`)
        .then(res => res.json())
        .then(events => {
            grid.innerHTML = '';
            if (events.length === 0) {
                grid.innerHTML = '<p style="color:#aaa; width:100%; text-align:center; padding: 20px;">Sonuç bulunamadı.</p>';
                return;
            }
            
            grid.innerHTML = events.map(e => `
                <div class="event-card">
                    <div class="card-image">
                        <span class="tag-resale">${e.type === 'secondary' ? 'İkinci El' : 'Resmi'}</span>
                        <img src="${e.img || 'https://placehold.co/600x400'}" onerror="this.src='https://placehold.co/600x400'">
                    </div>
                    <div class="card-content">
                        <h3>${e.title}</h3>
                        <p>${e.price}₺</p>
                        <button class="btn btn-primary" onclick="openTicketModal(${e.id})" style="width:100%">Bilet Al</button>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => console.error("Arama hatası:", err));
    });
}

// =========================================================
// 9. KOLTUK HARİTASI
// =========================================================

window.openTicketModal = function(id) {
    const event = eventsDB.find(e => e.id === id);
    if (!event) return;
    
    selectedEventId = id;
    
    document.getElementById('modal-event-title').innerText = event.title;
    document.getElementById('total-price').innerText = "0₺";
    
    document.getElementById('ticket-modal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');

    loadSeatMap(id, event.price);
    switchModalTab('ticket');
}

window.loadSeatMap = function(eventId, price) {
    const container = document.getElementById('seat-map');
    if(!container) return; 

    container.innerHTML = '<p style="color:#aaa;">Koltuklar yükleniyor...</p>';
    selectedSeats = []; 
    updateSeatUI(price);

    fetch(`/taken-seats/${eventId}`)
    .then(res => res.json())
    .then(takenSeats => {
        container.innerHTML = ''; 
        const rows = ['A', 'B', 'C', 'D', 'E'];
        rows.forEach(row => {
            for(let i=1; i<=8; i++) {
                const seatLabel = `${row}${i}`; 
                const seatDiv = document.createElement('div');
                seatDiv.classList.add('seat');
                
                if (takenSeats.includes(seatLabel)) {
                    seatDiv.classList.add('sold');
                    seatDiv.title = seatLabel + " (Dolu)";
                } else {
                    seatDiv.title = seatLabel;
                    seatDiv.addEventListener('click', () => toggleSeat(seatDiv, seatLabel, price));
                }
                container.appendChild(seatDiv);
            }
        });
    });
}

function toggleSeat(seatDiv, label, price) {
    if (seatDiv.classList.contains('sold')) return; // Doluysa tıklama

    if (seatDiv.classList.contains('selected')) {
        seatDiv.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== label);
    } else {
        seatDiv.classList.add('selected');
        selectedSeats.push(label);
    }
    updateSeatUI(price);
}

function updateSeatUI(price) {
    const count = selectedSeats.length;
    const totalEl = document.getElementById('total-price');
    const displayEl = document.getElementById('selected-seats-display');
    
    if(totalEl) totalEl.innerText = (count * price) + "₺";
    if(displayEl) displayEl.innerText = count > 0 ? selectedSeats.join(', ') : "Yok";
}

// =========================================================
// 10. DİĞER (YORUM, SLIDER, SAYAÇ)
// =========================================================

window.switchModalTab = function(tabName) {
    const tabTicket = document.getElementById('tab-ticket');
    const tabReviews = document.getElementById('tab-reviews');
    const contentTicket = document.getElementById('content-ticket');
    const contentReviews = document.getElementById('content-reviews');

    if (tabName === 'ticket') {
        tabTicket.style.borderBottom = '2px solid var(--primary)';
        tabTicket.style.color = 'white';
        tabReviews.style.borderBottom = 'none';
        tabReviews.style.color = '#888';
        contentTicket.classList.remove('hidden');
        contentReviews.classList.add('hidden');
    } else {
        tabReviews.style.borderBottom = '2px solid var(--primary)';
        tabReviews.style.color = 'white';
        tabTicket.style.borderBottom = 'none';
        tabTicket.style.color = '#888';
        contentTicket.classList.add('hidden');
        contentReviews.classList.remove('hidden');
        loadReviews();
    }
}

window.setRating = function(val) {
    currentRating = val;
    document.querySelectorAll('.star-btn').forEach((star, index) => {
        if (index < val) {
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid');
            star.style.color = 'gold';
        } else {
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
            star.style.color = 'white';
        }
    });
}

window.submitReview = function() {
    if (!currentUser) { alert("Yorum yapmak için giriş yapmalısın."); return; }
    if (currentRating === 0) { alert("Lütfen puan verin."); return; }
    
    const comment = document.getElementById('review-comment').value;

    fetch('/add-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEventId, rating: currentRating, comment: comment })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Yorumun kaydedildi!");
            document.getElementById('review-comment').value = '';
            setRating(0); 
            loadReviews(); 
        } else {
            if (handleSessionError(data.message)) return; 
            alert("Hata: " + data.message);
        }
    });
}

window.loadReviews = function() {
    const list = document.getElementById('reviews-list');
    if(!list) return;
    list.innerHTML = '<p style="color:#666;">Yükleniyor...</p>';

    fetch(`/reviews/${selectedEventId}`)
    .then(res => res.json())
    .then(reviews => {
        if (reviews.length === 0) {
            list.innerHTML = '<p style="color:#666; font-size:0.9rem;">Henüz yorum yok. İlk yorumu sen yap!</p>';
            return;
        }

        list.innerHTML = reviews.map(r => `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong style="color:var(--primary); font-size:0.9rem;">${r.user_name}</strong>
                    <span style="color:gold;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                </div>
                <p style="color:#ddd; font-size:0.9rem;">${r.comment || ''}</p>
                <small style="color:#666; font-size:0.7rem;">${new Date(r.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    });
}

function initSlider() {
    const cards = document.querySelectorAll('.poster-card');
    const bg = document.getElementById('slider-bg-blur');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    
    if (cards.length === 0) return;

    let currentIndex = 0;

    function updateSlider(index) {
        if (index < 0) currentIndex = cards.length - 1;
        else if (index >= cards.length) currentIndex = 0;
        else currentIndex = index;

        cards.forEach(c => c.style.display = 'none'); 

        const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
        const nextIndex = (currentIndex + 1) % cards.length;

        const showCard = (idx, active) => {
            const c = cards[idx];
            c.style.display = 'block';
            c.classList.toggle('active', active);
            c.style.opacity = active ? '1' : '0.5';
            c.style.transform = active ? 'scale(1)' : 'scale(0.85)';
            if(active && bg) {
                const bgImg = c.getAttribute('data-bg');
                if(bgImg) bg.style.backgroundImage = `url('${bgImg}')`;
            }
        };

        showCard(prevIndex, false);
        showCard(currentIndex, true);
        showCard(nextIndex, false);
    }

    updateSlider(0);
    if (nextBtn) nextBtn.onclick = () => updateSlider(currentIndex + 1);
    if (prevBtn) prevBtn.onclick = () => updateSlider(currentIndex - 1);
    setInterval(() => updateSlider(currentIndex + 1), 4000);
}

function updateCountdown() {
    const target = new Date("Dec 31, 2025 00:00:00").getTime();
    setInterval(() => {
        const now = new Date().getTime();
        const gap = target - now;
        const daysEl = document.getElementById('days');
        if(daysEl) daysEl.innerText = Math.floor(gap / (1000 * 60 * 60 * 24));
    }, 1000);
}