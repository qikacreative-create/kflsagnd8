import { JadwalFotografi, OwnerProfile, RekeningModel } from '../types/kafela';

export function keRupiah(nominal: number): string {
  const angka = Math.round(Number(nominal) || 0);
  return 'Rp ' + angka.toLocaleString('id-ID');
}

export function formatRibuanInput(val: string): string {
  const clean = val.replace(/[^0-9]/g, '');
  if (!clean) return '0';
  return Number(clean).toLocaleString('id-ID');
}

export function bersihkanTitik(val: string): number {
  const clean = val.replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}

export function formatNomorWA(nomor: string): string {
  let bersih = (nomor || '').replace(/[^0-9]/g, '');
  if (bersih.startsWith('0')) {
    bersih = '62' + bersih.substring(1);
  } else if (bersih.startsWith('8')) {
    bersih = '62' + bersih;
  }
  return bersih;
}

export function bersihkanSlugBrand(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function buatLoginIdKru(username: string, namaBrand: string): string {
  const u = (username || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const b = bersihkanSlugBrand(namaBrand);
  if (!b) return u;
  return `${u}.${b}`;
}

export function idKeEmailSistem(idInput: string): string {
  const trimmed = (idInput || '').trim().toLowerCase();

  // Jika sudah berupa email asli (@ dan domain .)
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return trimmed;
  }

  // Jika berupa nomor WhatsApp / nomor telepon
  const numericOnly = trimmed.replace(/[^0-9]/g, '');
  const isPhoneNumber =
    numericOnly.length >= 9 &&
    (trimmed.startsWith('0') ||
      trimmed.startsWith('62') ||
      trimmed.startsWith('+62') ||
      trimmed.startsWith('8'));

  if (isPhoneNumber) {
    let waBersih = numericOnly;
    if (waBersih.startsWith('62')) {
      waBersih = '0' + waBersih.substring(2);
    }
    return `${waBersih}@kafelaagenda.com`;
  }

  // Jika berupa Username crew/admin dengan format username.namabrand atau username@namabrand
  const normalizedId = trimmed.replace('@', '.').replace(/[^a-z0-9._-]/g, '');
  return `${normalizedId}@kafelaagenda.com`;
}

export function formatTanggalIndo(ms: number, pendek = false): string {
  if (!ms || ms <= 0) return '-';
  const d = new Date(ms);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: pendek ? 'short' : 'long',
    year: 'numeric',
  });
}

export function formatHariTanggalIndo(ms: number): string {
  if (!ms || ms <= 0) return '-';
  const d = new Date(ms);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatJamWIB(ms: number): string {
  if (!ms || ms <= 0) return '08:00';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatRekeningTeks(rekening: RekeningModel): string {
  const lines: string[] = [];
  if (rekening.bankUtama && rekening.rekUtama) {
    lines.push(`Bank ${rekening.bankUtama}: ${rekening.rekUtama} (a.n ${rekening.namaUtama || '-'})`);
  }
  if (rekening.bankAlternatif && rekening.rekAlternatif) {
    lines.push(`Alternatif ${rekening.bankAlternatif}: ${rekening.rekAlternatif} (a.n ${rekening.namaAlternatif || '-'})`);
  }
  if (rekening.linkPembayaran) {
    lines.push(`QRIS / Link: ${rekening.linkPembayaran}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(Rekening belum diatur)';
}

export function bangunPesanWA(
  jadwal: JadwalFotografi,
  owner: OwnerProfile,
  rekening: RekeningModel,
  modePesan?: 'TAGIHAN' | 'KONFIRMASI' | 'WEB_BOOKING'
): string {
  const statusKecil = (jadwal.status || '').toLowerCase();
  const totalBersih = Math.max(0, jadwal.hargaKotor - jadwal.diskon);
  const sisaTagihan = statusKecil === 'lunas' ? 0 : Math.max(0, totalBersih - jadwal.dpDibayar);

  const infoRekening = formatRekeningTeks(rekening);
  const tglAcaraTeks = formatHariTanggalIndo(jadwal.waktuMulai);

  let template = owner.templateWaTagihan;
  if (modePesan === 'WEB_BOOKING' || (!modePesan && jadwal.dpDibayar === 0 && statusKecil !== 'lunas')) {
    template = owner.templateWaBookingWeb;
  } else if (modePesan === 'KONFIRMASI' || (!modePesan && statusKecil === 'lunas')) {
    template = owner.templateWaKonfirmasi;
  }

  return template
    .replace(/\[NAMA\]/g, jadwal.namaKlien || 'Kak')
    .replace(/\[ACARA\]/g, jadwal.namaAcara || jadwal.paket)
    .replace(/\[LOKASI\]/g, jadwal.lokasi || 'Studio')
    .replace(/\[BRAND\]/g, owner.namaBrand || "Kafela's Studio")
    .replace(/\[TANGGAL\]/g, tglAcaraTeks)
    .replace(/\[HARGA\]/g, keRupiah(totalBersih))
    .replace(/\[SISA\]/g, keRupiah(sisaTagihan))
    .replace(/\[REKENING\]/g, infoRekening);
}

/**
 * Port 1:1 dari SignaturePhotoExtractor.kt Android:
 * Mengekstrak goresan tanda tangan dari foto kertas dengan algoritma dilatasi Euclidean nyata (20% - 200%)
 * dan pembersih bayangan kertas otomatis, lalu melakukan auto-crop rapat.
 */
export function ekstrakTandaTanganDariKertasCanvas(
  imgElement: HTMLImageElement,
  persenTebal = 100,
  persenBersih = 70
): string {
  const maxDimensi = 750;
  const scale =
    imgElement.width > maxDimensi || imgElement.height > maxDimensi
      ? maxDimensi / Math.max(imgElement.width, imgElement.height)
      : 1;

  const w = Math.max(1, Math.round(imgElement.width * scale));
  const h = Math.max(1, Math.round(imgElement.height * scale));

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(imgElement, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const lum = new Int32Array(w * h);
  let totalLum = 0;

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const l = Math.floor((r * 299 + g * 587 + b * 114) / 1000);
    lum[i] = l;
    totalLum += l;
  }

  const rataRataLum = Math.floor(totalLum / (w * h));
  const toleransiBersih = Math.round(170 + (persenBersih / 100) * 75);
  const batasTinta = Math.min(toleransiBersih, Math.floor(rataRataLum * 0.84));

  const maskInti = new Uint8Array(w * h);
  let adaTinta = false;

  for (let i = 0; i < w * h; i++) {
    if (lum[i] < batasTinta) {
      maskInti[i] = 1;
      adaTinta = true;
    }
  }

  if (!adaTinta) {
    for (let i = 0; i < w * h; i++) {
      if (lum[i] < 205) {
        maskInti[i] = 1;
      }
    }
  }

  const radiusMekar =
    persenTebal >= 180
      ? 4
      : persenTebal >= 140
      ? 3
      : persenTebal >= 100
      ? 2
      : persenTebal >= 60
      ? 1
      : 0;

  const outAlpha = new Uint8Array(w * h);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (maskInti[idx] === 1) {
        outAlpha[idx] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (radiusMekar > 0) {
          const maxJarakKuadrat = radiusMekar * radiusMekar;
          for (let dy = -radiusMekar; dy <= radiusMekar; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= h) continue;
            for (let dx = -radiusMekar; dx <= radiusMekar; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= w) continue;
              const jarakKuadrat = dx * dx + dy * dy;
              if (jarakKuadrat <= maxJarakKuadrat) {
                const targetIdx = ny * w + nx;
                const alphaTambahan =
                  jarakKuadrat <= 2
                    ? 255
                    : jarakKuadrat <= 6
                    ? 230
                    : jarakKuadrat <= 12
                    ? 190
                    : 140;
                if (alphaTambahan > outAlpha[targetIdx]) {
                  outAlpha[targetIdx] = alphaTambahan;
                }
                if (nx < minX) minX = nx;
                if (nx > maxX) maxX = nx;
                if (ny < minY) minY = ny;
                if (ny > maxY) maxY = ny;
              }
            }
          }
        }
      }
    }
  }

  // Warna tinta pulpen royal blue gelap elegan (#152238)
  const rTinta = 21;
  const gTinta = 34;
  const bTinta = 56;

  for (let i = 0; i < w * h; i++) {
    const a = outAlpha[i];
    if (a > 30) {
      data[i * 4] = rTinta;
      data[i * 4 + 1] = gTinta;
      data[i * 4 + 2] = bTinta;
      data[i * 4 + 3] = a;
    } else {
      data[i * 4] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    return tempCanvas.toDataURL('image/png');
  }

  const pad = 12;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, maxX - minX + pad * 2);
  const cropH = Math.min(h - cropY, maxY - minY + pad * 2);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return tempCanvas.toDataURL('image/png');

  cropCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return cropCanvas.toDataURL('image/png');
}

/**
 * Kompres gambar (Logo Brand / Tanda Tangan Digital) menjadi string Base64 ultra-kompak
 * dengan batas dimensi maksimal (default 300px) dan format WebP/PNG transparan (~8 - 15 KB).
 * Gambar ini aman disimpan langsung di dokumen Profil Owner Firestore tanpa Firebase Storage.
 */
export async function kompresGambarKeBase64(
  sumber: HTMLImageElement | HTMLCanvasElement | Blob | string,
  opsi?: {
    maxDim?: number;
    kualitas?: number;
    forceSquare?: boolean;
  }
): Promise<{ base64: string; ukuranKb: number }> {
  const maxDim = opsi?.maxDim || 300;
  const kualitas = opsi?.kualitas ?? 0.82;
  const forceSquare = Boolean(opsi?.forceSquare);

  // 1. Muat ke elemen gambar jika sumber berupa Blob atau URL/Base64 string
  let imgEl: HTMLImageElement | HTMLCanvasElement;
  if (typeof sumber === 'string') {
    imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = sumber;
    });
  } else if (sumber instanceof Blob) {
    const objectUrl = URL.createObjectURL(sumber);
    imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      };
      img.src = objectUrl;
    });
  } else {
    imgEl = sumber;
  }

  const srcW = imgEl instanceof HTMLImageElement ? imgEl.naturalWidth || imgEl.width : imgEl.width;
  const srcH = imgEl instanceof HTMLImageElement ? imgEl.naturalHeight || imgEl.height : imgEl.height;

  if (!srcW || !srcH) {
    throw new Error('Dimensi gambar tidak valid untuk dikompres.');
  }

  // 2. Tentukan ukuran target
  let targetW = srcW;
  let targetH = srcH;
  let sx = 0;
  let sy = 0;
  let sWidth = srcW;
  let sHeight = srcH;

  if (forceSquare) {
    const sisi = Math.min(srcW, srcH);
    sx = (srcW - sisi) / 2;
    sy = (srcH - sisi) / 2;
    sWidth = sisi;
    sHeight = sisi;
    targetW = Math.min(maxDim, sisi);
    targetH = targetW;
  } else {
    if (srcW > maxDim || srcH > maxDim) {
      if (srcW >= srcH) {
        targetW = maxDim;
        targetH = Math.round((srcH / srcW) * maxDim);
      } else {
        targetH = maxDim;
        targetW = Math.round((srcW / srcH) * maxDim);
      }
    }
  }

  // 3. Render ke Canvas terkompresi
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal menginisialisasi 2D Canvas context.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgEl, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

  // 4. Bandingkan WebP vs PNG dan pilih ukuran terkecil yang tetap transparan
  let bestBase64 = '';
  try {
    const webpData = canvas.toDataURL('image/webp', kualitas);
    if (webpData.startsWith('data:image/webp')) {
      bestBase64 = webpData;
    }
  } catch {}

  const pngData = canvas.toDataURL('image/png');
  if (!bestBase64 || pngData.length < bestBase64.length) {
    bestBase64 = pngData;
  }

  // Hitung perkiraan ukuran dalam KB (Base64 overhead ~4/3)
  const headerIdx = bestBase64.indexOf(',');
  const rawBase64 = headerIdx >= 0 ? bestBase64.slice(headerIdx + 1) : bestBase64;
  const bytes = (rawBase64.length * 3) / 4;
  const ukuranKb = Math.round((bytes / 1024) * 10) / 10;

  return { base64: bestBase64, ukuranKb };
}

