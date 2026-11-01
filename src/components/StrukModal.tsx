import React, { useState, useEffect } from 'react';
import { toPng } from 'html-to-image';

import {
  Printer,
  Bluetooth,
  X,
  FileImage,
  Share2,
  Receipt,
  Download,
  AlertCircle,
} from 'lucide-react';
import { JadwalFotografi, OwnerProfile, RekeningModel } from '../types/kafela';
import {
  formatJamWIB,
  formatTanggalIndo,
  keRupiah,
} from '../utils/formatters';
import { getMedia } from '../services/localDb';

interface StrukModalProps {
  jadwal: JadwalFotografi;
  owner: OwnerProfile;
  rekening?: RekeningModel;
  namaAdminAktif?: string;
  onClose: () => void;
}

const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
];

const KNOWN_PRINTER_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
];

export const StrukModal: React.FC<StrukModalProps> = ({
  jadwal,
  owner,
  rekening,
  namaAdminAktif,
  onClose,
}) => {
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [btStatus, setBtStatus] = useState<string | null>(null);
  const [showRawBtFallback, setShowRawBtFallback] = useState(false);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const [localTtdUrl, setLocalTtdUrl] = useState<string | null>(null);
  const [invoiceMode, setInvoiceMode] = useState<'THERMAL' | 'A4'>('THERMAL');

  useEffect(() => {
    const loadMedia = async () => {
      // Prioritaskan Base64 dari Profil Owner Firestore
      if (owner.logoBrandUrl && owner.logoBrandUrl !== 'local:logo') {
        setLocalLogoUrl(owner.logoBrandUrl);
      } else {
        const cached = await getMedia('logo', owner.uid);
        if (cached) {
          setLocalLogoUrl(typeof cached === 'string' ? cached : URL.createObjectURL(cached));
        }
      }

      // Prioritaskan Base64 dari Profil Owner Firestore
      if (owner.ttdUrl && owner.ttdUrl !== 'local:ttd') {
        setLocalTtdUrl(owner.ttdUrl);
      } else {
        const cached = await getMedia('ttd', owner.uid);
        if (cached) {
          setLocalTtdUrl(typeof cached === 'string' ? cached : URL.createObjectURL(cached));
        }
      }
    };
    loadMedia();
  }, [owner.logoBrandUrl, owner.ttdUrl, owner.uid]);

  const finalLogoUrl =
    (owner.logoBrandUrl && owner.logoBrandUrl !== 'local:logo' ? owner.logoBrandUrl : null) ||
    localLogoUrl ||
    '';
  const finalTtdUrl =
    (owner.ttdUrl && owner.ttdUrl !== 'local:ttd' ? owner.ttdUrl : null) ||
    localTtdUrl ||
    '';

  const adminName = namaAdminAktif || owner.namaOwner || owner.namaBrand || 'Admin Studio';
  const isLunas = (jadwal.status || '').toLowerCase() === 'lunas';
const noStruk = jadwal.idJadwal || 'INV001';
  const tanggalBayar = formatTanggalIndo(Date.now(), true);

  const hargaPaketDasar =
    jadwal.hargaPaketDasar > 0 ? jadwal.hargaPaketDasar : jadwal.hargaKotor;
  const hargaTambahan = jadwal.hargaTambahan || 0;
  const totalTarif = hargaPaketDasar + hargaTambahan;
  const diskon = jadwal.diskon || 0;
  const tagihanSetelahDiskon = Math.max(0, totalTarif - diskon);

  const dpDibayar = jadwal.dpDibayar || 0;
  const sisaTagihan = isLunas ? 0 : Math.max(0, tagihanSetelahDiskon - dpDibayar);
  const nominalDibayar = isLunas ? tagihanSetelahDiskon : dpDibayar;

  const modeLogo = owner.penempatanLogo || 'KEDUANYA';
  const adaLogo = Boolean(finalLogoUrl) && modeLogo !== 'TIDAK_TAMPIL';
  const tampilLogoSamping =
    adaLogo && (modeLogo === 'KEDUANYA' || modeLogo === 'SAMPING');
  const tampilLogoWatermark =
    adaLogo && (modeLogo === 'KEDUANYA' || modeLogo === 'WATERMARK');
  const adaTtd = Boolean(finalTtdUrl);

  const watermarkBrand = (owner.namaBrand || "KAFELA'S AGENDA").toUpperCase();
  const alamatStore = owner.lokasi1 || owner.lokasi2 || owner.lokasi3 || 'Studio Utama';

  /**
   * Mengubah URL gambar apa pun menjadi data Base64 yang aman dari canvas taint
   */
  const ensureSafeDataUrl = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return url;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || url);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  /**
   * Render struk menjadi gambar PNG 100% IDENTIK dengan preview
   * menggunakan html-to-image langsung dari elemen DOM pratinjau.
   */
  const renderCanvasReceipt = async (): Promise<string> => {
    try {
      const node = document.getElementById('printable-receipt-area');
      if (!node) {
        setBtStatus('⚠️ Area preview struk tidak ditemukan.');
        return '';
      }

      // Mengambil snapshot elemen preview HTML secara presisi dengan resolusi tinggi (pixelRatio: 2)
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
        style: {
          transform: 'none',
        },
      });

      return dataUrl;
    } catch (err) {
      console.error('Gagal export DOM to PNG:', err);
      setBtStatus('Gagal membuat gambar struk dari preview.');
      return '';
    }
  };

  const generateReceiptPngDataUrl = async (): Promise<string> => {
    return await renderCanvasReceipt();
  };

  const fileNamePng = `Struk_${(jadwal.namaKlien || 'Klien').replace(/[^a-zA-Z0-9]/g, '_')}_${noStruk}.png`;

  /**
   * 1. Simpan Gambar Struk (PNG) ke Perangkat
   */
  const handleDownloadPng = async () => {
    setIsGeneratingPng(true);
    setBtStatus('Menyiapkan gambar struk...');
    try {
      const dataUrl = await generateReceiptPngDataUrl();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = fileNamePng;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setBtStatus('✓ Gambar struk berhasil diunduh ke perangkat!');
        setTimeout(() => setBtStatus(null), 3500);
      }
    } catch {
      setBtStatus('Gagal menyimpan gambar struk.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  /**
   * Simpan Faktur A4 ke Perangkat
   */
  const handleDownloadA4Invoice = async () => {
    setIsGeneratingPng(true);
    setBtStatus('Menyiapkan dokumen Faktur A4...');
    try {
      const node = document.getElementById('printable-a4-invoice-area');
      if (!node) {
        setBtStatus('⚠️ Area Faktur A4 tidak ditemukan.');
        return;
      }
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
        style: {
          transform: 'none',
        },
      });
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `Faktur_A4_${(jadwal.namaKlien || 'Klien').replace(/[^a-zA-Z0-9]/g, '_')}_${noStruk}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setBtStatus('✓ Faktur A4 berhasil disimpan!');
        setTimeout(() => setBtStatus(null), 3500);
      }
    } catch (err) {
      console.error('Gagal simpan Faktur A4:', err);
      setBtStatus('Gagal menyimpan Faktur A4.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  /**
   * 2. Bagikan Gambar Struk (Web Share API File PNG)
   */
  const handleShareReceiptImage = async () => {
    setIsGeneratingPng(true);
    setBtStatus('Menyiapkan gambar struk untuk dibagikan...');
    try {
      const dataUrl = await generateReceiptPngDataUrl();
      if (!dataUrl) {
        setBtStatus('Gagal membuat gambar struk.');
        return;
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileNamePng, { type: 'image/png' });

      const navShare = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (navShare.share && (!navShare.canShare || navShare.canShare({ files: [file] }))) {
        await navShare.share({
          title: `Struk ${owner.namaBrand} - ${jadwal.namaKlien}`,
          text: `Struk pembayaran ${jadwal.namaKlien} (${noStruk}) - ${owner.namaBrand}`,
          files: [file],
        });
        setBtStatus('✓ Gambar struk berhasil dibagikan!');
        setTimeout(() => setBtStatus(null), 3000);
        return;
      }

      // Fallback unduh otomatis jika browser tidak dukung share file
      const link = document.createElement('a');
      link.download = fileNamePng;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setBtStatus('✓ Gambar struk diunduh (Siap dilampirkan ke WA/Aplikasi lain).');
      setTimeout(() => setBtStatus(null), 4000);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        await handleDownloadPng();
      } else {
        setBtStatus(null);
      }
    } finally {
      setIsGeneratingPng(false);
    }
  };

  /**
   * 4. Print Biasa (Printer Kasir USB / Inkjet / PC)
   */
  const handleStandardPrint = async () => {
    setIsGeneratingPng(true);
    setBtStatus('Menyiapkan dokumen cetak struk...');
    try {
      const dataUrl = await generateReceiptPngDataUrl();
      if (!dataUrl) {
        window.print();
        return;
      }

      const oldIframe = document.getElementById('kafela-receipt-print-frame');
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'kafela-receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Struk ${noStruk} - ${jadwal.namaKlien}</title>
            <style>
              @page { margin: 4mm; }
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                display: flex;
                justify-content: center;
                align-items: flex-start;
              }
              img {
                width: 100%;
                max-width: 340px;
                height: auto;
                display: block;
              }
            </style>
          </head>
          <body>
            <img id="receipt-img" src="${dataUrl}" />
            <script>
              const img = document.getElementById('receipt-img');
              img.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 150);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
      setBtStatus('✓ Dialog cetak printer dibuka!');
      setTimeout(() => setBtStatus(null), 3500);
    } catch {
      window.print();
    } finally {
      setIsGeneratingPng(false);
    }
  };

  /**
   * Format teks ESC/POS 32 karakter (58mm) untuk Printer Thermal Bluetooth & RawBT
   */
  const buildEscPosText = (): string => {
    const lineSep = '--------------------------------\n';
    const eqSep = '================================\n';
    return [
      '\x1B\x40', // Init printer
      '\x1B\x61\x01', // Center align
      '\x1B\x21\x10', // Double height
      `${(owner.namaBrand || "KAFELA'S STUDIO").toUpperCase()}\n`,
      '\x1B\x21\x00', // Normal text
      'Struk Pembayaran Resmi\n',
      eqSep,
      isLunas ? 'BUKTI PELUNASAN\n' : 'INVOICE PEMBAYARAN\n',
      lineSep,
      '\x1B\x61\x00', // Left align
      `No.Inv  : #${noStruk}\n`,
      `Tanggal : ${tanggalBayar}\n`,
      `Admin   : ${adminName}\n`,
      lineSep,
      `Klien   : ${jadwal.namaKlien}\n`,
      `Acara   : ${jadwal.namaAcara}\n`,
      `Paket   : ${jadwal.paket}\n`,
      `Lokasi  : ${jadwal.lokasi}\n`,
      `Waktu   : ${formatTanggalIndo(jadwal.waktuMulai, true)} ${formatJamWIB(jadwal.waktuMulai)}\n`,
      lineSep,
      hargaTambahan > 0
        ? `Paket   : ${keRupiah(hargaPaketDasar)}\nTambahan: +${keRupiah(hargaTambahan)}\n`
        : `Tarif   : ${keRupiah(totalTarif)}\n`,
      diskon > 0 ? `Diskon  : -${keRupiah(diskon)}\n` : '',
      `Tagihan : ${keRupiah(tagihanSetelahDiskon)}\n`,
      `Dibayar : ${keRupiah(nominalDibayar)}\n`,
      !isLunas ? `Sisa    : ${keRupiah(sisaTagihan)}\n` : '',
      eqSep,
      '\x1B\x61\x01', // Center align
      `STATUS: ${isLunas ? 'LUNAS (Rp 0)' : 'BELUM LUNAS'}\n\n`,
      'Terima kasih atas kepercayaan\n',
      'Anda. Simpan struk ini sebagai\n',
      'bukti pembayaran yang sah.\n\n\n\n',
    ].join('');
  };

  /**
   * 5. Cetak ke Printer Kasir Bluetooth
   */
  const handleWebBluetoothPrint = async () => {
    setShowRawBtFallback(false);

    // 1. Cek apakah dibuka di dalam aplikasi Android APK (WebView dengan interface "MesinPrint" atau "WebAppInterface")
    const win = window as any;
    const bridge = win.MesinPrint || win.WebAppInterface;

    if (bridge && (typeof bridge.prosesCetakBluetooth === 'function' || typeof bridge.cetakStrukDariWeb === 'function')) {
      try {
        setBtStatus('Mengirim data & gambar ke printer Bluetooth APK...');

        // Konversi logo dan tanda tangan ke format Base64 yang aman
        let logoB64 = '';
        let ttdB64 = '';

        if (adaLogo && finalLogoUrl) {
          logoB64 = await ensureSafeDataUrl(finalLogoUrl);
        }
        if (adaTtd && finalTtdUrl) {
          ttdB64 = await ensureSafeDataUrl(finalTtdUrl);
        }

        const brandName = owner.namaBrand || "Kafela's Agenda";
        const adminKasir = adminName || owner.namaOwner || 'Admin Studio';
        const metode = rekening?.bankUtama ? `Transfer ${rekening.bankUtama}` : 'Tunai / Cash';
        const isArsip = Boolean(jadwal.isFromArchive);

        if (typeof bridge.prosesCetakBluetooth === 'function') {
          // Panggil antarmuka lengkap dengan Logo dan Tanda Tangan Base64
          try {
            bridge.prosesCetakBluetooth(
              jadwal.namaAcara || '-',
              jadwal.namaKlien || '-',
              jadwal.paket || '-',
              hargaPaketDasar,
              jadwal.namaTambahan || '',
              hargaTambahan,
              jadwal.lokasi || 'Studio',
              tanggalBayar,
              jadwal.waktuMulai || 0,
              totalTarif,
              nominalDibayar,
              diskon,
              dpDibayar,
              isLunas,
              noStruk,
              jadwal.catatan || '',
              metode,
              isArsip,
              brandName,
              adminKasir,
              logoB64,
              ttdB64
            );
          } catch {
            // Fallback pemanggilan format lama jika APK belum diupdate ke 22 parameter
            bridge.prosesCetakBluetooth(
              jadwal.namaAcara || '-',
              jadwal.namaKlien || '-',
              jadwal.paket || '-',
              hargaPaketDasar,
              jadwal.namaTambahan || '',
              hargaTambahan,
              jadwal.lokasi || 'Studio',
              tanggalBayar,
              jadwal.waktuMulai || 0,
              totalTarif,
              nominalDibayar,
              diskon,
              dpDibayar,
              isLunas,
              noStruk,
              jadwal.catatan || '',
              metode,
              isArsip
            );
          }
        } else if (typeof bridge.cetakStrukDariWeb === 'function') {
          bridge.cetakStrukDariWeb(
            jadwal.namaAcara || '-',
            jadwal.namaKlien || '-',
            jadwal.paket || '-',
            hargaPaketDasar,
            jadwal.namaTambahan || '',
            hargaTambahan,
            jadwal.lokasi || 'Studio',
            tanggalBayar,
            jadwal.waktuMulai || 0,
            totalTarif,
            nominalDibayar,
            diskon,
            dpDibayar,
            isLunas,
            noStruk,
            jadwal.catatan || '',
            metode,
            isArsip
          );
        }

        setBtStatus('✓ Data struk dan gambar berhasil dikirim ke Printer APK!');
        setTimeout(() => setBtStatus(null), 3500);
        return;
      } catch (bridgeErr) {
        console.error('Gagal mengirim ke bridge Android:', bridgeErr);
        setBtStatus('Gagal kirim via APK. Mencoba Web Bluetooth browser...');
      }
    }

    type BleCharacteristic = {
      properties?: {
        write?: boolean;
        writeWithoutResponse?: boolean;
      };
      writeValue?: (v: Uint8Array) => Promise<void>;
      writeValueWithoutResponse?: (v: Uint8Array) => Promise<void>;
    };

    type BleService = {
      getCharacteristic: (uuid: string) => Promise<BleCharacteristic>;
      getCharacteristics: () => Promise<BleCharacteristic[]>;
    };

    type BleServer = {
      getPrimaryService: (uuid: string) => Promise<BleService>;
      getPrimaryServices: () => Promise<BleService[]>;
    };

    const nav = navigator as unknown as {
      bluetooth?: {
        requestDevice: (opts: unknown) => Promise<{
          name?: string;
          gatt?: {
            connect: () => Promise<BleServer>;
          };
        }>;
      };
    };

    if (!nav.bluetooth) {
      setBtStatus(
        'Browser ini tidak mendukung Web Bluetooth langsung. Gunakan Chrome atau tombol RawBT di bawah.'
      );
      setShowRawBtFallback(true);
      return;
    }

    try {
      setBtStatus('Mencari printer thermal Bluetooth...');
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      setBtStatus(`Menghubungkan ke ${device.name || 'Printer Bluetooth'}...`);
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Gagal terhubung ke GATT server printer.');
      }

      let targetChar: BleCharacteristic | null = null;

      for (const sUuid of KNOWN_PRINTER_SERVICES) {
        if (targetChar) break;
        try {
          const service = await server.getPrimaryService(sUuid);
          for (const cUuid of KNOWN_PRINTER_CHARACTERISTICS) {
            try {
              const ch = await service.getCharacteristic(cUuid);
              if (ch) {
                targetChar = ch;
                break;
              }
            } catch {}
          }
          if (!targetChar) {
            const chars = await service.getCharacteristics();
            targetChar =
              chars.find(
                (c) => c.properties?.writeWithoutResponse || c.properties?.write
              ) ||
              chars[0] ||
              null;
          }
        } catch {}
      }

      if (!targetChar) {
        try {
          const allServices = await server.getPrimaryServices();
          for (const svc of allServices) {
            const chars = await svc.getCharacteristics();
            const writable = chars.find(
              (c) => c.properties?.writeWithoutResponse || c.properties?.write
            );
            if (writable) {
              targetChar = writable;
              break;
            }
          }
        } catch {}
      }

      if (!targetChar) {
        throw new Error('Characteristic tulis (Write) printer tidak ditemukan.');
      }

      setBtStatus(`Mencetak struk ke ${device.name || 'Printer'}...`);
      const encoder = new TextEncoder();
      const rawBytes = encoder.encode(buildEscPosText());

      const chunkSize = 64;
      for (let i = 0; i < rawBytes.length; i += chunkSize) {
        const chunk = rawBytes.slice(i, i + chunkSize);
        if (
          targetChar.properties?.writeWithoutResponse &&
          typeof targetChar.writeValueWithoutResponse === 'function'
        ) {
          await targetChar.writeValueWithoutResponse(chunk);
        } else if (typeof targetChar.writeValue === 'function') {
          await targetChar.writeValue(chunk);
        }
        await new Promise((r) => setTimeout(r, 25));
      }

      setBtStatus(`✓ Struk berhasil dicetak ke ${device.name || 'Printer Bluetooth'}!`);
      setTimeout(() => setBtStatus(null), 4000);
    } catch (err) {
      const msg = (err as Error)?.message || '';
      if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('canceled')) {
        setBtStatus('Pemilihan printer Bluetooth dibatalkan.');
        setTimeout(() => setBtStatus(null), 2500);
        return;
      }
      setBtStatus(
        'Gagal kirim via Web Bluetooth. Anda juga bisa cetak via aplikasi RawBT di bawah.'
      );
      setShowRawBtFallback(true);
    }
  };

  const handlePrintViaRawBT = () => {
    const escPos = buildEscPosText();
    const base64Data = btoa(unescape(encodeURIComponent(escPos)));
    const rawBtUrl = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    const a = document.createElement('a');
    a.href = rawBtUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* FRAME UTAMA MODAL: Responsif Desktop (lg:max-w-4xl) vs HP (max-w-md) */}
      <div className="relative w-full max-w-md lg:max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* TOP HEADER ELEGAN */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Dokumen Pembayaran</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  #{noStruk}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {jadwal.namaKlien} &bull; {formatTanggalIndo(jadwal.waktuMulai, true)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInvoiceMode('THERMAL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  invoiceMode === 'THERMAL'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧾 Struk 80mm
              </button>
              <button
                type="button"
                onClick={() => setInvoiceMode('A4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  invoiceMode === 'A4'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 Faktur A4
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup Struk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY MODAL: GRID DUA KOLOM DI PC, SATU KOLOM DI HP */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
          {/* KOLOM KIRI (PC) / ATAS (HP): PREVIEW KERTAS */}
          <div className="lg:col-span-7 xl:col-span-8 bg-slate-950/70 p-4 sm:p-6 overflow-y-auto flex justify-center items-start border-b lg:border-b-0 lg:border-r border-slate-800">
            {invoiceMode === 'THERMAL' ? (
              <div
                id="printable-receipt-area"
                className="w-[320px] sm:w-[350px] bg-white text-slate-900 p-5 sm:p-6 rounded-xl shadow-2xl border border-slate-200 relative font-mono text-[11px] leading-tight select-none my-auto"
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                }}
              >
              {/* 1. DANA-STYLE REPEATING WATERMARK BACKGROUND */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden select-none opacity-[0.04] z-0 flex flex-wrap content-start"
                style={{
                  transform: 'rotate(-20deg) scale(1.3)',
                  transformOrigin: 'center center',
                }}
              >
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-black text-slate-950 m-2.5 whitespace-nowrap"
                  >
                    {watermarkBrand} &bull;
                  </div>
                ))}
              </div>

              {/* 2. WATERMARK LOGO BRAND DI TENGAH */}
              {tampilLogoWatermark && finalLogoUrl && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.07] z-0"
                >
                  <img
                    src={finalLogoUrl}
                    alt="Watermark"
                    referrerPolicy="no-referrer"
                    className="w-44 h-44 object-contain filter grayscale"
                  />
                </div>
              )}

              {/* 3. KONTEN STRUK DI LAPISAN DEPAN */}
              <div className="relative z-10 space-y-2">
                {/* Header Toko: Logo di Kiri, Teks Detail di Kanan */}
                <div className="flex items-center gap-3">
                  {tampilLogoSamping && (
                    <div className="shrink-0">
                      {finalLogoUrl ? (
                        <img
                          src={finalLogoUrl}
                          alt="Logo Studio"
                          referrerPolicy="no-referrer"
                          className="h-11 w-auto max-w-[150px] object-contain filter contrast-125"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-xs">
                          KA
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col text-left space-y-0.5 overflow-hidden">
                    <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-950 truncate">
                      {owner.namaBrand || "Kafela's Agenda"}
                    </h2>
                    {owner.noWhatsApp && (
                      <p className="text-[9px] text-slate-600 leading-tight line-clamp-2">{owner.noWhatsApp}</p>
                    )}
                    {alamatStore && (
                      <p className="text-[9px] text-slate-600 leading-tight line-clamp-2">{alamatStore}</p>
                    )}
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-700 my-2" />

                {/* Invoice Meta */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">No. Invoice</span>
                    <span className="font-bold text-slate-950">#{noStruk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tanggal Bayar</span>
                    <span>{tanggalBayar}</span>
                  </div>
                  {jadwal.waktuMulai > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Waktu Acara</span>
                      <span>
                        {formatTanggalIndo(jadwal.waktuMulai, true)}, {formatJamWIB(jadwal.waktuMulai)} WIB
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kasir / Admin</span>
                    <span className="font-semibold text-slate-900">{adminName}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-700 my-2" />

                {/* Nama Klien & Status Pembayaran Utama */}
                <div className="text-center py-1">
                  <div className="text-sm font-black uppercase tracking-tight text-slate-950">
                    {jadwal.namaKlien || 'KLIEN'}
                  </div>
                  {jadwal.namaAcara && (
                    <div className="text-[10px] text-slate-600">{jadwal.namaAcara}</div>
                  )}

                  {/* Banner Status Besar */}
                  <div
                    className={`text-xs font-black tracking-widest mt-2 py-1 px-3 rounded inline-block ${
                      isLunas
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {isLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
                  </div>

                  {sisaTagihan > 0 && (
                    <div className="text-sm font-black text-rose-700 mt-1">
                      Sisa: {keRupiah(sisaTagihan)}
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-700 my-2" />

                {/* Rincian Layanan & Tambahan */}
                <div className="space-y-1 py-0.5">
                  <div className="flex justify-between font-bold text-[11px]">
                    <span>{jadwal.paket || 'Paket Layanan'}</span>
                    <span>{keRupiah(hargaPaketDasar)}</span>
                  </div>

                  {hargaTambahan > 0 && (
                    <div className="flex justify-between text-[10px] text-sky-800">
                      <span>+ {jadwal.namaTambahan || 'Biaya Tambahan'}</span>
                      <span>+ {keRupiah(hargaTambahan)}</span>
                    </div>
                  )}

                  {diskon > 0 && (
                    <div className="flex justify-between text-[10px] text-rose-700 font-semibold">
                      <span>Diskon Khusus</span>
                      <span>- {keRupiah(diskon)}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-700 my-2" />

                {/* Rincian Keuangan */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-extrabold text-slate-950">
                    <span>Total Tagihan</span>
                    <span>{keRupiah(tagihanSetelahDiskon)}</span>
                  </div>

                  {dpDibayar > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Uang Muka (DP)</span>
                      <span>{keRupiah(dpDibayar)}</span>
                    </div>
                  )}

                  {isLunas ? (
                    <div className="flex justify-between font-bold text-emerald-800 pt-0.5">
                      <span>Sisa Pembayaran</span>
                      <span>Rp 0 (LUNAS)</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-rose-700 pt-0.5">
                      <span>Sisa Pelunasan</span>
                      <span>{keRupiah(sisaTagihan)}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-700 my-2" />

                {/* Catatan & Rekening Bank */}
                <div className="text-center space-y-1 text-[10px] pt-0.5 text-slate-700">
                  {jadwal.catatan && jadwal.catatan !== '-' && (
                    <div className="italic text-slate-800 font-semibold">
                      Catatan: {jadwal.catatan}
                    </div>
                  )}
                  {rekening?.rekUtama && (
                    <div className="text-[9px] text-slate-600">
                      Transfer: {rekening.bankUtama} {rekening.rekUtama} a/n {rekening.namaUtama}
                    </div>
                  )}
                </div>

                {/* Wadah Tanda Tangan Owner */}
                {adaTtd && finalTtdUrl && (
                  <div className="mt-2.5 pt-1 flex flex-col items-center justify-center">
                    <img
                      src={finalTtdUrl}
                      alt="Tanda Tangan"
                      referrerPolicy="no-referrer"
                      className="max-w-[150px] max-h-[60px] object-contain -mb-1"
                    />
                    <span className="text-[10px] font-bold text-slate-800 mt-1">
                      ( {owner.namaBrand} )
                    </span>
                  </div>
                )}

                <p className="mt-2 text-center text-[9px] italic text-slate-500 leading-tight">
                  Terima kasih atas kepercayaan Anda.
                  <br />
                  Simpan struk ini sebagai bukti pembayaran yang sah.
                </p>
              </div>
            </div>
            ) : (
              /* LEMBARAN FAKTUR A4 RESMI */
              <div
                id="printable-a4-invoice-area"
                className="w-full max-w-[1024px] bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-200 font-sans text-xs leading-relaxed relative my-auto mx-auto"
                style={{ minWidth: '960px' }}
              >
                {/* Header Faktur A4 */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    {finalLogoUrl ? (
                      <img
                        src={finalLogoUrl}
                        alt="Logo Studio"
                        referrerPolicy="no-referrer"
                        className="h-14 w-auto max-w-[160px] object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                        KA
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg font-extrabold text-slate-950 uppercase tracking-wide">
                        {owner.namaBrand || "Kafela's Agenda"}
                      </h1>
                      {alamatStore && <p className="text-slate-600 text-[11px] mt-0.5">{alamatStore}</p>}
                      {owner.noWhatsApp && <p className="text-slate-600 text-[11px]">{owner.noWhatsApp}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black text-slate-900 tracking-wider">FAKTUR INVOICE</h2>
                    <p className="font-mono font-bold text-sky-600 text-sm mt-1">#{noStruk}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Tanggal: {tanggalBayar}</p>
                  </div>
                </div>

                {/* Info Klien & Acara */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Kepada (Klien):
                    </span>
                    <p className="font-extrabold text-sm text-slate-900">{jadwal.namaKlien || '-'}</p>
                    {jadwal.waPic && <p className="text-slate-600 text-[11px] mt-0.5">WA: {jadwal.waPic}</p>}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Detail Acara:
                    </span>
                    <p className="font-bold text-slate-900 text-xs">{jadwal.namaAcara || 'Sesi Pemotretan'}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">Lokasi: {jadwal.lokasi || 'Studio'}</p>
                    {jadwal.waktuMulai > 0 && (
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Waktu: {formatTanggalIndo(jadwal.waktuMulai, true)}, {formatJamWIB(jadwal.waktuMulai)} WIB
                      </p>
                    )}
                  </div>
                </div>

                {/* Tabel Rincian */}
                <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Deskripsi Layanan & Item</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                        <th className="py-2.5 px-4 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-semibold">
                          {jadwal.paket || 'Paket Layanan Studio'}
                        </td>
                        <td className="py-3 px-4 text-center">1</td>
                        <td className="py-3 px-4 text-right font-mono">{keRupiah(hargaPaketDasar)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{keRupiah(hargaPaketDasar)}</td>
                      </tr>
                      {hargaTambahan > 0 && (
                        <tr>
                          <td className="py-3 px-4 font-semibold text-sky-700">
                            + {jadwal.namaTambahan || 'Biaya Tambahan'}
                          </td>
                          <td className="py-3 px-4 text-center">1</td>
                          <td className="py-3 px-4 text-right font-mono">{keRupiah(hargaTambahan)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sky-700">{keRupiah(hargaTambahan)}</td>
                        </tr>
                      )}
                      {diskon > 0 && (
                        <tr>
                          <td className="py-3 px-4 font-semibold text-rose-700">
                            - Diskon Khusus
                          </td>
                          <td className="py-3 px-4 text-center">1</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-700">-{keRupiah(diskon)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">-{keRupiah(diskon)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rincian Total & Pembayaran */}
       <div className="flex justify-end mb-8">
  <div className="w-72 space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 text-xs">
    <div className="flex justify-between text-slate-600">
      <span>Subtotal:</span>
      <span className="font-mono font-semibold">{keRupiah(totalTarif)}</span>
    </div>
    {diskon > 0 && (
      <div className="flex justify-between text-rose-600">
        <span>Diskon:</span>
        <span className="font-mono font-semibold">-{keRupiah(diskon)}</span>
      </div>
    )}
    <div className="flex justify-between text-slate-900 font-semibold border-t border-slate-200 pt-2">
      <span>Total Tagihan:</span>
      <span className="font-mono font-semibold">{keRupiah(tagihanSetelahDiskon)}</span>
    </div>
    <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2">
      <span>Dibayar (DP / Lunas):</span>
      <span className="font-mono font-semibold text-emerald-700">{keRupiah(nominalDibayar)}</span>
    </div>
    {!isLunas && (
      <div className="flex justify-between text-rose-700 font-semibold border-t border-dashed border-rose-200 pt-2">
        <span>Sisa Pelunasan:</span>
        <span className="font-mono font-semibold">{keRupiah(sisaTagihan)}</span>
      </div>
    )}
  </div>
</div>
                {/* Catatan & Rekening Transfer */}
                <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-6 mt-6 items-end">
                  <div>
                    {rekening?.rekUtama && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-1 mb-3">
                        <p className="font-bold text-slate-900">Instruksi Pembayaran Transfer:</p>
                        <p className="text-slate-700 font-mono">
                          {rekening.bankUtama} : <strong className="text-slate-900">{rekening.rekUtama}</strong>
                        </p>
                        <p className="text-slate-600">a/n {rekening.namaUtama}</p>
                      </div>
                    )}
                    {jadwal.catatan && jadwal.catatan !== '-' && (
                      <p className="text-[11px] text-slate-600 italic">
                        <strong>Catatan:</strong> {jadwal.catatan}
                      </p>
                    )}
                  </div>

                  {/* Tanda Tangan */}
                  <div className="text-center flex flex-col items-center">
                    <p className="text-[11px] text-slate-600 mb-2">Hormat Kami,</p>
                    {finalTtdUrl ? (
                      <img
                        src={finalTtdUrl}
                        alt="Tanda Tangan"
                        referrerPolicy="no-referrer"
                        className="max-w-[140px] max-h-[55px] object-contain my-1"
                      />
                    ) : (
                      <div className="h-12"></div>
                    )}
                    <div className="border-t border-slate-400 w-36 mt-1 pt-1">
                      <p className="font-bold text-xs text-slate-900">{owner.namaBrand || 'Admin Studio'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN (PC): PANEL KONTROL AKSI & STATUS LENGKAP */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 bg-slate-900 p-6 flex-col justify-between overflow-y-auto no-print">
            <div className="space-y-4">
              {/* Ringkasan Cepat */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status Pembayaran:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      isLunas
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}
                  >
                    {isLunas ? 'Lunas' : 'Belum Lunas'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Tagihan:</span>
                  <span className="font-mono font-bold text-white">
                    {keRupiah(tagihanSetelahDiskon)}
                  </span>
                </div>
                {!isLunas && (
                  <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-1.5">
                    <span className="text-rose-400 font-semibold">Sisa Pelunasan:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {keRupiah(sisaTagihan)}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Banner / Feedback */}
              {btStatus && (
                <div className="rounded-xl bg-slate-800 border border-slate-700 text-sky-300 px-3.5 py-2.5 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{btStatus}</span>
                </div>
              )}

              {/* Kelompok Tombol Aksi Utama */}
              <div className="space-y-2.5">
                {invoiceMode === 'A4' ? (
                  <div className="space-y-3 pt-2">
                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs space-y-1.5">
                      <p className="font-bold text-white">📄 Faktur Resmi Format A4</p>
                      <p className="text-slate-400">
                        Klik tombol di bawah untuk mengunduh Faktur A4 resmi beresolusi tinggi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadA4Invoice}
                      disabled={isGeneratingPng}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-4 px-4 text-sm font-extrabold text-white shadow-xl cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <Download className="w-5 h-5 shrink-0" />
                      <span>{isGeneratingPng ? 'Menyimpan Faktur A4...' : 'Simpan'}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 1. Bagikan Gambar Struk (Hero Action) */}
                    <button
                      type="button"
                      onClick={handleShareReceiptImage}
                      disabled={isGeneratingPng}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 py-3.5 px-4 text-xs font-extrabold text-white shadow-lg cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>
                        {isGeneratingPng ? 'Memproses Gambar Struk...' : 'Bagikan Gambar Struk (Share)'}
                      </span>
                    </button>

                    {/* 3. Simpan Gambar PNG */}
                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      disabled={isGeneratingPng}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 px-4 text-xs font-bold text-white cursor-pointer transition-colors"
                    >
                      <FileImage className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Simpan Berkas Gambar (PNG)</span>
                    </button>

                    {/* 4. Cetak Biasa & Bluetooth */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleStandardPrint}
                        disabled={isGeneratingPng}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 py-2.5 px-3 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                      >
                        <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Print Biasa</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleWebBluetoothPrint}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 py-2.5 px-3 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                      >
                        <Bluetooth className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Bluetooth</span>
                      </button>
                    </div>

                    {showRawBtFallback && (
                      <button
                        type="button"
                        onClick={handlePrintViaRawBT}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow mt-1"
                      >
                        <Bluetooth className="w-4 h-4 shrink-0" />
                        <span>Cetak via Aplikasi RawBT</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer PC */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup Struk
              </button>
            </div>
          </div>
        </div>

        {/* HP STICKY BOTTOM ACTION BAR (HANYA MUNCUL DI HP < 1024px) */}
        <div className="block lg:hidden bg-slate-950 border-t border-slate-800 p-3 no-print shrink-0">
          {btStatus && (
            <div className="mb-2 text-[11px] text-sky-300 bg-slate-800 px-3 py-1.5 rounded-lg text-center">
              {btStatus}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareReceiptImage}
              disabled={isGeneratingPng}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 active:bg-sky-700 py-2.5 px-3 text-xs font-extrabold text-white shadow cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isGeneratingPng ? 'Memproses...' : 'Bagikan Gambar'}</span>
            </button>

 <button
                        type="button"
                        onClick={handleWebBluetoothPrint}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 py-2.5 px-3 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                      >
                        <Bluetooth className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span> Print Bluetooth</span>
                      </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isGeneratingPng}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-[11px] font-semibold text-slate-200 cursor-pointer"
            >
              <FileImage className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Simpan PNG</span>
            </button>

            <button
              type="button"
              onClick={handleStandardPrint}
              disabled={isGeneratingPng}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-[11px] font-semibold text-slate-200 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Print Nota</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
