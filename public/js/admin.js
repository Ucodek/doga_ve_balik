// ===== ADMIN PANEL JS =====
const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let adminCategories = [];
let adminProducts = [];

// ===== AUTH CHECK =====
window.addEventListener('DOMContentLoaded', () => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
        window.location.href = '/login';
        return;
    }

    document.getElementById('adminUserName').textContent = currentUser.fullName;

    loadAdminCategories();
    loadAdminProducts();
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function authHeaders() {
    return {
        'Authorization': `Bearer ${token}`
    };
}

function authJsonHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ===== TAB SWITCHING =====
function switchAdminTab(tab, el) {
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

    el.classList.add('active');

    if (tab === 'products') {
        document.getElementById('tabProducts').classList.add('active');
        loadAdminProducts();
    } else if (tab === 'categories') {
        document.getElementById('tabCategories').classList.add('active');
        loadAdminCategories();
    } else if (tab === 'popular') {
        document.getElementById('tabPopular').classList.add('active');
        loadPopularPanel();
    } else if (tab === 'reviews') {
        document.getElementById('tabReviews').classList.add('active');
        loadAdminReviews();
    }
}

// ===== KATEGORİLER =====
async function loadAdminCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const json = await res.json();
        if (json.success) {
            adminCategories = json.data;
            renderCategoriesTable(json.data);
            populateCategorySelects(json.data);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const flatList = [];
    categories.forEach(cat => {
        flatList.push({ ...cat, parentName: '—' });
        if (cat.subCategories) {
            cat.subCategories.forEach(sub => {
                flatList.push({ ...sub, parentName: cat.name });
            });
        }
    });

    flatList.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cat.id}</td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.parentName}</td>
            <td><span class="table-badge ${cat.isActive ? 'badge-active' : 'badge-inactive'}">${cat.isActive ? 'Aktif' : 'Pasif'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editCategory(${cat.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteCategory(${cat.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateCategorySelects(categories) {
    // Ürün formu kategori seçimi
    const pSelect = document.getElementById('pCategory');
    if (pSelect) {
        pSelect.innerHTML = '<option value="">Seçiniz</option>';
        categories.forEach(cat => {
            pSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            if (cat.subCategories) {
                cat.subCategories.forEach(sub => {
                    pSelect.innerHTML += `<option value="${sub.id}">  ↳ ${sub.name}</option>`;
                });
            }
        });
    }

    // Kategori formu üst kategori seçimi
    const cSelect = document.getElementById('cParent');
    if (cSelect) {
        cSelect.innerHTML = '<option value="">Ana Kategori</option>';
        categories.forEach(cat => {
            cSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
}

// Kategori Modal
function openCategoryModal(cat = null) {
    document.getElementById('categoryModal').classList.add('open');
    document.getElementById('categoryForm').reset();
    document.getElementById('cEditId').value = '';

    if (cat) {
        document.getElementById('categoryModalTitle').textContent = 'Kategori Düzenle';
        document.getElementById('cName').value = cat.name;
        document.getElementById('cParent').value = cat.parentId || '';
        document.getElementById('cIcon').value = cat.icon || 'tent';
        document.getElementById('cEditId').value = cat.id;
    } else {
        document.getElementById('categoryModalTitle').textContent = 'Yeni Kategori Ekle';
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('open');
}

async function editCategory(id) {
    try {
        const res = await fetch(`${API_BASE}/categories/${id}`);
        const json = await res.json();
        if (json.success) {
            openCategoryModal(json.data);
        }
    } catch (e) { console.error(e); }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('categorySaveBtn');
    btn.disabled = true;

    const editId = document.getElementById('cEditId').value;
    const data = {
        name: document.getElementById('cName').value,
        parentId: document.getElementById('cParent').value || null,
        icon: document.getElementById('cIcon').value
    };

    try {
        const url = editId ? `${API_BASE}/categories/${editId}` : `${API_BASE}/categories`;
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: authJsonHeaders(),
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (json.success) {
            closeCategoryModal();
            loadAdminCategories();
            showAdminToast(editId ? 'Kategori güncellendi' : 'Kategori eklendi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
    finally { btn.disabled = false; }
}

async function deleteCategory(id) {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;

    try {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            loadAdminCategories();
            showAdminToast('Kategori silindi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
}

// ===== ÜRÜNLER =====
async function loadAdminProducts() {
    try {
        const res = await fetch(`${API_BASE}/products?limit=100`);
        const json = await res.json();
        if (json.success) {
            adminProducts = json.data;
            renderProductsTable(json.data);
        }
    } catch (e) { console.error(e); }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img class="table-img" src="${p.image || 'https://via.placeholder.com/48'}" alt="${p.name}"></td>
            <td>
                <strong>${p.name}</strong>
                ${p.isPopular ? '<span style="color:#38a169;font-size:11px;margin-left:6px;">🔥 Popüler</span>' : ''}
                ${p.isFeatured ? '<span style="color:#2b6cb0;font-size:11px;margin-left:6px;">⭐ Öne Çıkan</span>' : ''}
            </td>
            <td>${p.category ? p.category.name : '—'}</td>
            <td><strong>${formatPrice(p.price)}₺</strong>${p.oldPrice ? `<br><s style="color:#a0aec0;font-size:12px;">${formatPrice(p.oldPrice)}₺</s>` : ''}</td>
            <td>${p.stock}</td>
            <td><span class="table-badge ${p.isActive ? 'badge-active' : 'badge-inactive'}">${p.isActive ? 'Aktif' : 'Pasif'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Ürün Modal
function openProductModal(product = null) {
    document.getElementById('productModal').classList.add('open');
    document.getElementById('productForm').reset();
    document.getElementById('pEditId').value = '';
    document.getElementById('pCurrentImage').style.display = 'none';
    document.getElementById('pBadgeColor').value = '#e53e3e';

    if (product) {
        document.getElementById('productModalTitle').textContent = 'Ürün Düzenle';
        document.getElementById('pName').value = product.name;
        document.getElementById('pCategory').value = product.categoryId;
        document.getElementById('pDesc').value = product.description || '';
        document.getElementById('pPrice').value = product.price;
        document.getElementById('pOldPrice').value = product.oldPrice || '';
        document.getElementById('pStock').value = product.stock;
        document.getElementById('pBadge').value = product.badge || '';
        document.getElementById('pBadgeColor').value = product.badgeColor || '#e53e3e';
        document.getElementById('pFeatured').checked = product.isFeatured;
        document.getElementById('pPopular').checked = product.isPopular;
        document.getElementById('pEditId').value = product.id;

        if (product.image) {
            document.getElementById('pCurrentImage').style.display = 'flex';
            document.getElementById('pCurrentImagePreview').src = product.image;
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Yeni Ürün Ekle';
    }
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('open');
}

async function editProduct(id) {
    try {
        const res = await fetch(`${API_BASE}/products/${id}`);
        const json = await res.json();
        if (json.success) {
            openProductModal(json.data);
        }
    } catch (e) { console.error(e); }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('productSaveBtn');
    btn.disabled = true;

    const editId = document.getElementById('pEditId').value;
    const fileInput = document.getElementById('pImage');

    const formData = new FormData();
    formData.append('name', document.getElementById('pName').value);
    formData.append('categoryId', document.getElementById('pCategory').value);
    formData.append('description', document.getElementById('pDesc').value);
    formData.append('price', document.getElementById('pPrice').value);
    formData.append('oldPrice', document.getElementById('pOldPrice').value || '');
    formData.append('stock', document.getElementById('pStock').value);
    formData.append('badge', document.getElementById('pBadge').value);
    formData.append('badgeColor', document.getElementById('pBadgeColor').value);
    formData.append('isFeatured', document.getElementById('pFeatured').checked);
    formData.append('isPopular', document.getElementById('pPopular').checked);

    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        const url = editId ? `${API_BASE}/products/${editId}` : `${API_BASE}/products`;
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const json = await res.json();
        if (json.success) {
            closeProductModal();
            loadAdminProducts();
            showAdminToast(editId ? 'Ürün güncellendi' : 'Ürün eklendi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
    finally { btn.disabled = false; }
}

async function deleteProduct(id) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            loadAdminProducts();
            showAdminToast('Ürün silindi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
}

// ===== POPÜLER ÜRÜNLER PANELİ =====
async function loadPopularPanel() {
    try {
        const res = await fetch(`${API_BASE}/products?limit=100`);
        const json = await res.json();
        if (json.success) {
            adminProducts = json.data;
            renderPopularPanel(json.data);
        }
    } catch (e) { console.error(e); }
}

function renderPopularPanel(products) {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(p => {
        const item = document.createElement('div');
        item.className = `popular-item ${p.isPopular ? 'selected' : ''}`;
        item.onclick = () => togglePopular(p.id, !p.isPopular, item);

        item.innerHTML = `
            <div class="popular-item-check"><i class="fas fa-check"></i></div>
            <img src="${p.image || 'https://via.placeholder.com/240x140'}" alt="${p.name}">
            <div class="popular-item-info">
                <p class="popular-item-name">${p.name}</p>
                <span class="popular-item-price">${formatPrice(p.price)}₺</span>
            </div>
        `;
        grid.appendChild(item);
    });
}

async function togglePopular(id, isPopular, element) {
    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: authJsonHeaders(),
            body: JSON.stringify({ isPopular })
        });

        const json = await res.json();
        if (json.success) {
            if (isPopular) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
            showAdminToast(isPopular ? 'Popüler olarak işaretlendi' : 'Popüler listesinden çıkarıldı');
        }
    } catch (e) { console.error(e); }
}

// ===== YORUMLAR =====
async function loadAdminReviews() {
    try {
        const res = await fetch(`${API_BASE}/reviews`, {
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            renderReviewsTable(json.data);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderReviewsTable(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:40px;">Henüz yorum yok</td></tr>';
        return;
    }

    reviews.forEach(r => {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const date = new Date(r.createdAt).toLocaleDateString('tr-TR');
        const productName = r.product ? r.product.name : 'Silinmiş Ürün';
        const productImg = r.product && r.product.image ? r.product.image : 'https://via.placeholder.com/40';
        const userName = r.user ? r.user.fullName : 'Silinmiş Kullanıcı';
        const commentShort = r.comment.length > 80 ? r.comment.substring(0, 80) + '...' : r.comment;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <img class="table-img" src="${productImg}" alt="${productName}">
                    <span style="font-weight:500;font-size:13px;">${productName}</span>
                </div>
            </td>
            <td><strong>${userName}</strong></td>
            <td><span style="color:#f6ad55;font-size:14px;">${stars}</span></td>
            <td style="max-width:250px;font-size:13px;color:#4a5568;" title="${r.comment.replace(/"/g, '&quot;')}">${commentShort}</td>
            <td style="font-size:12px;color:#a0aec0;">${date}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-delete" onclick="deleteReview(${r.id})" title="Yorumu Sil"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteReview(id) {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;

    try {
        const res = await fetch(`${API_BASE}/reviews/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            loadAdminReviews();
            showAdminToast('Yorum silindi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
}

// ===== YARDIMCI =====
function formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function showAdminToast(msg) {
    const toast = document.getElementById('adminToast');
    document.getElementById('adminToastMsg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
