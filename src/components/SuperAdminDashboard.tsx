import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Key,
  Lock,
  LogOut,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { BrandRegistryItem } from '../types/kafela';
import {
  addOwnerSaldo,
  fetchBrandsRegistryFromFirebase,
  getLocalCachedBrands,
  toggleWebsiteActive,
  updateOwnerSaldo,
} from '../services/firebaseClient';
import { formatTanggalIndo } from '../utils/formatters';

interface SuperAdminDashboardProps {
  onSelectBrandForCashier: (brand: BrandRegistryItem) => void;
  onExitSuperAdmin: () => void;
}

const DEFAULT_MASTER_PIN = '224224';
const PIN_STORAGE_KEY = 'KAFELA_SUPERADMIN_AUTH_KEY';

export function SuperAdminDashboard({
  onSelectBrandForCashier,
  onExitSuperAdmin,
}: SuperAdminDashboardProps) {
  // Autentikasi PIN Master
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(PIN_STORAGE_KEY) === 'UNLOCKED';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Data Brand & Studio
  const [brands, setBrands] = useState<BrandRegistryItem[]>(() => getLocalCachedBrands());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Tambah Saldo
  const [selectedBrandForSaldo, setSelectedBrandForSaldo] = useState<BrandRegistryItem | null>(null);
  const [nominalTambah, setNominalTambah] = useState<number>(50000);
  const [customNominalInput, setCustomNominalInput] = useState<string>('');
  const [modeSaldo, setModeSaldo] = useState<'ADD' | 'SET'>('ADD');

  useEffect(() => {
    if (isUnlocked) {
      loadBrandsData();
    }
  }, [isUnlocked]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadBrandsData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBrandsRegistryFromFirebase();
      setBrands(data);
    } catch (err) {
      console.warn('Gagal memuat brands dari remote, memakai cache:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_MASTER_PIN) {
      sessionStorage.setItem(PIN_STORAGE_KEY, 'UNLOCKED');
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('PIN Master tidak valid. Silakan coba kembali.');
    }
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    setIsUnlocked(false);
    setPinInput('');
  };

  // 1. Tambah Saldo / Set Saldo
  const handleConfirmSaldoChange = async () => {
    if (!selectedBrandForSaldo) return;

    let targetAmount = nominalTambah;
    if (customNominalInput.trim() !== '') {
      const parsed = parseInt(customNominalInput.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        targetAmount = parsed;
      }
    }

    if (modeSaldo === 'ADD' && targetAmount <= 0) {
      alert('Nominal penambahan saldo harus lebih dari Rp 0');
      return;
    }

    setIsLoading(true);
    let res;
    if (modeSaldo === 'ADD') {
      res = await addOwnerSaldo(selectedBrandForSaldo.ownerId, targetAmount, selectedBrandForSaldo.slug);
    } else {
      res = await updateOwnerSaldo(selectedBrandForSaldo.ownerId, targetAmount, selectedBrandForSaldo.slug);
    }
    setIsLoading(false);

    if (res.success) {
      const newSaldoTeks = modeSaldo === 'ADD'
        ? `Saldo "${selectedBrandForSaldo.namaBrand}" berhasil ditambah Rp ${targetAmount.toLocaleString('id-ID')}!`
        : `Saldo "${selectedBrandForSaldo.namaBrand}" berhasil diatur menjadi Rp ${targetAmount.toLocaleString('id-ID')}!`;

      showToast(newSaldoTeks);
      setSelectedBrandForSaldo(null);
      setCustomNominalInput('');
      loadBrandsData();
    } else {
      alert(res.error || 'Gagal memperbarui saldo.');
    }
  };

  // 2. Toggle Status Web (Aktifkan / Nonaktifkan)
  const handleToggleWeb = async (brand: BrandRegistryItem) => {
    const isCurrentlyActive = brand.isWebsiteActive !== false && brand.status === 'AKTIF';
    const actionTeks = isCurrentlyActive ? 'menonaktifkan' : 'mengaktifkan';
    
    if (!confirm(`Konfirmasi untuk ${actionTeks} website studio "${brand.namaBrand}"?`)) {
      return;
    }

    setIsLoading(true);
    const res = await toggleWebsiteActive(brand.ownerId, brand.slug, !isCurrentlyActive);
    setIsLoading(false);

    if (res.success) {
      showToast(
        !isCurrentlyActive
          ? `Website "${brand.namaBrand}" BERHASIL DIAKTIFKAN kembali!`
          : `Website "${brand.namaBrand}" BERHASIL DINONAKTIFKAN (Ditutup)!`
      );
      loadBrandsData();
    } else {
      alert(res.error || `Gagal ${actionTeks} website.`);
    }
  };

  // 3. Nonaktifkan SEMUA Web yang Sudah Kedaluwarsa (1-Klik)
  const handleDeactivateAllExpired = async () => {
    const now = Date.now();
    const expiredActiveBrands = brands.filter(
      (b) => b.expiredAt < now && (b.isWebsiteActive !== false && b.status === 'AKTIF')
    );

    if (expiredActiveBrands.length === 0) {
      alert('Tidak ada website aktif yang kedaluwarsa saat ini. Semua web aktif masih memiliki masa berlaku valid.');
      return;
    }

    if (
      !confirm(
        `Ditemukan ${expiredActiveBrands.length} studio yang masa aktifnya telah KEDALUWARSA namun webnya masih aktif.\n\nNonaktifkan seluruh ${expiredActiveBrands.length} website ini sekarang?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    let countSuccess = 0;
    for (const b of expiredActiveBrands) {
      const res = await toggleWebsiteActive(b.ownerId, b.slug, false);
      if (res.success) countSuccess++;
    }
    setIsLoading(false);

    showToast(`Selesai! Sebanyak ${countSuccess} website kedaluwarsa berhasil dinonaktifkan.`);
    loadBrandsData();
  };

  // Perhitungan Statistik Ringkas
  const stats = useMemo(() => {
    const now = Date.now();
    const total = brands.length;
    let totalSaldo = 0;
    let webAktif = 0;
    let webNonaktif = 0;
    let expiredCount = 0;

    brands.forEach((b) => {
      totalSaldo += b.saldo || 0;
      const isExpired = b.expiredAt < now;
      if (isExpired) expiredCount++;
      if (b.isWebsiteActive !== false && b.status === 'AKTIF') {
        webAktif++;
      } else {
        webNonaktif++;
      }
    });

    return { total, totalSaldo, webAktif, webNonaktif, expiredCount };
  }, [brands]);

  // Filter Data
  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = Date.now();

    return brands.filter((b) => {
      const matchSearch =
        !q ||
        b.namaBrand.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.namaOwner && b.namaOwner.toLowerCase().includes(q)) ||
        (b.ownerWhatsApp && b.ownerWhatsApp.includes(q));

      if (!matchSearch) return false;

      const isExpired = b.expiredAt < now;
      const isActive = b.isWebsiteActive !== false && b.status === 'AKTIF';

      if (filterStatus === 'ACTIVE') return isActive;
      if (filterStatus === 'INACTIVE') return !isActive;
      if (filterStatus === 'EXPIRED') return isExpired;

      return true;
    });
  }, [brands, searchQuery, filterStatus]);

  // =========================================================================
  // LOCK SCREEN PIN MASTER
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center justify-center text-sky-400 mb-5 mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-center text-slate-100 mb-1">
            Super Admin Console
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6">
            Pusat Pengelolaan Saldo Klien &amp; Kontrol Status Website Studio
          </p>

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Masukkan PIN Master
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN Master ()"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-sm font-mono text-center tracking-widest text-slate-100 focus:outline-none"
                  autoFocus
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              {pinError && <p className="text-xs text-rose-400 mt-2 text-center">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-600/20"
            >
              <Lock className="w-4 h-4" /> Buka Master Console
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <button
              onClick={onExitSuperAdmin}
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              ← Kembali ke Kasir Studio
            </button>
            <span className="font-mono text-[11px] text-slate-600">v.4.16 SuperAdmin</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN UTAMA SUPER ADMIN SIMPEL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Super Admin Console
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pusat Kelola Saldo Klien &amp; Kontrol Akses Website Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Nonaktifkan Semua Web Kedaluwarsa */}
            {stats.expiredCount > 0 && (
              <button
                type="button"
                onClick={handleDeactivateAllExpired}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Tutup semua website yang masa aktif langganannya sudah habis"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Nonaktifkan Web Kedaluwarsa ({stats.expiredCount})</span>
              </button>
            )}

            {/* Refresh Data */}
            <button
              type="button"
              onClick={loadBrandsData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              title="Refresh Data dari Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Kembali ke Kasir */}
            <button
              type="button"
              onClick={onExitSuperAdmin}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Buka Kasir</span>
            </button>

            {/* Kunci Admin */}
            <button
              type="button"
              onClick={handleLockAdmin}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
              title="Kunci Super Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* STAT STRIP: 4 KARTU METRIK RINGKAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Studio */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">Total Studio</span>
              <Globe className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.total}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Klien terdaftar di Firestore
            </div>
          </div>

          {/* 2. Total Saldo Beredar */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-amber-300 font-medium">Total Saldo Beredar</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              Rp {stats.totalSaldo.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Total saldo seluruh owner studio
            </div>
          </div>

          {/* 3. Web Aktif */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-emerald-300 font-medium">Website Aktif (Buka)</span>
              <Power className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats.webAktif}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bisa diakses publik &amp; booking
            </div>
          </div>

          {/* 4. Web Ditutup / Kedaluwarsa */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-rose-300 font-medium">Web Ditutup / Expired</span>
              <PowerOff className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {stats.webNonaktif}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.expiredCount} studio sudah habis masa aktif
            </div>
          </div>
        </div>

        {/* PENCARIAN & FILTER BAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama studio, owner, WhatsApp, atau slug..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                filterStatus === 'ACTIVE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400'
              }`}
            >
              Web Aktif ({stats.webAktif})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                filterStatus === 'INACTIVE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400'
              }`}
            >
              Web Ditutup ({stats.webNonaktif})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                filterStatus === 'EXPIRED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400'
              }`}
            >
              Kedaluwarsa ({stats.expiredCount})
            </button>
          </div>
        </div>

        {/* TABEL SEDERHANA: LIHAT SALDO, TAMBAH SALDO, & KONTROL WEB */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Studio &amp; Owner</th>
                  <th className="py-3.5 px-4">Saldo Saat Ini</th>
                  <th className="py-3.5 px-4 text-center">Aksi Tambah Saldo</th>
                  <th className="py-3.5 px-4">Status Web &amp; Masa Berlaku</th>
                  <th className="py-3.5 px-4 text-right">Kontrol Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Tidak ada studio yang cocok dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((b) => {
                    const now = Date.now();
                    const isExpired = b.expiredAt < now;
                    const daysLeft = Math.ceil((b.expiredAt - now) / (1000 * 60 * 60 * 24));
                    const isWebActive = b.isWebsiteActive !== false && b.status === 'AKTIF';
                    const currentSaldo = b.saldo || 0;

                    return (
                      <tr key={b.slug || b.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Studio & Owner */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                            <span>{b.namaBrand}</span>
                          </div>
                          <div className="font-mono text-[11px] text-sky-400 mt-0.5 flex items-center gap-1">
                            <span>/{b.slug}</span>
                            <a
                              href={`/profil.html?id=${encodeURIComponent(b.slug)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-sky-300 transition-colors"
                              title="Buka Website Profil Publik"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {b.namaOwner || 'Owner'} {b.ownerWhatsApp && `· ${b.ownerWhatsApp}`}
                          </div>
                        </td>

                        {/* 2. Saldo Saat Ini (LIHAT SALDO) */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex flex-col">
                            <span className="text-base font-extrabold font-mono text-amber-400">
                              Rp {currentSaldo.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Tersinkron di Firestore
                            </span>
                          </div>
                        </td>

                        {/* 3. Aksi Tambah Saldo (MENAMBAH SALDO) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBrandForSaldo(b);
                                setModeSaldo('ADD');
                                setNominalTambah(50000);
                                setCustomNominalInput('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title={`Tambah saldo untuk ${b.namaBrand}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Saldo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBrandForSaldo(b);
                                setModeSaldo('SET');
                                setNominalTambah(currentSaldo);
                                setCustomNominalInput(String(currentSaldo));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                              title="Set angka saldo secara spesifik"
                            >
                              Atur Angka
                            </button>
                          </div>
                        </td>

                        {/* 4. Status Web & Masa Berlaku */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                isWebActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isWebActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {isWebActive ? 'Web Aktif' : 'Web Ditutup'}
                            </span>

                            {isExpired && (
                              <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-800">
                                KEDALUWARSA
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] font-mono mt-1 text-slate-400">
                            {daysLeft > 0 ? (
                              <span className={daysLeft <= 7 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                Masa aktif: sisa {daysLeft} hari
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold">
                                Habis sejak {Math.abs(daysLeft)} hari lalu
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            s/d {formatTanggalIndo(b.expiredAt)}
                          </div>
                        </td>

                        {/* 5. Kontrol Website (TOMBOL AKTIFKAN / NONAKTIFKAN) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleWeb(b)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                isWebActive
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                              title={
                                isWebActive
                                  ? 'Nonaktifkan / tutup website studio ini'
                                  : 'Aktifkan kembali website studio ini'
                              }
                            >
                              {isWebActive ? (
                                <>
                                  <PowerOff className="w-3.5 h-3.5" />
                                  <span>Nonaktifkan Web</span>
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5" />
                                  <span>Aktifkan Web</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectBrandForCashier(b)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Buka Kasir Studio Ini"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL INTERAKTIF TAMBAH / SET SALDO */}
      {/* ========================================================================= */}
      {selectedBrandForSaldo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {modeSaldo === 'ADD' ? 'Tambah Saldo Studio' : 'Atur Saldo Studio'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedBrandForSaldo.namaBrand} (/{selectedBrandForSaldo.slug})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBrandForSaldo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Modal */}
            <div className="p-5 space-y-4">
              {/* Saldo Saat Ini */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Saldo Saat Ini:</span>
                  <span className="text-lg font-mono font-bold text-amber-400">
                    Rp {(selectedBrandForSaldo.saldo || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Owner Studio:</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedBrandForSaldo.namaOwner || 'Owner'}
                  </span>
                </div>
              </div>

              {/* Mode Pemilihan */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setModeSaldo('ADD')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    modeSaldo === 'ADD' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  + Tambah Saldo
                </button>
                <button
                  type="button"
                  onClick={() => setModeSaldo('SET')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    modeSaldo === 'SET' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Atur Nominal Pasti
                </button>
              </div>

              {/* Pilihan Nominal Cepat (Chips) */}
              {modeSaldo === 'ADD' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Pilih Nominal Cepat:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[25000, 50000, 100000, 200000, 500000, 1000000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          setNominalTambah(nom);
                          setCustomNominalInput('');
                        }}
                        className={`py-2 px-2.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                          nominalTambah === nom && !customNominalInput
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        +{nom >= 1000000 ? `${nom / 1000000} Jt` : `${nom / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Nominal Kustom */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {modeSaldo === 'ADD' ? 'Atau Masukkan Nominal Penambahan:' : 'Masukkan Nominal Saldo Baru:'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={customNominalInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setCustomNominalInput(clean);
                      if (clean) setNominalTambah(parseInt(clean, 10));
                    }}
                    placeholder={modeSaldo === 'ADD' ? String(nominalTambah) : '0'}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Simulasi Saldo Akhir */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-300">Total Saldo Setelah Ini:</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  Rp{' '}
                  {modeSaldo === 'ADD'
                    ? ((selectedBrandForSaldo.saldo || 0) + (customNominalInput ? parseInt(customNominalInput || '0', 10) : nominalTambah)).toLocaleString('id-ID')
                    : (customNominalInput ? parseInt(customNominalInput || '0', 10) : nominalTambah).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedBrandForSaldo(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSaldoChange}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Saldo ke Firestore</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
