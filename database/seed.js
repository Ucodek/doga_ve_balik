const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');

async function seedDatabase() {
    try {
        const categoryCount = await Category.count();
        if (categoryCount > 0) {
            console.log('Veritabanında zaten veri var, seed atlanıyor.');
            return;
        }

        console.log('Seed verileri ekleniyor...');

        // Ana Kategoriler
        const kampMalzemeleri = await Category.create({
            name: 'Kamp Malzemeleri',
            icon: 'tent',
            parentId: null
        });

        const avMalzemeleri = await Category.create({
            name: 'Av Malzemeleri',
            icon: 'crosshair',
            parentId: null
        });

        const indirimler = await Category.create({
            name: 'İndirimler',
            icon: 'percent',
            parentId: null
        });

        const blog = await Category.create({
            name: 'Blog',
            icon: 'book',
            parentId: null
        });

        // Alt Kategoriler - Kamp Malzemeleri
        const ocakEkipmanlari = await Category.create({
            name: 'Ocak Ekipmanları',
            icon: 'flame',
            parentId: kampMalzemeleri.id
        });

        const kampSandalyeleri = await Category.create({
            name: 'Kamp Sandalyeleri',
            icon: 'armchair',
            parentId: kampMalzemeleri.id
        });

        const kafaLambalari = await Category.create({
            name: 'Kafa Lambaları',
            icon: 'lightbulb',
            parentId: kampMalzemeleri.id
        });

        // Alt Kategoriler - Av Malzemeleri
        const oltaMalzemeleri = await Category.create({
            name: 'Olta Malzemeleri',
            icon: 'fish',
            parentId: avMalzemeleri.id
        });

        const avBicaklari = await Category.create({
            name: 'Av Bıçakları',
            icon: 'knife',
            parentId: avMalzemeleri.id
        });

        // Ürünler
        await Product.bulkCreate([
            {
                name: 'Explorer Pro Sırt Çantası',
                description: 'Su geçirmez, 45L kapasiteli, ergonomik sırt desteği ile uzun yürüyüşler için ideal.',
                price: 999,
                oldPrice: 1556,
                image: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=400&h=400&fit=crop',
                rating: 4.8,
                reviewCount: 124,
                badge: '%20 İNDİRİM',
                badgeColor: '#e53e3e',
                stock: 45,
                isFeatured: true,
                isPopular: true,
                categoryId: kampMalzemeleri.id
            },
            {
                name: 'Ultra Hafif Kamp Ocağı',
                description: 'Rüzgar korumalı, titanyum alaşımlı, sadece 85g. Kompakt tasarım.',
                price: 680,
                oldPrice: null,
                image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop',
                rating: 5.0,
                reviewCount: 42,
                badge: 'YENİ',
                badgeColor: '#38a169',
                stock: 30,
                isFeatured: true,
                isPopular: true,
                categoryId: ocakEkipmanlari.id
            },
            {
                name: 'SeaMaster Olta Makinesi',
                description: 'Tuzlu suya dayanıklı, 5+1 bilyeli, yüksek çekiş gücü. Profesyonel balıkçılar için.',
                price: 1850,
                oldPrice: null,
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
                rating: 4.6,
                reviewCount: 210,
                badge: null,
                stock: 67,
                isFeatured: true,
                isPopular: true,
                categoryId: oltaMalzemeleri.id
            },
            {
                name: 'ProCamp 4 Mevsim Çadır',
                description: '3 kişilik, çift katmanlı, alüminyum direkli. Dört mevsim kullanıma uygun.',
                price: 2450,
                oldPrice: 3200,
                image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop',
                rating: 4.7,
                reviewCount: 156,
                badge: 'TÜKENİYOR',
                badgeColor: '#dd6b20',
                stock: 5,
                isFeatured: true,
                categoryId: kampMalzemeleri.id
            },
            {
                name: 'Katlanır Kamp Sandalyesi',
                description: 'Ultra hafif, 150kg taşıma kapasitesi, taşıma çantalı. Hızlı kurulum.',
                price: 550,
                oldPrice: 750,
                image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
                rating: 4.3,
                reviewCount: 67,
                badge: '%25 İNDİRİM',
                badgeColor: '#e53e3e',
                stock: 80,
                isFeatured: false,
                categoryId: kampSandalyeleri.id
            },
            {
                name: 'Karbon Olta Kamışı',
                description: 'Teleskopik, 2.7m, karbon fiber. Hafif ve dayanıklı yapı.',
                price: 890,
                oldPrice: null,
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
                rating: 4.5,
                reviewCount: 134,
                badge: null,
                stock: 45,
                isFeatured: false,
                categoryId: oltaMalzemeleri.id
            }
        ]);

        console.log('Seed verileri başarıyla eklendi!');

        // Admin kullanıcı oluştur
        const adminExists = await User.findOne({ where: { email: 'admin@dogavebalik.com' } });
        if (!adminExists) {
            await User.create({
                fullName: process.env.ADMIN_NAME || 'Admin',
                email: process.env.ADMIN_EMAIL || 'admin@dogavebalik.com',
                password: process.env.ADMIN_PASSWORD || '34412003sbho', // Güçlü bir şifre kullanın
                role: 'admin'
            });
            console.log(`Admin kullanıcı oluşturuldu: ${process.env.ADMIN_EMAIL || 'admin@dogavebalik.com'} / (Şifre .env dosyasından okundu)`);
        }
    } catch (error) {
        console.error('Seed hatası:', error);
    }
}

module.exports = seedDatabase;
