const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dogavebalik42@gmail.com',
        pass: 'uqwm umym fzxq nbml'
    }
});

// Şifre sıfırlama kodu gönder
async function sendResetCode(toEmail, resetCode) {
    const mailOptions = {
        from: '"Doğa ve Balık" <dogavebalik42@gmail.com>',
        to: toEmail,
        subject: 'Şifre Sıfırlama Kodu - Doğa ve Balık',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #1a3a1a 0%, #276749 100%); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">🎣 Doğa ve Balık</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Şifre Sıfırlama</p>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="color: #1a202c; font-size: 15px; margin: 0 0 8px;">Merhaba,</p>
                    <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                        Şifre sıfırlama talebiniz alındı. Aşağıdaki kodu kullanarak yeni şifrenizi belirleyebilirsiniz.
                    </p>
                    <div style="background: #f0fff4; border: 2px dashed #38a169; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <p style="color: #718096; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Sıfırlama Kodunuz</p>
                        <p style="color: #276749; font-size: 32px; font-weight: 800; letter-spacing: 8px; margin: 0;">${resetCode}</p>
                    </div>
                    <p style="color: #a0aec0; font-size: 13px; line-height: 1.5; margin: 0;">
                        ⏱ Bu kod <strong>15 dakika</strong> süreyle geçerlidir.<br>
                        Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
                    </p>
                </div>
                <div style="background: #f7fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Doğa ve Balık - Tüm hakları saklıdır.</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendResetCode };
