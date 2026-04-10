// ===== ADMIN PANEL JS =====
const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let adminCategories = [];
let adminProducts = [];
let existingImages = []; // Düzenleme sırasında mevcut görseller
let removedImages = []; // Silinecek görseller
let newImageFiles = []; // Yeni seçilen dosyalar
let existingVideo = null; // Mevcut video yolu
let newVideoFile = null; // Yeni seçilen video dosyası
let removeVideoFlag = false; // Video silme isteği

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
    } else if (tab === 'users') {
        document.getElementById('tabUsers').classList.add('active');
        loadAdminUsers();
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
                ${p.video ? '<span style="color:#2b6cb0;font-size:11px;margin-left:6px;">🎬 Video</span>' : ''}
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
    document.getElementById('pBadgeColor').value = '#e53e3e';
    
    // Çoklu görsel değişkenlerini resetle
    existingImages = [];
    removedImages = [];
    newImageFiles = [];
    existingVideo = null;
    newVideoFile = null;
    removeVideoFlag = false;
    document.getElementById('pImagePreviewContainer').innerHTML = '';
    document.getElementById('pVideoPreviewContainer').innerHTML = '';
    
    // File input'a change event ekle (bir kere)
    const fileInput = document.getElementById('pImage');
    fileInput.value = '';
    fileInput.onchange = handleImageSelect;

    // Video input
    const videoInput = document.getElementById('pVideo');
    videoInput.value = '';
    videoInput.onchange = handleVideoSelect;

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

        // Mevcut görselleri göster
        if (product.images && product.images.length > 0) {
            existingImages = [...product.images];
        } else if (product.image) {
            existingImages = [product.image];
        }
        renderImagePreviews();

        // Mevcut video
        if (product.video) {
            existingVideo = product.video;
            renderVideoPreview();
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Yeni Ürün Ekle';
    }
}

// Yeni görsel seçildiğinde
function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        newImageFiles.push(file);
    });
    renderImagePreviews();
    // Input'u temizle ki aynı dosya tekrar seçilebilsin
    e.target.value = '';
}

// Tüm görsel önizlemelerini render et
function renderImagePreviews() {
    const container = document.getElementById('pImagePreviewContainer');
    container.innerHTML = '';
    let index = 0;

    // Mevcut görseller (sunucudan)
    existingImages.forEach((imgPath, i) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${imgPath}" alt="Görsel ${index + 1}">
            <button type="button" class="img-remove-btn" onclick="removeExistingImage(${i})" title="Görseli Sil">
                <i class="fas fa-times"></i>
            </button>
            <span class="img-order-badge">${index + 1}</span>
        `;
        container.appendChild(item);
        index++;
    });

    // Yeni seçilen görseller
    newImageFiles.forEach((file, i) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        const url = URL.createObjectURL(file);
        item.innerHTML = `
            <img src="${url}" alt="Yeni Görsel ${index + 1}">
            <button type="button" class="img-remove-btn" onclick="removeNewImage(${i})" title="Görseli Kaldır">
                <i class="fas fa-times"></i>
            </button>
            <span class="img-order-badge">${index + 1}</span>
        `;
        container.appendChild(item);
        index++;
    });
}

// Mevcut görseli sil
function removeExistingImage(i) {
    const removed = existingImages.splice(i, 1);
    removedImages.push(...removed);
    renderImagePreviews();
}

// Yeni seçilen görseli kaldır
function removeNewImage(i) {
    newImageFiles.splice(i, 1);
    renderImagePreviews();
}

// ===== VİDEO İŞLEMLERİ =====
function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 100MB limit kontrolü
    if (file.size > 100 * 1024 * 1024) {
        alert('Video dosyası 100MB\'dan büyük olamaz.');
        e.target.value = '';
        return;
    }

    newVideoFile = file;
    removeVideoFlag = false;
    renderVideoPreview();
    e.target.value = '';
}

function renderVideoPreview() {
    const container = document.getElementById('pVideoPreviewContainer');
    container.innerHTML = '';

    let videoSrc = null;
    let label = '';

    if (newVideoFile) {
        videoSrc = URL.createObjectURL(newVideoFile);
        label = newVideoFile.name;
    } else if (existingVideo && !removeVideoFlag) {
        videoSrc = existingVideo;
        label = existingVideo.split('/').pop();
    }

    if (!videoSrc) return;

    container.innerHTML = `
        <div class="video-preview-item">
            <video src="${videoSrc}" class="video-preview-player" controls preload="metadata"></video>
            <div class="video-preview-info">
                <span class="video-preview-name"><i class="fas fa-film"></i> ${label}</span>
                <button type="button" class="img-remove-btn video-remove-btn" onclick="removeVideo()" title="Videoyu Kaldır">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

function removeVideo() {
    newVideoFile = null;
    removeVideoFlag = true;
    document.getElementById('pVideoPreviewContainer').innerHTML = '';
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

    const formData = new FormData();
    formData.append('name', document.getElementById('pName').value);
    formData.append('categoryId', document.getElementById('pCategory').value);
    formData.append('description', document.getElementById('pDesc').value);
    formData.append('price', document.getElementById('pPrice').value);
    const oldPriceVal = document.getElementById('pOldPrice').value;
    if (oldPriceVal && oldPriceVal.trim() !== '') {
        formData.append('oldPrice', oldPriceVal);
    }
    formData.append('stock', document.getElementById('pStock').value);
    formData.append('badge', document.getElementById('pBadge').value);
    formData.append('badgeColor', document.getElementById('pBadgeColor').value);
    formData.append('isFeatured', document.getElementById('pFeatured').checked);
    formData.append('isPopular', document.getElementById('pPopular').checked);

    // Çoklu görsel: yeni dosyaları ekle
    newImageFiles.forEach(file => {
        formData.append('images', file);
    });

    // Video: yeni video dosyası ekle
    if (newVideoFile) {
        formData.append('video', newVideoFile);
    }

    // Düzenleme modunda: mevcut görselleri ve silinen görselleri gönder
    if (editId) {
        formData.append('existingImages', JSON.stringify(existingImages));
        formData.append('removedImages', JSON.stringify(removedImages));
        if (removeVideoFlag) {
            formData.append('removeVideo', 'true');
        }
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:40px;">Henüz yorum yok</td></tr>';
        return;
    }

    reviews.forEach(r => {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const dateObj = new Date(r.createdAt);
        const date = dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
        const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const productName = r.product ? r.product.name : 'Silinmiş Ürün';
        const productImg = r.product && r.product.image ? r.product.image : 'https://via.placeholder.com/40';
        const userName = r.user ? r.user.fullName : 'Silinmiş Kullanıcı';
        const commentShort = r.comment.length > 80 ? r.comment.substring(0, 80) + '...' : r.comment;

        // Admin cevabı
        let replyHtml = '';
        if (r.adminReply) {
            const replyDate = new Date(r.adminReplyAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
            const replyShort = r.adminReply.length > 60 ? r.adminReply.substring(0, 60) + '...' : r.adminReply;
            replyHtml = `<div style="background:#f0fff4;border-radius:6px;padding:8px 10px;font-size:12px;color:#276749;" title="${r.adminReply.replace(/"/g, '&quot;')}">
                <i class="fas fa-reply" style="margin-right:4px;"></i>${replyShort}
                <div style="color:#a0aec0;font-size:11px;margin-top:4px;">${replyDate}</div>
            </div>`;
        } else {
            replyHtml = `<span style="color:#cbd5e0;font-size:12px;font-style:italic;">Cevaplanmadı</span>`;
        }

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
            <td style="font-size:12px;color:#a0aec0;white-space:nowrap;">
                <div>${date}</div>
                <div style="color:#718096;font-weight:500;">${time}</div>
            </td>
            <td style="max-width:200px;">${replyHtml}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick='openReplyModal(${JSON.stringify({id: r.id, comment: r.comment, userName, productName, rating: r.rating, adminReply: r.adminReply || ""}).replace(/'/g, "&#39;")})' title="Cevapla"><i class="fas fa-reply"></i></button>
                    <button class="btn-delete" onclick="deleteReview(${r.id})" title="Yorumu Sil"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== YORUM CEVAP =====
function openReplyModal(reviewData) {
    document.getElementById('replyReviewId').value = reviewData.id;
    document.getElementById('replyText').value = reviewData.adminReply || '';
    const stars = '★'.repeat(reviewData.rating) + '☆'.repeat(5 - reviewData.rating);
    document.getElementById('replyReviewInfo').innerHTML = `
        <div style="margin-bottom:6px;"><strong>${reviewData.userName}</strong> — <span style="color:#f6ad55;">${stars}</span></div>
        <div style="color:#4a5568;"><strong>${reviewData.productName}</strong></div>
        <div style="margin-top:8px;color:#718096;font-style:italic;">"${reviewData.comment.length > 150 ? reviewData.comment.substring(0,150) + '...' : reviewData.comment}"</div>
    `;
    document.getElementById('replyModal').classList.add('open');
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.remove('open');
}

async function submitReply() {
    const reviewId = document.getElementById('replyReviewId').value;
    const reply = document.getElementById('replyText').value.trim();

    if (!reply) {
        alert('Lütfen bir cevap yazın.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/reviews/${reviewId}/reply`, {
            method: 'PUT',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply })
        });
        const json = await res.json();
        if (json.success) {
            closeReplyModal();
            loadAdminReviews();
            showAdminToast('Cevap kaydedildi');
        } else {
            alert(json.message);
        }
    } catch (e) { console.error(e); }
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

// ===== KULLANICILAR =====
async function loadAdminUsers() {
    try {
        const res = await fetch(`${API_BASE}/auth/users`, {
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            renderUsersTable(json.data);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px;">Henüz kayıtlı kullanıcı yok</td></tr>';
        return;
    }

    users.forEach(user => {
        const createdAt = new Date(user.createdAt).toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${user.fullName || '—'}</strong></td>
            <td>${user.email || '—'}</td>
            <td><span class="table-badge ${user.role === 'admin' ? 'badge-active' : 'badge-inactive'}">${user.role === 'admin' ? 'Admin' : 'Kullanıcı'}</span></td>
            <td>${createdAt}</td>
        `;
        tbody.appendChild(tr);
    });
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
