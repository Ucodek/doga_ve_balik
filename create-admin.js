const { sequelize } = require('./database/db');
const User = require('./models/User');

async function createAdmin() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();

        const existing = await User.findOne({ where: { email: 'hakan@gmail.com' } });
        if (existing) {
            console.log('Bu kullanıcı zaten mevcut.');
            process.exit(0);
        }

        const user = await User.create({
            fullName: 'Hakan',
            email: 'hakan@gmail.com',
            password: '123456',
            role: 'admin'
        });

        console.log('Admin kullanıcı oluşturuldu:');
        console.log('  İsim:', user.fullName);
        console.log('  E-posta: hakan@gmail.com');
        console.log('  Şifre: 123456');
        console.log('  Rol:', user.role);
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

createAdmin();
