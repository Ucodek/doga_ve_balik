# Doğa ve Balık - E-Ticaret Web Sitesi

Doğa ve balık temalı e-ticaret web sitesi. Kamp malzemeleri, av malzemeleri ve outdoor ekipmanları.

## Teknolojiler

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Veritabanı:** SQLite (Sequelize ORM)
- **Dosya Yükleme:** Multer

## Kurulum

```bash
npm install
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

## API Endpoints

### Kategoriler
| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/categories` | Tüm kategorileri listele |
| GET | `/api/categories/:id` | Tek kategori getir |
| POST | `/api/categories` | Yeni kategori ekle |
| PUT | `/api/categories/:id` | Kategori güncelle |
| DELETE | `/api/categories/:id` | Kategori sil |

### Ürünler
| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/products` | Tüm ürünleri listele |
| GET | `/api/products?categoryId=1` | Kategoriye göre filtrele |
| GET | `/api/products?featured=true` | Öne çıkan ürünler |
| GET | `/api/products?search=çadır` | Ürün arama |
| GET | `/api/products/:id` | Tek ürün getir |
| POST | `/api/products` | Yeni ürün ekle (multipart/form-data) |
| PUT | `/api/products/:id` | Ürün güncelle |
| DELETE | `/api/products/:id` | Ürün sil |

### Örnek POST İsteği (Mobil Uygulama)

```json
POST /api/products
Content-Type: application/json

{
  "name": "Yeni Ürün",
  "description": "Ürün açıklaması",
  "price": 299.99,
  "categoryId": 1,
  "stock": 50,
  "isFeatured": true
}
```

## Proje Yapısı

```
doga_ve_balik/
├── server.js              # Ana sunucu dosyası
├── database/
│   ├── db.js              # Veritabanı bağlantısı
│   └── seed.js            # Başlangıç verileri
├── models/
│   ├── Category.js        # Kategori modeli
│   └── Product.js         # Ürün modeli
├── routes/
│   ├── categories.js      # Kategori API rotaları
│   └── products.js        # Ürün API rotaları
├── public/
│   ├── index.html         # Ana sayfa
│   ├── css/style.css      # Stiller
│   └── js/app.js          # Frontend JavaScript
└── uploads/               # Yüklenen görseller
```
