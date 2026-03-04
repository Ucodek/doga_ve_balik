const path = require('path');
const fs = require('fs');

// Sharp - görsel sıkıştırma
let sharp;
try { sharp = require('sharp'); } catch(e) { sharp = null; }

// fluent-ffmpeg - video sıkıştırma
let ffmpeg;
try { ffmpeg = require('fluent-ffmpeg'); } catch(e) { ffmpeg = null; }

/**
 * Görseli sıkıştır (kaliteyi çok düşürmeden boyutu küçült)
 * - Max genişlik: 1920px
 * - JPEG kalite: 80
 * - WebP kalite: 80
 * - PNG compression level: 8
 */
async function compressImage(filePath) {
    if (!sharp) {
        console.log('Sharp yüklü değil, görsel sıkıştırma atlanıyor.');
        return filePath;
    }

    try {
        const ext = path.extname(filePath).toLowerCase();
        const dir = path.dirname(filePath);
        const basename = path.basename(filePath, ext);
        
        // Orijinal dosya boyutunu al
        const originalStats = fs.statSync(filePath);
        const originalSize = originalStats.size;

        // Geçici dosya adı
        const tempPath = path.join(dir, `${basename}_compressed${ext}`);

        let sharpInstance = sharp(filePath)
            .rotate() // EXIF rotation bilgisini korur
            .resize({
                width: 1920,
                height: 1920,
                fit: 'inside',           // En-boy oranını koru
                withoutEnlargement: true  // Küçük görselleri büyütme
            });

        // Formata göre sıkıştırma ayarları
        if (ext === '.jpg' || ext === '.jpeg') {
            sharpInstance = sharpInstance.jpeg({ 
                quality: 80,
                mozjpeg: true  // Daha iyi sıkıştırma
            });
        } else if (ext === '.png') {
            sharpInstance = sharpInstance.png({ 
                compressionLevel: 8,
                palette: true
            });
        } else if (ext === '.webp') {
            sharpInstance = sharpInstance.webp({ 
                quality: 80 
            });
        } else if (ext === '.gif') {
            // GIF'leri olduğu gibi bırak (animasyon kaybı olabilir)
            return filePath;
        }

        await sharpInstance.toFile(tempPath);

        // Sıkıştırılmış dosya boyutunu kontrol et
        const compressedStats = fs.statSync(tempPath);
        const compressedSize = compressedStats.size;

        // Eğer sıkıştırılmış dosya daha küçükse, orijinali değiştir
        if (compressedSize < originalSize) {
            fs.unlinkSync(filePath);
            fs.renameSync(tempPath, filePath);
            const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            console.log(`Görsel sıkıştırıldı: ${path.basename(filePath)} | ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savings}% tasarruf)`);
        } else {
            // Sıkıştırılmış versiyon daha büyükse, geçici dosyayı sil
            fs.unlinkSync(tempPath);
            console.log(`Görsel zaten optimize: ${path.basename(filePath)} (${formatBytes(originalSize)})`);
        }

        return filePath;
    } catch (error) {
        console.error('Görsel sıkıştırma hatası:', error.message);
        return filePath; // Hata olursa orijinal dosyayı döndür
    }
}

/**
 * Birden fazla görseli sıkıştır
 */
async function compressImages(filePaths) {
    const results = [];
    for (const fp of filePaths) {
        const result = await compressImage(fp);
        results.push(result);
    }
    return results;
}

/**
 * Videoyu sıkıştır (ffmpeg ile)
 * - Max çözünürlük: 720p
 * - CRF: 28 (iyi kalite/boyut dengesi)
 * - Codec: libx264 (H.264)
 * - Audio: AAC 128k
 */
function compressVideo(filePath) {
    return new Promise((resolve) => {
        if (!ffmpeg) {
            console.log('fluent-ffmpeg yüklü değil, video sıkıştırma atlanıyor.');
            return resolve(filePath);
        }

        try {
            const ext = path.extname(filePath).toLowerCase();
            const dir = path.dirname(filePath);
            const basename = path.basename(filePath, ext);
            const outputPath = path.join(dir, `${basename}_compressed.mp4`);
            const originalSize = fs.statSync(filePath).size;

            ffmpeg(filePath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .audioBitrate('128k')
                .outputOptions([
                    '-crf 28',                    // Kalite faktörü (18=yüksek, 28=orta-iyi, 35=düşük)
                    '-preset medium',             // Hız/kalite dengesi
                    '-vf scale=-2:\'min(720,ih)\'', // Max 720p, en-boy oranını koru
                    '-movflags +faststart',       // Web streaming için optimize
                    '-y'                          // Üzerine yaz
                ])
                .output(outputPath)
                .on('end', () => {
                    try {
                        const compressedSize = fs.statSync(outputPath).size;

                        if (compressedSize < originalSize) {
                            // Orijinal dosyayı sil ve sıkıştırılmışı yerine koy
                            fs.unlinkSync(filePath);

                            // Dosya adını .mp4 olarak güncelle (format dönüşümü olabilir)
                            const finalPath = path.join(dir, `${basename}.mp4`);
                            fs.renameSync(outputPath, finalPath);

                            const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                            console.log(`Video sıkıştırıldı: ${path.basename(filePath)} | ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savings}% tasarruf)`);
                            resolve(finalPath);
                        } else {
                            fs.unlinkSync(outputPath);
                            console.log(`Video zaten optimize: ${path.basename(filePath)} (${formatBytes(originalSize)})`);
                            resolve(filePath);
                        }
                    } catch (err) {
                        console.error('Video dosya işleme hatası:', err.message);
                        resolve(filePath);
                    }
                })
                .on('error', (err) => {
                    console.error('Video sıkıştırma hatası:', err.message);
                    // Hata olursa geçici dosyayı temizle
                    try { 
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); 
                    } catch(e) {}
                    resolve(filePath); // Hata olursa orijinal dosyayı döndür
                })
                .run();
        } catch (error) {
            console.error('Video sıkıştırma başlatma hatası:', error.message);
            resolve(filePath);
        }
    });
}

/**
 * Byte'ı okunabilir formata çevir
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = { compressImage, compressImages, compressVideo };
