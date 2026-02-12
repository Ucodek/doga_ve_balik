require('dotenv').config();
const { sequelize } = require('./database/db');
const User = require('./models/User');

async function createAdmin() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@dogavebalik.com';
        const adminName = process.env.ADMIN_NAME || 'Admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'DoGaVeBaLiK2026!';

        const existing = await User.findOne({ where: { email: adminEmail } });
        if (existing) {
            console.log('Bu kullanıcı zaten mevcut.');
            process.exit(0);
        }

        const user = await User.create({
            fullName: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin'
        });

        console.log('Admin kullanıcı oluşturuldu:');
        console.log('  İsim:', user.fullName);
        console.log('  E-posta:', adminEmail);
        console.log('  Rol:', user.role);
        console.log('  (Şifre .env dosyasından okundu)');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

createAdmin();
