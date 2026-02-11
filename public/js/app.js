// ===== API BASE URL =====
const API_BASE = '/api';

// ===== STATE =====
let cart = [];
let allProducts = [];
let allCategories = [];
let popularProducts = [];

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

// ===== SAYFA YÜKLENDIĞINDE =====
document.addEventListener('DOMContentLoaded', async () => {
    renderUserArea();
    await loadCategories();
    await Promise.all([loadProducts(), loadPopularProducts()]);
    setupSearch();
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

    categories.forEach((cat, index) => {
        const hasSubCategories = cat.subCategories && cat.subCategories.length > 0;
        const li = document.createElement('li');
        li.className = 'category-item';

        const iconClass = iconMap[cat.icon] || 'fa-folder';

        li.innerHTML = `
            <a class="category-link ${index === 0 ? 'active expanded' : ''}" 
               data-id="${cat.id}" 
               onclick="toggleCategory(this, ${cat.id}, ${hasSubCategories})">
                <span class="cat-icon"><i class="fas ${iconClass}"></i></span>
                <span>${cat.name}</span>
                ${hasSubCategories ? '<span class="cat-arrow"><i class="fas fa-chevron-down"></i></span>' : ''}
            </a>
            ${hasSubCategories ? `
                <ul class="sub-category-list ${index === 0 ? 'open' : ''}">
                    ${cat.subCategories.map(sub => `
                        <li class="sub-category-item">
                            <a class="sub-category-link" onclick="filterByCategory(${sub.id})">${sub.name}</a>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
        `;

        list.appendChild(li);
    });
}

function toggleCategory(element, categoryId, hasSubCategories) {
    // Aktif sınıfını güncelle
    document.querySelectorAll('.category-link').forEach(el => el.classList.remove('active'));
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
        card.onclick = (e) => {
            if (e.target.closest('.add-to-cart-btn')) return;
            window.location.href = `/product/${product.id}`;
        };

        const badgeHtml = product.badge
            ? `<span class="product-badge" style="background: ${product.badgeColor || '#e53e3e'}">${product.badge}</span>`
            : '';

        const oldPriceHtml = product.oldPrice
            ? `<span class="product-old-price">${formatPrice(product.oldPrice)}</span>`
            : '';

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
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id}, event)">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;

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

    // Mevcut ürünlerden filtrele ya da API'den çek
    loadProducts({ categoryId: categoryId });
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

// ===== SEPET =====
function addToCart(productId, event) {
    event.stopPropagation();

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    showToast(`${product.name} sepete eklendi!`);
}

function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = totalItems;
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
    document.addEventListener('click', (e) => {
        const catLink = e.target.closest('.category-link, .sub-category-link');
        if (catLink && window.innerWidth <= 768) {
            setTimeout(closeSidebar, 200);
        }
    });

    // Close sidebar on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
});
