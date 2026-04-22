// ===== API BASE URL =====
const API_BASE = '/api';

// ===== STATE =====
let allProducts = [];
let allCategories = [];
let popularProducts = [];

// ===== LİSTE STATE =====
let myList = JSON.parse(localStorage.getItem('myList') || '[]'); // Ürün ID'leri
let myListShareCode = localStorage.getItem('myListShareCode') || null;

// ===== ICON MAPPING =====
const iconMap = {
    'tent': 'fa-campground',
    'crosshair': 'fa-crosshairs',
    'percent': 'fa-percent',
    'book': 'fa-book-open',
    'flame': 'fa-fire',
    'armchair': 'fa-chair',
    'lightbulb': 'fa-lightbulb',
    'fish': 'fa-fish',
    'knife': 'fa-scissors'
};

function hasValidSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
}

// ===== SAYFA YÜKLENDIĞINDE =====
document.addEventListener('DOMContentLoaded', async () => {
    if (!hasValidSession()) {
        window.location.replace('/login');
        return;
    }

    renderUserArea();
    await loadCategories();

    // Kaydedilmiş kategori varsa onu yükle, yoksa öne çıkan ürünleri göster
    const savedCategoryId = sessionStorage.getItem('selectedCategoryId');
    if (savedCategoryId) {
        await Promise.all([loadProducts({ categoryId: savedCategoryId }), loadPopularProducts()]);
        // Sidebar'da ilgili kategoriyi aktif yap
        restoreActiveCategory(parseInt(savedCategoryId));
        // Başlığı güncelle
        updateSectionTitle(parseInt(savedCategoryId));
    } else {
        await Promise.all([loadProducts({ featured: true }), loadPopularProducts()]);
    }

    setupSearch();

    // Kaydedilmiş scroll pozisyonunu geri yükle
    const savedScroll = sessionStorage.getItem('productsScrollTop');
    if (savedScroll) {
        const grid = document.getElementById('productsGrid');
        if (grid) {
            requestAnimationFrame(() => {
                grid.scrollTop = parseInt(savedScroll);
            });
        }
    }
});

// ===== KULLANICI ALANI =====
function renderUserArea() {
    const userArea = document.getElementById('userArea');
    if (!userArea) return;

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && user) {
        userArea.innerHTML = `
            ${user.role === 'admin' ? `<a href="/admin" class="panel-link"><i class="fas fa-cog"></i> Panel</a>` : ''}
            <div class="user-menu">
                <div class="user-avatar" onclick="toggleUserMenu()">
                    <span class="user-avatar-letter">${user.fullName.charAt(0).toUpperCase()}</span>
                </div>
                <div class="user-dropdown" id="userDropdown">
                    <div class="user-dropdown-header">
                        <strong>${user.fullName}</strong>
                        <span>${user.email}</span>
                    </div>
                    <hr>
                    <a onclick="logoutUser()" class="user-dropdown-item">
                        <i class="fas fa-sign-out-alt"></i> Çıkış Yap
                    </a>
                </div>
            </div>
        `;
    } else {
        userArea.innerHTML = `
            <a href="/login" class="login-btn"><i class="fas fa-user"></i> Giriş Yap</a>
        `;
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

// Sayfa tıklamasında dropdown kapat
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown && !e.target.closest('.user-menu')) {
        dropdown.classList.remove('open');
    }
});

function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// ===== KATEGORİLERİ YÜKLE =====
async function loadCategories(retryCount = 0) {
    const list = document.getElementById('categoryList');
    try {
        if (list && retryCount === 0) list.innerHTML = '<li style="padding:12px;color:#a0aec0;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</li>';
        const res = await fetch(`${API_BASE}/categories`);
        const json = await res.json();

        if (json.success) {
            allCategories = json.data;
            renderCategories(json.data);
        }
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
        if (retryCount < 3) {
            setTimeout(() => loadCategories(retryCount + 1), 2000);
        } else if (list) {
            list.innerHTML = '<li style="padding:12px;color:#e53e3e;"><i class="fas fa-exclamation-circle"></i> Bağlantı hatası. <a href="#" onclick="loadCategories();return false;" style="color:#38a169;">Tekrar dene</a></li>';
        }
    }
}

function renderCategories(categories) {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';

    const savedCategoryId = sessionStorage.getItem('selectedCategoryId');

    // Öne Çıkanlar linki
    const homeLi = document.createElement('li');
    homeLi.className = 'category-item';
    homeLi.innerHTML = `
        <a class="category-link ${!savedCategoryId ? 'active' : ''}" 
           data-id="featured" 
           onclick="showFeatured(this)">
            <span class="cat-icon"><i class="fas fa-star"></i></span>
            <span>Öne Çıkanlar</span>
        </a>
    `;
    list.appendChild(homeLi);

    categories.forEach((cat, index) => {
        const hasSubCategories = cat.subCategories && cat.subCategories.length > 0;
        const li = document.createElement('li');
        li.className = 'category-item';

        const iconClass = iconMap[cat.icon] || 'fa-folder';

        // Kayıtlı kategori yoksa hiçbirini aktif yapma (Öne Çıkanlar zaten aktif)
        const isDefaultActive = false;

        li.innerHTML = `
            <a class="category-link ${isDefaultActive ? 'active expanded' : ''}" 
               data-id="${cat.id}" 
               onclick="toggleCategory(this, ${cat.id}, ${hasSubCategories})">
                <span class="cat-icon"><i class="fas ${iconClass}"></i></span>
                <span>${cat.name}</span>
                ${hasSubCategories ? '<span class="cat-arrow"><i class="fas fa-chevron-down"></i></span>' : ''}
            </a>
            ${hasSubCategories ? `
                <ul class="sub-category-list ${isDefaultActive ? 'open' : ''}">
                    ${cat.subCategories.map(sub => `
                        <li class="sub-category-item">
                            <a class="sub-category-link" data-id="${sub.id}" onclick="filterByCategory(${sub.id})">${sub.name}</a>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
        `;

        list.appendChild(li);
    });
}

// Sayfa yenilendiğinde sidebar'da doğru kategoriyi aktif yap
function restoreActiveCategory(categoryId) {
    // Önce ana kategorilerde ara
    const mainLink = document.querySelector(`.category-link[data-id="${categoryId}"]`);
    if (mainLink) {
        document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active', 'expanded'));
        mainLink.classList.add('active', 'expanded');
        const subList = mainLink.nextElementSibling;
        if (subList && subList.classList.contains('sub-category-list')) {
            subList.classList.add('open');
        }
        return;
    }

    // Alt kategorilerde ara
    const subLink = document.querySelector(`.sub-category-link[data-id="${categoryId}"]`);
    if (subLink) {
        // Üst kategoriyi bul ve aç
        const parentItem = subLink.closest('.category-item');
        if (parentItem) {
            const parentLink = parentItem.querySelector('.category-link');
            if (parentLink) {
                document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active', 'expanded'));
                parentLink.classList.add('active', 'expanded');
                const subList = parentLink.nextElementSibling;
                if (subList) subList.classList.add('open');
            }
        }
        subLink.style.background = 'rgba(56, 161, 105, 0.15)';
        subLink.style.color = '#48bb78';
    }
}

function toggleCategory(element, categoryId, hasSubCategories) {
    // Aktif sınıfını güncelle
    document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sub-category-link').forEach(el => {
        el.style.background = '';
        el.style.color = '';
    });
    element.classList.add('active');

    if (hasSubCategories) {
        element.classList.toggle('expanded');
        const subList = element.nextElementSibling;
        if (subList) {
            subList.classList.toggle('open');
        }
    }

    filterByCategory(categoryId);
}

// ===== POPÜLER ÜRÜNLERİ YÜKLE =====
async function loadPopularProducts(retryCount = 0) {
    try {
        const res = await fetch(`${API_BASE}/products?popular=true`);
        const json = await res.json();

        if (json.success) {
            popularProducts = json.data;
            renderPopularProducts(json.data);
        }
    } catch (error) {
        console.error('Popüler ürünler yüklenemedi:', error);
        if (retryCount < 3) {
            setTimeout(() => loadPopularProducts(retryCount + 1), 2000);
        }
    }
}

function renderPopularProducts(products) {
    const container = document.getElementById('heroPopular');
    if (!container) return;
    container.innerHTML = '';

    if (products.length === 0) return;

    // Dikey yazı etiketi
    const label = document.createElement('div');
    label.className = 'popular-label';
    label.textContent = 'POPÜLER';
    container.appendChild(label);

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'popular-card';
        card.onclick = () => { window.location.href = `/product/${product.id}`; };

        card.innerHTML = `
            <img class="popular-card-img" 
                 src="${product.image || 'https://via.placeholder.com/160x100?text=Ürün'}" 
                 alt="${product.name}"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/160x100?text=Görsel+Yok'">
            <div class="popular-card-info">
                <p class="popular-card-name">${product.name}</p>
                <div class="popular-card-meta">
                    <span class="popular-card-price">${formatPrice(product.price)}₺</span>
                    <span class="popular-card-rating">
                        <i class="fas fa-star star"></i>
                        ${product.rating || 0}
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ===== ÜRÜNLERİ YÜKLE =====
async function loadProducts(params = {}, retryCount = 0) {
    const grid = document.getElementById('productsGrid');
    try {
        if (grid && retryCount === 0) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#a0aec0;"><i class="fas fa-spinner fa-spin" style="font-size:32px;"></i><p style="margin-top:12px;">Ürünler yükleniyor...</p></div>';
        const queryParams = new URLSearchParams(params).toString();
        const url = `${API_BASE}/products${queryParams ? '?' + queryParams : ''}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            allProducts = json.data;
            renderProducts(json.data);
        }
    } catch (error) {
        console.error('Ürünler yüklenemedi:', error);
        if (retryCount < 3) {
            setTimeout(() => loadProducts(params, retryCount + 1), 2000);
        } else if (grid) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#e53e3e;"><i class="fas fa-exclamation-circle" style="font-size:32px;"></i><p style="margin-top:12px;">Sunucuya bağlanılamadı.</p><button onclick="loadProducts()" style="margin-top:8px;padding:8px 16px;background:#38a169;color:white;border:none;border-radius:6px;cursor:pointer;">Tekrar Dene</button></div>';
        }
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #718096;">
                <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 16px; display: block; color: #cbd5e0;"></i>
                <p style="font-size: 16px; font-weight: 500;">Bu kategoride henüz ürün bulunmuyor.</p>
            </div>
        `;
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const badgeHtml = product.badge
            ? `<span class="product-badge" style="background: ${product.badgeColor || '#e53e3e'}">${product.badge}</span>`
            : '';

        const oldPriceHtml = product.oldPrice
            ? `<span class="product-old-price">${formatPrice(product.oldPrice)}</span>`
            : '';

        const inList = myList.includes(product.id);

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img src="${product.image || 'https://via.placeholder.com/400x300?text=Ürün'}" 
                     alt="${product.name}"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x300?text=Görsel+Yok'">
                ${badgeHtml}
            </div>
            <div class="product-info">
                <div class="product-rating">
                    <i class="fas fa-star star"></i>
                    <span class="rating-value">${product.rating || 0}</span>
                    <span class="review-count">(${product.reviewCount || 0})</span>
                </div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-desc">${product.description || ''}</p>
                <div class="product-footer">
                    <div class="product-price-group">
                        ${oldPriceHtml}
                        <span class="product-price">${formatPrice(product.price)}<span class="currency">₺</span></span>
                    </div>
                    <button class="product-add-list-btn ${inList ? 'in-list' : ''}" 
                            data-product-id="${product.id}"
                            title="${inList ? 'Listeden çıkar' : 'Listeye ekle'}">
                        <i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i>
                    </button>
                </div>
            </div>
        `;

        // Listeye ekle butonuna tıklama (event delegation ile)
        const listBtn = card.querySelector('.product-add-list-btn');
        listBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            toggleListItem(product.id, this);
        });

        // Kart tıklama - ürün sayfasına git
        card.addEventListener('click', function() {
            window.location.href = `/product/${product.id}`;
        });

        grid.appendChild(card);
    });
}

// ===== FİLTRELEME =====
function filterByCategory(categoryId) {
    // Alt kategorileri de dahil et
    const category = findCategory(categoryId, allCategories);
    const categoryIds = [categoryId];

    if (category && category.subCategories) {
        category.subCategories.forEach(sub => categoryIds.push(sub.id));
    }

    // Seçilen kategoriyi kaydet
    sessionStorage.setItem('selectedCategoryId', categoryId);
    // Scroll pozisyonunu sıfırla (yeni kategori)
    sessionStorage.removeItem('productsScrollTop');

    // Section başlığını güncelle
    updateSectionTitle(categoryId);

    // Mevcut ürünlerden filtrele ya da API'den çek
    loadProducts({ categoryId: categoryId });
}

// Öne Çıkan Ürünleri Göster
function showFeatured(element) {
    // Aktif sınıfını güncelle
    document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active', 'expanded'));
    document.querySelectorAll('.sub-category-link').forEach(el => {
        el.style.background = '';
        el.style.color = '';
    });
    // Alt kategori listelerini kapat
    document.querySelectorAll('.sub-category-list').forEach(el => el.classList.remove('open'));
    if (element) element.classList.add('active');

    // Session'dan kategori bilgisini temizle
    sessionStorage.removeItem('selectedCategoryId');
    sessionStorage.removeItem('productsScrollTop');

    // Başlığı güncelle
    const titleEl = document.getElementById('sectionTitle');
    const subtitleEl = document.getElementById('sectionSubtitle');
    if (titleEl) titleEl.textContent = 'Öne Çıkan Ürünler';
    if (subtitleEl) subtitleEl.textContent = 'Haftanın en çok tercih edilen ekipmanları';

    // Featured ürünleri yükle
    loadProducts({ featured: true });
}

function openPopularProducts(e) {
    if (e) e.preventDefault();

    // Kategori seçimlerini temizle
    document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active', 'expanded'));
    document.querySelectorAll('.sub-category-link').forEach(el => {
        el.style.background = '';
        el.style.color = '';
    });
    document.querySelectorAll('.sub-category-list').forEach(el => el.classList.remove('open'));

    // Aramayı sıfırla
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // Session filtrelerini temizle
    sessionStorage.removeItem('selectedCategoryId');
    sessionStorage.removeItem('productsScrollTop');

    const titleEl = document.getElementById('sectionTitle');
    const subtitleEl = document.getElementById('sectionSubtitle');
    if (titleEl) titleEl.textContent = 'Popüler Ürünler';
    if (subtitleEl) subtitleEl.textContent = 'Kullanıcıların en çok tercih ettiği ürünler';

    loadProducts({ popular: true });

    const featuredSection = document.querySelector('.featured-section');
    if (featuredSection) {
        featuredSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Section başlığını kategori adına göre güncelle
function updateSectionTitle(categoryId) {
    const titleEl = document.getElementById('sectionTitle');
    const subtitleEl = document.getElementById('sectionSubtitle');
    if (!titleEl) return;

    const category = findCategory(categoryId, allCategories);
    if (category) {
        titleEl.textContent = category.name;
        subtitleEl.textContent = `${category.name} kategorisindeki ürünler`;
    } else {
        // Alt kategorilerde ara (findCategory zaten buluyor)
        titleEl.textContent = 'Ürünler';
        subtitleEl.textContent = '';
    }
}

function findCategory(id, categories) {
    for (const cat of categories) {
        if (cat.id === id) return cat;
        if (cat.subCategories) {
            const found = findCategory(id, cat.subCategories);
            if (found) return found;
        }
    }
    return null;
}

// ===== ARAMA =====
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                loadProducts({ search: query });
            } else {
                loadProducts();
            }
        }, 300);
    });
}

// ===== TOAST BİLDİRİM =====
function showToast(message) {
    // Mevcut toast'ı kaldır
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle toast-icon"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Animasyon ile göster
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 3 saniye sonra kaldır
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== YARDIMCI FONKSİYONLAR =====
function formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// ===== NAVIGATION BUTTONS =====
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const grid = document.getElementById('productsGrid');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            grid.scrollBy({ left: -300, behavior: 'smooth' });
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            grid.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }

    // Scroll pozisyonunu kaydet (sayfa yenilendiğinde geri dönmek için)
    if (grid) {
        let scrollSaveTimer;
        grid.addEventListener('scroll', () => {
            clearTimeout(scrollSaveTimer);
            scrollSaveTimer = setTimeout(() => {
                sessionStorage.setItem('productsScrollTop', grid.scrollTop);
            }, 150);
        });
    }

    // ===== MOBILE SIDEBAR TOGGLE =====
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', openSidebar);
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a category link is clicked on mobile
    // Only close if it's a sub-category or a parent without sub-categories
    document.addEventListener('click', (e) => {
        if (window.innerWidth > 768) return;

        const subLink = e.target.closest('.sub-category-link');
        if (subLink) {
            setTimeout(closeSidebar, 200);
            return;
        }

        const catLink = e.target.closest('.category-link');
        if (catLink) {
            // Alt kategorisi olan parent'a tıklandıysa sidebar açık kalsın
            const hasSubList = catLink.nextElementSibling && catLink.nextElementSibling.classList.contains('sub-category-list');
            if (!hasSubList) {
                setTimeout(closeSidebar, 200);
            }
        }
    });

    // Close sidebar on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    // Liste badge'ini güncelle
    updateListBadge();
});

// ===== LİSTE FONKSİYONLARI =====

// Listeye ekle / çıkar
function toggleListItem(productId, btnElement) {
    const index = myList.indexOf(productId);
    if (index > -1) {
        // Listeden çıkar
        myList.splice(index, 1);
        if (btnElement) {
            btnElement.classList.remove('in-list');
            btnElement.title = 'Listeye ekle';
            btnElement.innerHTML = '<i class="fas fa-plus"></i>';
        }
        showToast('Ürün listeden çıkarıldı');
    } else {
        // Listeye ekle
        myList.push(productId);
        if (btnElement) {
            btnElement.classList.add('in-list');
            btnElement.title = 'Listeden çıkar';
            btnElement.innerHTML = '<i class="fas fa-check"></i>';
        }
        showToast('Ürün listeye eklendi');
    }
    saveListToLocal();
    updateListBadge();
    // Panel açıksa güncelle
    if (document.getElementById('listPanel').classList.contains('open')) {
        renderListPanel();
    }
}

// Local storage'a kaydet
function saveListToLocal() {
    localStorage.setItem('myList', JSON.stringify(myList));
    if (myListShareCode) {
        localStorage.setItem('myListShareCode', myListShareCode);
    }
}

// Badge güncelle
function updateListBadge() {
    const badge = document.getElementById('listBadge');
    if (badge) {
        if (myList.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = myList.length;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Panel aç/kapa
function toggleListPanel() {
    const panel = document.getElementById('listPanel');
    const overlay = document.getElementById('listPanelOverlay');
    if (panel.classList.contains('open')) {
        closeListPanel();
    } else {
        panel.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderListPanel();
    }
}

function closeListPanel() {
    const panel = document.getElementById('listPanel');
    const overlay = document.getElementById('listPanelOverlay');
    panel.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Liste panelini doldur
async function renderListPanel() {
    const body = document.getElementById('listPanelBody');
    const footer = document.getElementById('listPanelFooter');
    const shareResult = document.getElementById('listShareResult');

    if (myList.length === 0) {
        body.innerHTML = `
            <div class="list-panel-empty">
                <i class="fas fa-clipboard-list"></i>
                <p>Listen boş</p>
                <span>Ürünlerdeki <i class="fas fa-plus" style="font-size:10px;"></i> butonuna tıklayarak ürün ekle</span>
            </div>
        `;
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    if (shareResult) shareResult.style.display = 'none';

    // Ürün detaylarını productlardan bul
    const allKnownProducts = [...allProducts, ...popularProducts];
    
    // Bulunamayan ürün ID'lerini tespit et
    const missingIds = myList.filter(id => !allKnownProducts.find(p => p.id === id));
    
    // Bulunamayan ürünler için API'den kontrol et (silindi mi?)
    let deletedIds = [];
    if (missingIds.length > 0) {
        try {
            const checks = await Promise.all(missingIds.map(id =>
                fetch(`/api/products/${id}`).then(r => ({ id, ok: r.ok })).catch(() => ({ id, ok: false }))
            ));
            deletedIds = checks.filter(c => !c.ok).map(c => c.id);
        } catch (e) {
            deletedIds = missingIds;
        }
    }

    let totalPrice = 0;
    let cardsHtml = '';

    myList.forEach(productId => {
        const product = allKnownProducts.find(p => p.id === productId);
        if (product) {
            totalPrice += parseFloat(product.price || 0);
            cardsHtml += `
                <div class="list-item-card">
                    <img class="list-item-img" 
                         src="${product.image || 'https://via.placeholder.com/64x64?text=Ürün'}" 
                         alt="${product.name}"
                         onclick="window.location.href='/product/${product.id}'"
                         onerror="this.src='https://via.placeholder.com/64x64?text=Yok'">
                    <div class="list-item-info">
                        <div class="list-item-name" onclick="window.location.href='/product/${product.id}'">${product.name}</div>
                        <div class="list-item-price">${formatPrice(product.price)}<span class="currency">₺</span></div>
                    </div>
                    <button class="list-item-remove" onclick="removeFromList(${product.id})" title="Çıkar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else if (deletedIds.includes(productId)) {
            // Ürün silindi
            cardsHtml += `
                <div class="list-item-card list-item-deleted">
                    <div class="list-item-deleted-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="list-item-info">
                        <div class="list-item-name" style="color:#c53030;font-size:12px;">Bu ürün satıcı tarafından kaldırıldı</div>
                    </div>
                    <button class="list-item-remove" onclick="removeFromList(${productId})" title="Çıkar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else {
            // Ürün henüz yüklenmemiş, basit göster
            cardsHtml += `
                <div class="list-item-card">
                    <img class="list-item-img" src="https://via.placeholder.com/64x64?text=..." alt="Yükleniyor">
                    <div class="list-item-info">
                        <div class="list-item-name" style="color:var(--text-light)">Ürün #${productId}</div>
                        <div class="list-item-price" style="color:var(--text-light)">...</div>
                    </div>
                    <button class="list-item-remove" onclick="removeFromList(${productId})" title="Çıkar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    });

    body.innerHTML = cardsHtml;
    document.getElementById('listTotalPrice').textContent = formatPrice(totalPrice) + '₺';

    // Share butonunu aktifle 
    const shareBtn = document.getElementById('listShareBtn');
    if (shareBtn) shareBtn.disabled = false;
}

// Listeden ürün çıkar
function removeFromList(productId) {
    myList = myList.filter(id => id !== productId);
    saveListToLocal();
    updateListBadge();
    renderListPanel();

    // Ürün kartındaki butonu güncelle
    const btns = document.querySelectorAll('.product-add-list-btn');
    btns.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(`toggleListItem(${productId}`)) {
            btn.classList.remove('in-list');
            btn.title = 'Listeye ekle';
            btn.innerHTML = '<i class="fas fa-plus"></i>';
        }
    });

    showToast('Ürün listeden çıkarıldı');
}

// Listeyi paylaş (API'ye gönder)
async function shareList() {
    if (myList.length === 0) return;

    const shareBtn = document.getElementById('listShareBtn');
    const shareResult = document.getElementById('listShareResult');
    const listName = document.getElementById('listNameInput').value.trim() || 'Listem';

    shareBtn.disabled = true;
    shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...';

    try {
        let shareCode = myListShareCode;

        if (shareCode) {
            // Mevcut listeyi güncelle
            const res = await fetch(`${API_BASE}/lists/${shareCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: listName, items: myList })
            });
            const json = await res.json();
            if (!json.success) {
                // Eski kod geçersiz, yeni oluştur
                shareCode = null;
            }
        }

        if (!shareCode) {
            // Yeni liste oluştur
            const res = await fetch(`${API_BASE}/lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: listName, items: myList })
            });
            const json = await res.json();
            if (json.success) {
                shareCode = json.data.shareCode;
                myListShareCode = shareCode;
                localStorage.setItem('myListShareCode', shareCode);
            } else {
                throw new Error(json.message);
            }
        }

        // Link'i göster
        const shareUrl = `${window.location.origin}/liste/${shareCode}`;
        document.getElementById('shareLink').value = shareUrl;
        shareResult.style.display = 'block';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Listeyi Güncelle & Paylaş';
        shareBtn.disabled = false;

        showToast('Paylaşım linki oluşturuldu!');
    } catch (error) {
        console.error('Liste paylaşma hatası:', error);
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Listeyi Paylaş';
        shareBtn.disabled = false;
        showToast('Bir hata oluştu, tekrar deneyin');
    }
}

// Paylaşım linkini kopyala
function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    if (!linkInput) return;
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showToast('Link kopyalandı!');
    }).catch(() => {
        linkInput.select();
        document.execCommand('copy');
        showToast('Link kopyalandı!');
    });
}

// WhatsApp ile paylaş
function shareViaWhatsApp() {
    const linkInput = document.getElementById('shareLink');
    if (!linkInput || !linkInput.value) return;
    const listName = document.getElementById('listNameInput').value.trim() || 'Listem';
    const url = encodeURIComponent(linkInput.value);
    const text = encodeURIComponent(`${listName} - Ürün listeme göz at!`);
    const whatsappNumber = '905304064702'; // 0530 406 47 02
    window.open(`https://wa.me/${whatsappNumber}?text=${text}%20${url}`, '_blank');
}
