import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Mic,
  Receipt,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AttireModel,
  FotoTeknisModel,
  JadwalFotografi,
  McProtokolModel,
  PaketLayanan,
  PelangganModel,
  WoKoordinasiModel,
} from '../types/kafela';
import {
  bersihkanTitik,
  formatRibuanInput,
  keRupiah,
} from '../utils/formatters';

interface ScheduleAndCashierFormProps {
  modeAwal?: 'KASIR_CEPAT' | 'AGENDA_LENGKAP';
  mode?: 'KASIR_CEPAT' | 'TAMBAH_AGENDA' | 'EDIT_JADWAL' | null;
  selectedDate?: Date;
  defaultDateMillis?: number;
  paketList: PaketLayanan[];
  pelangganList?: PelangganModel[];
  jenisUsaha?: string;
  editItem?: JadwalFotografi | null;
  existingJadwal?: JadwalFotografi | null;
  allJadwalList?: JadwalFotografi[];
  onSave: (jadwal: JadwalFotografi, openStrukImmediately: boolean) => void;
  onSavePelanggan?: (p: PelangganModel) => void;
  onOpenMasterPaket?: () => void;
  onCancel: () => void;
}

export const ScheduleAndCashierForm: React.FC<ScheduleAndCashierFormProps> = ({
  modeAwal,
  mode,
  selectedDate,
  defaultDateMillis,
  paketList,
  pelangganList = [],
  jenisUsaha = '',
  editItem,
  existingJadwal,
  allJadwalList = [],
  onSave,
  onSavePelanggan,
  onOpenMasterPaket,
  onCancel,
}) => {
  const activeEditItem = editItem || existingJadwal || null;
  const resolvedInitialMode: 'KASIR_CEPAT' | 'AGENDA_LENGKAP' = activeEditItem
    ? 'AGENDA_LENGKAP'
    : modeAwal
    ? modeAwal
    : mode === 'KASIR_CEPAT'
    ? 'KASIR_CEPAT'
    : 'AGENDA_LENGKAP';

  const [formMode, setFormMode] = useState<'KASIR_CEPAT' | 'AGENDA_LENGKAP'>(
    resolvedInitialMode
  );
  const [saveToPelangganDb, setSaveToPelangganDb] = useState(false); // Default: tidak simpan

  const fallbackDateMs =
    (selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime())
      ? selectedDate.getTime()
      : undefined) ||
    defaultDateMillis ||
    Date.now();

  const toDateInputStr = (ms: number) => {
    const d = new Date(ms || Date.now());
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const toTimeInputStr = (ms: number, fallback = '08:00') => {
    if (!ms || ms <= 0) return fallback;
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  const [namaAcara, setNamaAcara] = useState(activeEditItem?.namaAcara || '');
  const [namaKlien, setNamaKlien] = useState(activeEditItem?.namaKlien || '');
  const [waKlien, setWaKlien] = useState(
    activeEditItem?.waPic && !activeEditItem.waPic.includes('tidak tersedia')
      ? activeEditItem.waPic
      : ''
  );
  const [paketNama, setPaketNama] = useState(
    activeEditItem?.paket || paketList[0]?.namaPaket || ''
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isManualPaket, setIsManualPaket] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clientInputRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    if (!namaKlien.trim() || namaKlien.trim().length < 1) return [];
    const query = namaKlien.toLowerCase();
    const map = new Map<string, { nama: string; wa: string; sumber: 'DATABASE' | 'RIWAYAT' }>();

    (pelangganList || []).forEach((c) => {
      if (c.nama && c.nama.trim()) {
        map.set(c.nama.trim().toLowerCase(), {
          nama: c.nama.trim(),
          wa: c.noWhatsApp || '',
          sumber: 'DATABASE',
        });
      }
    });

    (allJadwalList || []).forEach((j) => {
      const name = (j.namaKlien || '').trim();
      const wa = (j.waPic || '').trim();
      if (name && wa && !wa.includes('tidak tersedia') && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          nama: name,
          wa: wa,
          sumber: 'RIWAYAT',
        });
      }
    });

    return Array.from(map.values())
      .filter((c) => c.nama.toLowerCase().includes(query) || c.wa.toLowerCase().includes(query))
      .slice(0, 6);
  }, [namaKlien, pelangganList, allJadwalList]);

  const isExistingPelanggan = useMemo(() => {
    const nameClean = namaKlien.trim().toLowerCase();
    const waClean = waKlien.replace(/\D/g, '');
    if (!nameClean && !waClean) return true;

    return (pelangganList || []).some((c) => {
      const cName = (c.nama || '').trim().toLowerCase();
      const cWa = (c.noWhatsApp || '').replace(/\D/g, '');
      return (nameClean && cName === nameClean) || (waClean.length >= 8 && cWa === waClean);
    });
  }, [namaKlien, waKlien, pelangganList]);

  const selectedPaket = useMemo(
    () => paketList.find((p) => p.namaPaket === paketNama),
    [paketList, paketNama]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [lokasi, setLokasi] = useState(
    activeEditItem?.lokasi && activeEditItem.lokasi !== 'di tempat'
      ? activeEditItem.lokasi
      : ''
  );

  const [tglMulaiStr, setTglMulaiStr] = useState(
    toDateInputStr(activeEditItem?.waktuMulai || fallbackDateMs)
  );
  const [tglSelesaiStr, setTglSelesaiStr] = useState(
    toDateInputStr(
      activeEditItem?.tanggalSelesaiEvent || activeEditItem?.waktuMulai || fallbackDateMs
    )
  );
  const [jamMulaiStr, setJamMulaiStr] = useState(
    toTimeInputStr(activeEditItem?.waktuMulai || 0, '09:00')
  );
  const [jamSelesaiStr, setJamSelesaiStr] = useState(
    activeEditItem?.waktuSelesai ? toTimeInputStr(activeEditItem.waktuSelesai, '11:00') : ''
  );

  const [hargaDasarStr, setHargaDasarStr] = useState(
    formatRibuanInput(
      String(
        activeEditItem
          ? activeEditItem.hargaPaketDasar || activeEditItem.hargaKotor
          : paketList[0]?.hargaPaket || 0
      )
    )
  );
  const [diskonStr, setDiskonStr] = useState(
    activeEditItem?.diskon ? formatRibuanInput(String(activeEditItem.diskon)) : ''
  );
  const [namaTambahan, setNamaTambahan] = useState(activeEditItem?.namaTambahan || '');
  const [hargaTambahanStr, setHargaTambahanStr] = useState(
    activeEditItem?.hargaTambahan
      ? formatRibuanInput(String(activeEditItem.hargaTambahan))
      : ''
  );

  const [statusBayar, setStatusBayar] = useState<'Booking' | 'DP' | 'Lunas'>(
    activeEditItem?.status === 'Booking' ||
      activeEditItem?.status === 'DP' ||
      activeEditItem?.status === 'Lunas'
      ? activeEditItem.status
      : formMode === 'KASIR_CEPAT'
      ? 'Lunas'
      : 'Booking'
  );
  const [nominalDpStr, setNominalDpStr] = useState(
    activeEditItem?.dpDibayar ? formatRibuanInput(String(activeEditItem.dpDibayar)) : ''
  );
  const [catatan, setCatatan] = useState(activeEditItem?.catatan || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modul Spesifik Profesi (MUA, Foto, MC, WO)
  const [openMua, setOpenMua] = useState(Boolean(activeEditItem?.attire));
  const [attire, setAttire] = useState<AttireModel>({
    cpwModel: activeEditItem?.attire?.cpwModel || '',
    cpwUkuran: activeEditItem?.attire?.cpwUkuran || '',
    cppModel: activeEditItem?.attire?.cppModel || '',
    cppUkuran: activeEditItem?.attire?.cppUkuran || '',
    catatanAttire: activeEditItem?.attire?.catatanAttire || '',
  });

  const [openFoto, setOpenFoto] = useState(Boolean(activeEditItem?.fotoTeknis));
  const [fotoTeknis, setFotoTeknis] = useState<FotoTeknisModel>({
    jmlShooter: activeEditItem?.fotoTeknis?.jmlShooter || '',
    droneLighting: activeEditItem?.fotoTeknis?.droneLighting || '',
    namaKru: activeEditItem?.fotoTeknis?.namaKru || '',
    linkDrive: activeEditItem?.fotoTeknis?.linkDrive || '',
  });

  const [openMc, setOpenMc] = useState(Boolean(activeEditItem?.mcProtokol));
  const [mcProtokol, setMcProtokol] = useState<McProtokolModel>({
    bahasaGaya: activeEditItem?.mcProtokol?.bahasaGaya || '',
    dresscode: activeEditItem?.mcProtokol?.dresscode || '',
    tokohPenting: activeEditItem?.mcProtokol?.tokohPenting || '',
    catatanKhusus: activeEditItem?.mcProtokol?.catatanKhusus || '',
  });

  const [openWo, setOpenWo] = useState(Boolean(activeEditItem?.woKoordinasi));
  const [woKoordinasi, setWoKoordinasi] = useState<WoKoordinasiModel>({
    jmlUndangan: activeEditItem?.woKoordinasi?.jmlUndangan || '',
    picGedung: activeEditItem?.woKoordinasi?.picGedung || '',
    daftarVendor: activeEditItem?.woKoordinasi?.daftarVendor || '',
    linkRundown: activeEditItem?.woKoordinasi?.linkRundown || '',
  });

  useEffect(() => {
    if (!activeEditItem && formMode === 'KASIR_CEPAT') {
      setStatusBayar('Lunas');
      setLokasi('Studio Utama');
    }
  }, [formMode, activeEditItem]);

  const handlePaketChange = (namaBaru: string) => {
    setPaketNama(namaBaru);
    const cocok = paketList.find((p) => p.namaPaket === namaBaru);
    if (cocok) {
      setHargaDasarStr(formatRibuanInput(String(cocok.hargaPaket)));
    }
  };

  const hargaPaketDasar = bersihkanTitik(hargaDasarStr);
  const hargaTambahan = bersihkanTitik(hargaTambahanStr);
  const hargaTotalKotor = hargaPaketDasar + hargaTambahan;
  const diskon = bersihkanTitik(diskonStr);
  const tagihanBersih = Math.max(0, hargaTotalKotor - diskon);
  const nominalDp = bersihkanTitik(nominalDpStr);

  const generateSequentialInvoiceId = (targetMillis: number, existingList: JadwalFotografi[] = []): string => {
    const d = new Date(targetMillis || Date.now());
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const dateCode = `${dd}${mm}${yy}`; // e.g. 190226

    const matchingOnDate = existingList.filter((j) => {
      const id = (j.idJadwal || '').toUpperCase();
      return id.includes(dateCode) || id.startsWith('INV' + dateCode);
    });

    const nextSeq = matchingOnDate.length + 1;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const suffixIndex = Math.max(0, matchingOnDate.length - 1);
      const suffix = letters[suffixIndex % letters.length];
      return `inv${dateCode}/${nextSeq}${suffix}`;
    }

    return `inv${dateCode}/${nextSeq}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!namaKlien.trim() || !paketNama.trim()) {
      setErrorMessage('Nama klien dan paket harus diisi.');
      return;
    }

    if (diskon > hargaTotalKotor) {
      setErrorMessage('Diskon tidak boleh melebihi harga total!');
      return;
    }
    // TODO: Implement quota check here, passing data from App.tsx via props.
    // Need to pass owner profile and current jadwal count to this component.

    const [yM, mM, dM] = tglMulaiStr.split('-').map(Number);
    const [jamM, minM] = (jamMulaiStr || '09:00').split(':').map(Number);

    const waktuMulaiMs =
      formMode === 'KASIR_CEPAT' && !activeEditItem
        ? Date.now()
        : new Date(yM, mM - 1, dM, jamM || 9, minM || 0, 0, 0).getTime();

    const tanggalMulaiMs = new Date(yM, mM - 1, dM, 0, 0, 0, 0).getTime();

    const [yS, mS, dS] = (tglSelesaiStr || tglMulaiStr).split('-').map(Number);
    const tanggalSelesaiMs = new Date(yS, mS - 1, dS, 0, 0, 0, 0).getTime();

    let waktuSelesaiMs = 0;
    if (jamSelesaiStr) {
      const [jamS, minS] = jamSelesaiStr.split(':').map(Number);
      waktuSelesaiMs = new Date(yM, mM - 1, dM, jamS || 11, minS || 0, 0, 0).getTime();
    }

    const finalAcara = namaAcara.trim()
      ? namaAcara.trim()
      : formMode === 'KASIR_CEPAT'
      ? `Studio - ${paketNama}`
      : `Event ${paketNama}`;

    const dpFinal =
      statusBayar === 'Lunas'
        ? tagihanBersih
        : statusBayar === 'DP'
        ? nominalDp
        : 0;

    const isExistingPelanggan = (pelangganList || []).some(
      (c) => c.nama.toLowerCase() === namaKlien.trim().toLowerCase() || (waKlien.trim() && c.noWhatsApp === waKlien.trim())
    );

    if (!isExistingPelanggan && saveToPelangganDb && onSavePelanggan && namaKlien.trim() && waKlien.trim() && !waKlien.includes('tidak tersedia')) {
      onSavePelanggan({
        idPelanggan: `cust_${Date.now()}`,
        nama: namaKlien.trim(),
        noWhatsApp: waKlien.trim(),
        createdAt: Date.now(),
      });
    }

    const newJadwal: JadwalFotografi = {
      idJadwal: activeEditItem?.idJadwal || generateSequentialInvoiceId(waktuMulaiMs, allJadwalList),
      namaAcara: finalAcara,
      namaKlien: namaKlien.trim(),
      namaPic: namaKlien.trim(),
      waPic: waKlien.trim() || 'Whatsapp tidak tersedia',
      paket: paketNama.trim(),
      lokasi: lokasi.trim() || 'di tempat',
      status: statusBayar,
      hargaPaketDasar,
      namaTambahan: namaTambahan.trim(),
      hargaTambahan,
      hargaKotor: hargaTotalKotor,
      diskon,
      dpDibayar: dpFinal,
      catatan: catatan.trim(),
      sumber: formMode === 'KASIR_CEPAT' ? 'KASIR_POS' : activeEditItem?.sumber || '',
      waktuMulai: waktuMulaiMs,
      waktuSelesai: waktuSelesaiMs,
      tanggalMulai: tanggalMulaiMs,
      tanggalSelesaiEvent: Math.max(tanggalMulaiMs, tanggalSelesaiMs),
    };

    if (attire.cpwModel || attire.cppModel || attire.catatanAttire) {
      newJadwal.attire = attire;
    }
    if (fotoTeknis.jmlShooter || fotoTeknis.namaKru || fotoTeknis.linkDrive) {
      newJadwal.fotoTeknis = fotoTeknis;
    }
    if (mcProtokol.bahasaGaya || mcProtokol.tokohPenting || mcProtokol.catatanKhusus) {
      newJadwal.mcProtokol = mcProtokol;
    }
    if (woKoordinasi.jmlUndangan || woKoordinasi.daftarVendor || woKoordinasi.linkRundown) {
      newJadwal.woKoordinasi = woKoordinasi;
    }

    onSave(newJadwal, true);
  };

  return (

<div className="w-full px-1 rounded-none sm:rounded-xl bg-slate-900 border-slate-800 shadow-lg -mx-0 sm:mx-0">
        {/* Header Form */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white">
            {activeEditItem
              ? 'Edit Jadwal & Transaksi'
              : formMode === 'KASIR_CEPAT'
              ? 'Kasir Cepat (Walk-In)'
              : 'Tambah Agenda & Event Baru'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Tutup Form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher (Kasir Cepat vs Agenda Event) */}
      {!activeEditItem && (
        <div className="p-2 pt-2">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setFormMode('KASIR_CEPAT')}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                formMode === 'KASIR_CEPAT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kasir Cepat
            </button>
            <button
              type="button"
              onClick={() => setFormMode('AGENDA_LENGKAP')}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                formMode === 'AGENDA_LENGKAP'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agenda Event
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-1 py-1 space-y-2 text-[12px]">
        {/* Baris 1: Nama Klien & Nomor WA */}
        <div className="grid grid-cols-2 gap-1">
          <div ref={clientInputRef} className="min-w-0 relative">
            <input
              type="text"
              required
              placeholder="Nama pelanggan *"
              value={namaKlien}
              onChange={(e) => {
                const val = e.target.value;
                setNamaKlien(val);
                setShowSuggestions(true);
                // Auto-fill WhatsApp jika nama yang diketik cocok persis dengan pelanggan tersimpan
                const exact = (pelangganList || []).find(
                  (c) => c.nama.trim().toLowerCase() === val.trim().toLowerCase()
                );
                if (exact && exact.noWhatsApp && (!waKlien.trim() || waKlien.includes('tidak tersedia'))) {
                  setWaKlien(exact.noWhatsApp);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-4 py-3 text-white text-[12px] focus:border-sky-500 focus:outline-none"
            />
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
                <div className="px-3 py-1.5 bg-slate-950 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>Pelanggan Tersimpan</span>
                  <span className="text-sky-400 text-[9px]">Pilih untuk isi WA otomatis</span>
                </div>
                {filteredCustomers.map((cust, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setNamaKlien(cust.nama);
                      setWaKlien(cust.wa);
                      setShowSuggestions(false);
                      setSaveToPelangganDb(false);
                    }}
                    className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {cust.nama}
                        {cust.sumber === 'DATABASE' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold">
                            Database
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 text-[11px] font-semibold">{cust.wa}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <input
              type="tel"
              placeholder="WhatsApp (0812...)"
              value={waKlien}
              onChange={(e) => setWaKlien(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-4 py-3 text-white font-mono text-[12px] focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pertanyaan saat Nama & No. Telp belum tersimpan di database (Default: Tidak Simpan) */}
        {!isExistingPelanggan && namaKlien.trim().length >= 2 && waKlien.trim().length >= 4 && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2 shadow-inner">
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold">
              <UserPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Data pelanggan ini belum tersimpan di database. Simpan data ini?</span>
            </div>
            <div className="flex items-center gap-4 text-xs pl-5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="simpanPelanggan"
                  checked={!saveToPelangganDb}
                  onChange={() => setSaveToPelangganDb(false)}
                  className="accent-slate-400 cursor-pointer"
                />
                <span>Tidak Simpan (Default)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300 font-bold">
                <input
                  type="radio"
                  name="simpanPelanggan"
                  checked={saveToPelangganDb}
                  onChange={() => setSaveToPelangganDb(true)}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Ya, Simpan ke Daftar Pelanggan</span>
              </label>
            </div>
          </div>
        )}

        {/* Khusus Agenda Event: Nama Acara, Lokasi, Tanggal & Jam */}
        {formMode === 'AGENDA_LENGKAP' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1">
              <input
                type="text"
                placeholder="Nama Acara"
                value={namaAcara}
                onChange={(e) => setNamaAcara(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-4 py-3 text-white text-[12px] focus:border-sky-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Lokasi Acara"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-4 py-3 text-white text-[12px] focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
                <span className="px-2 py-2 bg-slate-900 text-slate-400 text-[10px] font-semibold border-r border-slate-800 shrink-0">
                  Mulai
                </span>
                <input
                  type="date"
                  value={tglMulaiStr}
                  onChange={(e) => {
                    setTglMulaiStr(e.target.value);
                    if (e.target.value > tglSelesaiStr) setTglSelesaiStr(e.target.value);
                  }}
                  className="w-full px-2 py-2 text-white font-mono text-[11px] bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
                <span className="px-2 py-2 bg-slate-900 text-slate-400 text-[10px] font-semibold border-r border-slate-800 shrink-0">
                Selesai
                </span>
                <input
                  type="date"
                  value={tglSelesaiStr}
                  min={tglMulaiStr}
                  onChange={(e) => setTglSelesaiStr(e.target.value)}
                  className="w-full px-2 py-2 text-white font-mono text-[11px] bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
                <span className="px-2 py-2 bg-slate-900 text-slate-400 text-[10px] font-semibold border-r border-slate-800 shrink-0">
                  Jam Mulai
                </span>
                <input
                  type="time"
                  value={jamMulaiStr}
                  onChange={(e) => setJamMulaiStr(e.target.value)}
                  className="w-full px-2 py-2 text-white font-mono text-[11px] bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
                <span className="px-2 py-2 bg-slate-900 text-slate-400 text-[10px] font-semibold border-r border-slate-800 shrink-0">
                  Jam Selesai
                </span>
                <input
                  type="time"
                  value={jamSelesaiStr}
                  onChange={(e) => setJamSelesaiStr(e.target.value)}
                  className="w-full px-2 py-2 text-white font-mono text-[11px] bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}


        {/* Baris 2: Pilih Paket Layanan (Dropdown) */}
        <div ref={dropdownRef} className="relative z-30">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300  flex items-center gap-1.5">
            </label>
            <button
              type="button"
              onClick={onOpenMasterPaket}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1"
            >
              <span>+ Atur / Tambah Master Paket</span>
            </button>
          </div>

         
          
   {/* Trigger Dropdown Utama */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
              isDropdownOpen
                ? 'bg-slate-900 border-sky-500 ring-2 ring-sky-500/30'
                : selectedPaket
                ? 'bg-slate-950 border-emerald-500/60 hover:border-emerald-400'
                : 'bg-slate-950 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex-1 min-w-0">
              {selectedPaket ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {selectedPaket.namaPaket}
                  </div>
                  <div className="font-mono font-bold text-emerald-400 text-xs tabular-nums bg-emerald-950/70 border border-emerald-800/70 px-2.5 py-0.5 rounded-md">
                    {keRupiah(selectedPaket.hargaPaket)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs sm:text-sm">
                  {paketNama ? (
                    <span className="text-white font-medium">{paketNama} (Paket Kustom)</span>
                  ) : (
                    '-- Klik untuk memilih paket layanan studio --'
                  )}
                </div>
              )}
              {selectedPaket?.deskripsiPaket && (
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {selectedPaket.deskripsiPaket}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <span className="text-[11px] hidden sm:inline text-slate-500 font-medium">
                {isDropdownOpen ? 'Tutup' : 'Pilih'}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-sky-400' : 'text-slate-400'
                }`}
              />
            </div>
          </button>

          {/* Menu Dropdown Popup yang Muncul Saat Diklik */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800/80">
              <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  Daftar Layanan Tersedia ({paketList.length})
                </span>
                <span className="text-slate-500 text-[10px]">Klik paket untuk memilih</span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                {paketList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <p>Belum ada paket layanan</p>
                    {onOpenMasterPaket && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenMasterPaket();
                        }}
                        className="mt-2 text-sky-400 hover:text-sky-300 underline font-semibold text-xs"
                      >
                        + Tambah Master Paket Baru
                      </button>
                    )}
                  </div>
                ) : (
                  paketList.map((p) => {
                    const isSelected = paketNama === p.namaPaket;
                    return (
                      <div
                        key={p.idPaket}
                        onClick={() => {
                          handlePaketChange(p.namaPaket);
                          setIsDropdownOpen(false);
                          setIsManualPaket(false);
                        }}
                        className={`p-3 text-left cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-white truncate">
                              {p.namaPaket}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          {p.deskripsiPaket && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {p.deskripsiPaket}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm tabular-nums">
                            {keRupiah(p.hargaPaket)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Opsi Ketik Manual / Kustom */}
              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800">
                {!isManualPaket ? (
                  <button
                    type="button"
                    onClick={() => setIsManualPaket(true)}
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-sky-300 hover:bg-slate-800/60 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✏️ Ketik Nama Paket Kustom / Khusus</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-medium">
                      Masukkan nama paket kustom:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cth: Paket Prewedding Khusus Luar Kota"
                        value={paketNama}
                        onChange={(e) => setPaketNama(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>



        {/* Baris 3: Harga Paket, Diskon, Tambahan */}
<div className="grid grid-cols-[4fr_3fr] gap-1">
          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
            <span className="px-2.5 py-2.5 bg-slate-900 text-slate-400 text-[11px] font-bold border-r border-slate-800 shrink-0">
              Harga
            </span>
<input
              type="text"
              placeholder="0"
              value={hargaDasarStr}
              onChange={(e) => setHargaDasarStr(formatRibuanInput(e.target.value))}
              className="w-full px-2.5 py-2 text-white font-mono font-semibold text-xs bg-transparent focus:outline-none"
            /> 
          </div>

          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-rose-500">
            <span className="px-2.5 py-2.5 bg-slate-900 text-rose-400 text-[11px] font-bold border-r border-slate-800 shrink-0">
              Diskon
            </span>
       <input
  type="text"
  inputMode="numeric"
  placeholder="0"
  value={diskonStr}
  onChange={(e) => {
    const angkaSaja = e.target.value.replace(/\D/g, '');
    setDiskonStr(
      angkaSaja ? formatRibuanInput(angkaSaja) : ''
    );
  }}
  className="w-full px-2.5 py-2 text-rose-300 font-mono text-xs bg-transparent focus:outline-none"
/>
          </div>
        </div>

<div className="grid grid-cols-[4fr_3fr] gap-1">
          <input
            type="text"
            placeholder="Item Tambahan (Cth: Cetak 10R / Extra Orang)"
            value={namaTambahan}
            onChange={(e) => setNamaTambahan(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-white text-[12px] focus:border-sky-500 focus:outline-none"
          />

          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 overflow-hidden focus-within:border-sky-500">
            <span className="px-2 py-2 bg-slate-900 text-sky-400 text-[11px] font-bold border-r border-slate-800 shrink-0">
              + Biaya
            </span>
       <input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  placeholder="0"
  value={hargaTambahanStr}
  onChange={(e) => {
    const angkaSaja = e.target.value.replace(/\D/g, '');
    setHargaTambahanStr(
      angkaSaja ? formatRibuanInput(angkaSaja) : ''
    );
  }}
  className="w-full px-2.5 py-2 text-sky-300 font-mono text-xs bg-transparent focus:outline-none"
/>
          </div>
        </div>

        {/* Status Pembayaran Radio (Booking / DP / Lunas) */}
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status Pembayaran:</span>
            <span className="font-mono font-bold text-emerald-400">
              Total: {keRupiah(tagihanBersih)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(['Booking', 'DP', 'Lunas'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusBayar(st)}
                className={`py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                  statusBayar === st
                    ? st === 'Lunas'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : st === 'DP'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                      : 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'Booking' ? 'Belum DP' : st === 'DP' ? 'Sudah DP' : 'Lunas'}
              </button>
            ))}
          </div>

          {statusBayar === 'DP' && (
            <div className="pt-1">
              <div className="flex items-center rounded-lg bg-slate-900 border border-rose-500/50 overflow-hidden focus-within:border-rose-400">
                <span className="px-2.5 py-2 bg-rose-950/60 text-rose-300 text-[11px] font-bold border-r border-rose-900/60 shrink-0">
                  Nominal DP Rp *
                </span>
          <input
  type="text"
  inputMode="numeric"
  placeholder="0"
  value={nominalDpStr}
  onChange={(e) => {
    const angkaSaja = e.target.value.replace(/\D/g, '');
    setNominalDpStr(formatRibuanInput(angkaSaja));
  }}
  className="w-full px-2.5 py-2 text-white font-mono font-bold text-xs bg-transparent focus:outline-none"
/>
              </div>
            </div>
          )}
        </div>

        {/* Catatan & Error Message */}
        <div>
          {errorMessage && (
            <div className="mb-2 p-2 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          <textarea
            rows={1}
            placeholder="Catatan tambahan untuk tim atau struk (Opsional)..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-white text-[12px] focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Pertanyaan Simpan Pelanggan (Jika belum tersimpan di database, default Tidak) */}
        {!activeEditItem && namaKlien.trim() && waKlien.trim() && !waKlien.includes('tidak tersedia') && !(pelangganList || []).some(c => c.nama.toLowerCase() === namaKlien.trim().toLowerCase() || c.noWhatsApp === waKlien.trim()) && (
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-300">
              <span className="font-bold text-amber-300">Pelanggan Baru:</span> Apakah simpan data ini ke database pelanggan?
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={saveToPelangganDb}
                onChange={(e) => setSaveToPelangganDb(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-bold text-white">Simpan (Ya)</span>
            </label>
          </div>
        )}

        {/* 4 MODUL KHUSUS PROFESI (MUA, FOTO, MC, WO) — Persis bs_tambahjadwal.xml */}
        {formMode === 'AGENDA_LENGKAP' && (
          <div className="space-y-1 pt-0">
            {/* 1. Modul MUA */}
            {(jenisUsaha.toLowerCase().includes('mua') ||
              jenisUsaha.toLowerCase().includes('pakaian') ||
              openMua) && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-950/15 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenMua(!openMua)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-purple-300 hover:bg-purple-900/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rincian Busana & Fitting (MUA)</span>
                  </span>
                  {openMua ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openMua && (
                  <div className="p-3 space-y-2.5 border-t border-purple-500/20">
                    <input
                      type="text"
                      placeholder="Model & Warna Baju CPW"
                      value={attire.cpwModel}
                      onChange={(e) => setAttire({ ...attire, cpwModel: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Ukuran CPW (LD / Pinggang / Sepatu / Hijab)"
                      value={attire.cpwUkuran}
                      onChange={(e) => setAttire({ ...attire, cpwUkuran: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Busana CPP"
                        value={attire.cppModel}
                        onChange={(e) => setAttire({ ...attire, cppModel: e.target.value })}
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Ukuran CPP (Jas/Peci/Selop)"
                        value={attire.cppUkuran}
                        onChange={(e) => setAttire({ ...attire, cppUkuran: e.target.value })}
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Baju Ortu, Besan & Aksesoris/Siger"
                      value={attire.catatanAttire}
                      onChange={(e) => setAttire({ ...attire, catatanAttire: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 2. Modul Fotografi */}
            {(jenisUsaha.toLowerCase().includes('foto') ||
              jenisUsaha.toLowerCase().includes('video') ||
              openFoto) && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-950/15 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFoto(!openFoto)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-sky-300 hover:bg-sky-900/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Detail Teknis & Tim Dokumentasi (Foto/Video)</span>
                  </span>
                  {openFoto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openFoto && (
                  <div className="p-3 space-y-2.5 border-t border-sky-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Jumlah Fotografer & Video"
                        value={fotoTeknis.jmlShooter}
                        onChange={(e) =>
                          setFotoTeknis({ ...fotoTeknis, jmlShooter: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Pilot Drone / Lighting"
                        value={fotoTeknis.droneLighting}
                        onChange={(e) =>
                          setFotoTeknis({ ...fotoTeknis, droneLighting: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Nama-nama Crew yang Bertugas"
                      value={fotoTeknis.namaKru}
                      onChange={(e) => setFotoTeknis({ ...fotoTeknis, namaKru: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Link Google Drive File Mentah / Request Khusus"
                      value={fotoTeknis.linkDrive}
                      onChange={(e) => setFotoTeknis({ ...fotoTeknis, linkDrive: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. Modul MC */}
            {(jenisUsaha.toLowerCase().includes('mc') || openMc) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenMc(!openMc)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-amber-300 hover:bg-amber-900/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Protokol & Catatan Khusus MC</span>
                  </span>
                  {openMc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openMc && (
                  <div className="p-3 space-y-2.5 border-t border-amber-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Bahasa / Gaya Acara"
                        value={mcProtokol.bahasaGaya}
                        onChange={(e) =>
                          setMcProtokol({ ...mcProtokol, bahasaGaya: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Dresscode MC"
                        value={mcProtokol.dresscode}
                        onChange={(e) =>
                          setMcProtokol({ ...mcProtokol, dresscode: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Nama Saksi / Tokoh Penting & Gelar"
                      value={mcProtokol.tokohPenting}
                      onChange={(e) =>
                        setMcProtokol({ ...mcProtokol, tokohPenting: e.target.value })
                      }
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. Modul WO */}
            {(jenisUsaha.toLowerCase().includes('wo') || openWo) && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenWo(!openWo)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-emerald-300 hover:bg-emerald-900/20 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Koordinasi Vendor & Rundown (WO)</span>
                  </span>
                  {openWo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openWo && (
                  <div className="p-3 space-y-2.5 border-t border-emerald-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Jumlah Tamu / Porsi Catering"
                        value={woKoordinasi.jmlUndangan}
                        onChange={(e) =>
                          setWoKoordinasi({ ...woKoordinasi, jmlUndangan: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        placeholder="PIC Venue / Gedung"
                        value={woKoordinasi.picGedung}
                        onChange={(e) =>
                          setWoKoordinasi({ ...woKoordinasi, picGedung: e.target.value })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Daftar Vendor (Catering, Dekor, Sound, MUA, Foto)"
                      value={woKoordinasi.daftarVendor}
                      onChange={(e) =>
                        setWoKoordinasi({ ...woKoordinasi, daftarVendor: e.target.value })
                      }
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tombol Simpan & Keluarkan Struk */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-3 px-4 text-xs font-bold text-white shadow-md cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {editItem
                ? 'Simpan Perubahan & Tampilkan Struk'
                : formMode === 'KASIR_CEPAT'
                ? 'Simpan Transaksi & Langsung Cetak Struk'
                : 'Simpan Jadwal & Buka Struk'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
