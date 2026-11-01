import React, { useState, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  MessageSquare,
  PenTool,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  AnggotaTimModel,
  DAFTAR_JENIS_USAHA,
  JadwalFotografi,
  OwnerProfile,
  PaketLanggananTier,
  PaketLayanan,
  PelangganModel,
  RekeningModel,
  UserRoleType,
  WebLayoutType,
} from '../types/kafela';
import {
  bersihkanSlugBrand,
  bersihkanTitik,
  buatLoginIdKru,
  formatRibuanInput,
  formatTanggalIndo,
  keRupiah,
} from '../utils/formatters';
import { ProfessionPresetKey } from '../services/demoDataSeeder';
import { checkAndIncrementActions, renewSubscriptionWithSaldo } from '../services/firebaseClient';
import { TopUpModal } from './TopUpModal';
import { SubscriptionExpiredScreen } from './SubscriptionExpiredScreen';


/* ============================================================================
 * 1. LAPORAN KEUANGAN & PIUTANG VIEW (Persis LaporanActivity.kt — 0 Read!)
 * ========================================================================== */
export const LaporanKeuanganView: React.FC<{
  jadwalAktif: JadwalFotografi[];
  onSelectJadwal: (j: JadwalFotografi) => void;
  userRole?: UserRoleType;
}> = ({ jadwalAktif, onSelectJadwal, userRole }) => {
  const isAdmin = userRole === 'admin';
  const [subTab, setSubTab] = useState<'KEUANGAN' | 'PIUTANG'>('KEUANGAN');
  const [bulanCursor, setBulanCursor] = useState<Date>(() => new Date());
  const [hariFilter, setHariFilter] = useState<number>(0); // 0 = Semua Hari

  const targetMonth = bulanCursor.getMonth();
  const targetYear = bulanCursor.getFullYear();
  const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const jadwalBulanIni = jadwalAktif
    .filter((j) => {
      if ((j.status || '').toLowerCase() === 'dibatalkan') return false;
      const ms = j.tanggalMulai || j.waktuMulai;
      if (!ms) return false;
      const d = new Date(ms);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    })
    .sort((a, b) => a.waktuMulai - b.waktuMulai);

  let totalPemasukanBulanIni = 0;
  let totalOmzetBulanIni = 0;
  let totalPemasukanFilter = 0;

  const listTransaksiFilter = jadwalBulanIni.filter((j) => {
    const omzetAcara = Math.max(0, j.hargaKotor - j.diskon);
    totalOmzetBulanIni += omzetAcara;

    const statusKecil = j.status.toLowerCase();
    const uangMasuk =
      statusKecil === 'lunas' ? omzetAcara : statusKecil === 'dp' ? j.dpDibayar : 0;
    totalPemasukanBulanIni += uangMasuk;

    const d = new Date(j.tanggalMulai || j.waktuMulai);
    const cocokHari = hariFilter === 0 || d.getDate() === hariFilter;
    if (cocokHari) {
      totalPemasukanFilter += uangMasuk;
    }
    return cocokHari;
  });

  const listPiutang = jadwalAktif
    .filter((j) => {
      const st = j.status.toLowerCase();
      if (st === 'lunas' || st === 'dibatalkan') return false;
      const sisa = j.hargaKotor - j.diskon - j.dpDibayar;
      return sisa > 0;
    })
    .sort((a, b) => a.waktuMulai - b.waktuMulai);

  const namaBulanTahun = bulanCursor.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-2 px-0">
      {/* Header & Switch Keuangan vs Piutang */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
        <div>
          <h2 className="text-base font-bold text-white">
            {subTab === 'KEUANGAN'
              ? 'Laporan Keuangan & Omzet'
              : 'Daftar Klien Belum Lunas (Piutang)'}
          </h2>
     
        </div>

        <div className="flex items-center gap-1 p-0rounded-lg bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('KEUANGAN')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'KEUANGAN'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Laporan Keuangan
          </button>
          <button
            type="button"
            onClick={() => setSubTab('PIUTANG')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'PIUTANG'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Piutang ({listPiutang.length})
          </button>
        </div>
      </div>

      {subTab === 'KEUANGAN' ? (
        <>
          {/* Navigasi Bulan & Ringkasan Kas / Omzet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mt-0">
                <button
                  type="button"
                  disabled={isAdmin}
                  onClick={() => {
                    if (isAdmin) return;
                    setBulanCursor(new Date(targetYear, targetMonth - 1, 1));
                    setHariFilter(0);
                  }}
                  className={`p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 ${
                    isAdmin ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'
                  }`}
                  title={isAdmin ? 'Admin hanya dapat melihat laporan bulan berjalan' : 'Bulan sebelumnya'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-sm font-extrabold text-white">{namaBulanTahun}</span>
                  {isAdmin && (
                    <p className="text-[10px] text-amber-400 font-medium">Bulan Berjalan</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isAdmin}
                  onClick={() => {
                    if (isAdmin) return;
                    setBulanCursor(new Date(targetYear, targetMonth + 1, 1));
                    setHariFilter(0);
                  }}
                  className={`p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 ${
                    isAdmin ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'
                  }`}
                  title={isAdmin ? 'Admin hanya dapat melihat laporan bulan berjalan' : 'Bulan berikutnya'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          <div className="grid grid-cols-2 gap-3">
  {/* Card Total Pemasukan */}
  <div className="rounded-xl bg-slate-900 border border-slate-800 p-2">
    <span className="text-xs text-slate-400">Total Pemasukan</span>
    <div className="text-xm font-extrabold font-mono text-emerald-400 mt-1">
      {keRupiah(totalPemasukanBulanIni)}
    </div>
  </div>

  {/* Card Total Omzet Bulan Ini */}
  <div className="rounded-xl bg-slate-900 border border-slate-800 p-2">
    <span className="text-xs text-slate-400">Total Omzet</span>
    <div className="text-xm font-extrabold font-mono text-sky-400 mt-1">
      {keRupiah(totalOmzetBulanIni)}
    </div>
  </div>
</div>
          </div>

          {/* Filter Hari & Tabel Rincian Uang Masuk */}
          <div className="rounded-xl bg-slate-900 border  border-slate-800 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setHariFilter((prev) => (prev <= 0 ? maxDaysInMonth : prev - 1))
                    }
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    &lt;&lt;
                  </button>
                  <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-bold text-sky-300 min-w-[110px] text-center">
                    {hariFilter === 0 ? 'Semua Hari' : `Tanggal ${hariFilter}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setHariFilter((prev) => (prev >= maxDaysInMonth ? 0 : prev + 1))
                    }
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    &gt;&gt;
                  </button>
                  {hariFilter !== 0 && (
                    <button
                      type="button"
                      onClick={() => setHariFilter(0)}
                      className="text-[11px] text-slate-400 hover:text-white ml-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs font-mono font-bold text-emerald-400">
                {keRupiah(totalPemasukanFilter)}
              </div>
            </div>

            {listTransaksiFilter.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada transaksi pada periode filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                      <th className="py-3 px-2.5  font-semibold text-[10px] ">Waktu Acara</th>
                      <th className="py-3 px-1 font-semibold">Klien & Acara</th>
                      <th className="py-3 px-1 font-semibold">Paket</th>
                      <th className="py-3 px-1 font-semibold  text-[11px] text-right">Uang Masuk</th>
                      <th className="py-3 px-1 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {listTransaksiFilter.map((item) => {
                      const st = item.status.toLowerCase();
                      const omzet = Math.max(0, item.hargaKotor - item.diskon);
                      const masuk = st === 'lunas' ? omzet : st === 'dp' ? item.dpDibayar : 0;
                      return (
                        <tr
                          key={item.idJadwal}
                          onClick={() => onSelectJadwal(item)}
                          className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-1.5 text-[10px] text-slate-300">
                            {formatTanggalIndo(item.waktuMulai, true)}
                          </td>
                          <td className="py-2 px-1">
                            <div className="font-bold text-white">{item.namaKlien}</div>
                            <div className="text-[11px] text-slate-400">{item.namaAcara}</div>
                          </td>
                          <td className="py-2 px-1 text-slate-300">{item.paket}</td>
                          <td className="py-2 px-1 font-mono font-bold text-emerald-400 text-right">
                            {keRupiah(masuk).replace('Rp', '')}
                          </td>
                          <td className="py-3 px-1 text-right font-bold">
                            <span
                              className={
                                st === 'lunas'
                                  ? 'text-emerald-400'
                                  : st === 'dp'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }
                            >
                              {item.status                         }
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* TABEL PIUTANG (KLIEN BELUM LUNAS) */
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-2 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              Daftar Klien Belum Lunas
            </span>
            <span className="text-xs font-mono font-bold text-rose-400">
              Piutang:{' '}
              {keRupiah(
                listPiutang.reduce(
                  (acc, cur) => acc + Math.max(0, cur.hargaKotor - cur.diskon - cur.dpDibayar),
                  0
                )
              )}
            </span>
          </div>

          {listPiutang.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Semua klien sudah lunas! Tidak ada tagihan tertunggak.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                      <th className="py-3 px-2.5  font-semibold text-[10px] ">Waktu Acara</th>
                    <th className="py-3 px-1 font-semibold">Klien & Acara</th>
                    <th className="py-3 px-1 font-semibold  text-[11px]">Nominal DP</th>
                    <th className="py-3 px-1 font-semibold text-[11px]  text-right">Sisa Tagihan</th>
                    <th className="py-3 px-1 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {listPiutang.map((item) => {
                    const sisa = Math.max(0, item.hargaKotor - item.diskon - item.dpDibayar);
                    return (
                      <tr
                        key={item.idJadwal}
                        onClick={() => onSelectJadwal(item)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                          <td className="py-2 px-1.5 text-[10px] text-slate-300">
                          {formatTanggalIndo(item.waktuMulai, true)}
                        </td>
                        <td className="py-3 px-1">
                          <div className="font-bold text-white">{item.namaKlien}</div>
                          <div className="text-[11px] text-slate-400">{item.namaAcara}</div>
                        </td>
                        <td className="py-3 px-1 font-mono text-slate-300 text-right">
                          {keRupiah(item.dpDibayar).replace('Rp', '')}
                        </td>
                        <td className="py-3 px-1 font-mono font-bold text-rose-400 text-right">
                          {keRupiah(sisa).replace('Rp', '')}
                        </td>
                        <td className="py-3 px-1 text-[11px]  text-right font-bold text-amber-400">
                          {item.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. PENCARIAN GUDANG ARSIP & MESIN KOMPRESI 2 BULAN (Persis ArsipActivity.kt)
 * ========================================================================== */
export const ArsipPencarianView: React.FC<{
  jadwalAktif: JadwalFotografi[];
  jadwalArsip: JadwalFotografi[];
  onSelectAktif: (j: JadwalFotografi) => void;
  onRestoreFromArsip: (j: JadwalFotografi) => void;
}> = ({
  jadwalAktif,
  jadwalArsip,
  onSelectAktif,
  onRestoreFromArsip,
}) => {
  const [query, setQuery] = useState('');

  const gabungan = [...jadwalAktif, ...jadwalArsip].sort(
    (a, b) => b.waktuMulai - a.waktuMulai
  );

  const hasilFilter = query.trim()
    ? gabungan.filter(
        (j) =>
          j.namaKlien.toLowerCase().includes(query.toLowerCase()) ||
          j.namaAcara.toLowerCase().includes(query.toLowerCase()) ||
          j.paket.toLowerCase().includes(query.toLowerCase())
      )
    : jadwalArsip;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              Cari Data & Arsip
            </h2>
          </div>
        
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Ketik nama klien, acara, atau paket di seluruh data aktif & arsip..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

        {hasilFilter.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Data tidak ditemukan di gudang arsip maupun jadwal aktif.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {hasilFilter.map((item) => (
              <div
                key={item.idJadwal}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white text-sm">{item.namaKlien}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{item.namaAcara}</span>
                    <span className="text-slate-500">·</span>
                    <span
                      className={
                        item.isFromArchive
                          ? 'text-indigo-400 font-semibold'
                          : 'text-emerald-400 font-semibold'
                      }
                    >
                      {item.isFromArchive
                        ? `Arsip (${item.archiveDocId || 'arsip_kompresi'})`
                        : 'Jadwal Aktif'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {formatTanggalIndo(item.waktuMulai)} · Paket: {item.paket} · Nilai:{' '}
                    {keRupiah(item.hargaKotor - item.diskon)} ({item.status})
                  </div>
                </div>

                <div>
                  {item.isFromArchive ? (
                    <button
                      type="button"
                      onClick={() => onRestoreFromArsip(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tarik & Buka ke Aktif</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectAktif(item)}
                      className="rounded-lg border border-slate-700 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Lihat Detail
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

/* ============================================================================
 * 3. MASTER PAKET LAYANAN VIEW (Persis MasterPaketActivity.kt)
 * ========================================================================== */
export const MasterPaketView: React.FC<{
  paketList: PaketLayanan[];
  onSavePaket: (p: PaketLayanan) => void;
  onDeletePaket: (id: string) => void;
  onMoveOrder: (index: number, direction: -1 | 1) => void;
}> = ({ paketList, onSavePaket, onDeletePaket, onMoveOrder }) => {
  const [editingPaket, setEditingPaket] = useState<PaketLayanan | null>(null);
  const [namaPaket, setNamaPaket] = useState('');
  const [hargaStr, setHargaStr] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const startEdit = (p: PaketLayanan) => {
    setEditingPaket(p);
    setNamaPaket(p.namaPaket);
    setHargaStr(formatRibuanInput(String(p.hargaPaket)));
    setDeskripsi(p.deskripsiPaket);
  };

  const resetForm = () => {
    setEditingPaket(null);
    setNamaPaket('');
    setHargaStr('');
    setDeskripsi('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPaket.trim()) return;
    onSavePaket({
      idPaket: editingPaket?.idPaket || `pkt-${Date.now()}`,
      namaPaket: namaPaket.trim(),
      hargaPaket: bersihkanTitik(hargaStr),
      deskripsiPaket: deskripsi.trim(),
      urutan: editingPaket ? editingPaket.urutan : paketList.length,
    });
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Daftar Paket (7 Kolom) */}
      <div className="lg:col-span-7 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-2 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Daftar Paket Layanan</h2>
            <p className="text-xs text-slate-400">
              Urutan paket di sini otomatis tampil di Kasir PC, Aplikasi HP, dan Form Website
            </p>
          </div>
          <span className="px-2 text-xs font-mono text-sky-400">{paketList.length} Layanan</span>
        </div>

        <div className="divide-y divide-slate-800">
          {paketList.map((item, idx) => (
            <div
              key={item.idPaket}
              className="p-2 flex items-start justify-between gap-4 hover:bg-slate-800/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveOrder(idx, -1)}
                    className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Naikkan urutan"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === paketList.length - 1}
                    onClick={() => onMoveOrder(idx, 1)}
                    className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Turunkan urutan"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{item.namaPaket}</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {keRupiah(item.hargaPaket)}
                  </div>
                  {item.deskripsiPaket && (
                    <p className="text-xs text-slate-400 mt-1">{item.deskripsiPaket}</p>
                  )}
                </div>
              </div>
<div className="flex flex-col items-center gap-1.5 shrink-0">
  <button
    type="button"
    onClick={() => startEdit(item)}
    className="w-full px-2.5 py-1 rounded-lg border border-sky-500/50 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold cursor-pointer text-center"
  >
    Ubah
  </button>

  <button
    type="button"
    onClick={() => onDeletePaket(item.idPaket)}
    className="w-full flex items-center justify-center p-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
    title="Hapus Paket"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Tambah / Edit Paket (5 Kolom) */}
      <div className="lg:col-span-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
            {editingPaket ? 'Edit Paket Layanan' : 'Tambah Paket Layanan Baru'}
          </h3>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Nama Paket (Cth: Self Photo / Prewedding Gold) *
            </label>
            <input
              type="text"
              required
              value={namaPaket}
              onChange={(e) => setNamaPaket(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Harga Dasar (Rp) *</label>
            <input
              type="text"
              required
              placeholder="350.000"
              value={hargaStr}
              onChange={(e) => setHargaStr(formatRibuanInput(e.target.value))}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Catatan / Deskripsi Paket (Opsional)
            </label>
            <textarea
              rows={3}
              placeholder="Rincian fasilitas paket yang didapat klien..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {editingPaket && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingPaket ? 'Simpan Perubahan' : 'Simpan Paket Baru'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. KELOLA TIM & CREW STUDIO VIEW (Persis KelolaTimActivity.kt)
 * ========================================================================== */
export const KelolaTimView: React.FC<{
  timList: AnggotaTimModel[];
  namaBrand: string;
  ownerUid: string;
  paketAktif?: PaketLanggananTier | string;
  onAddTim: (anggota: AnggotaTimModel) => void;
  onRemoveTim: (uid: string) => void;
}> = ({ timList, namaBrand, ownerUid, paketAktif = 'Pro', onAddTim, onRemoveTim }) => {
  const [nama, setNama] = useState('');
  const [identitasLogin, setIdentitasLogin] = useState('');
  const [password, setPassword] = useState('');
  const [posisi, setPosisi] = useState('');
  const [role, setRole] = useState<'anggota' | 'admin'>('admin');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Aturan Kuota Staf Studio:
  // - Standar: 0 Admin, 0 Crew, 1 Owner (Maks 0 staf tambahan)
  // - Pro: 1 Admin, 0 Crew, 1 Owner (Maks 1 staf bertipe admin)
  // - Ultimate: 2 Admin, 10 Crew, 1 Owner (Maks 2 admin dan 10 crew)
  const normalizedPaket = String(paketAktif || 'Starter').toLowerCase();
  const isUltimate = normalizedPaket.includes('ultimate');
  const isPro = normalizedPaket.includes('pro');
  const isStandar = !isUltimate && !isPro;

  const currentAdmin = timList.filter((t) => t.role === 'admin').length;
  const currentCrew = timList.filter((t) => t.role === 'anggota').length;

  const maxAdmin = isUltimate ? 2 : isPro ? 1 : 0;
  const maxCrew = isUltimate ? 10 : 0;

  const isAdminFull = currentAdmin >= maxAdmin;
  const isCrewFull = currentCrew >= maxCrew;

  const isLimitReached = isStandar
    ? true
    : isPro
    ? currentAdmin >= 1 || timList.length >= 1
    : isAdminFull && isCrewFull;

  // Otomatis arahkan role jika kuota salah satu peran penuh
  React.useEffect(() => {
    if (isPro) {
      setRole('admin');
    } else if (isUltimate) {
      if (isAdminFull && !isCrewFull) {
        setRole('anggota');
      } else if (isCrewFull && !isAdminFull) {
        setRole('admin');
      }
    }
  }, [isPro, isUltimate, isAdminFull, isCrewFull]);

  // State toast peringatan / informasi & konfirmasi hapus crew
  const [pendingDeleteTim, setPendingDeleteTim] = useState<AnggotaTimModel | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'warning' | 'info' | 'success';
    text: string;
  } | null>(null);

  const brandSlug = bersihkanSlugBrand(namaBrand);

  // Deteksi apakah input berupa nomor WhatsApp (angka murni minimal 9 digit)
  const numericOnly = identitasLogin.trim().replace(/[^0-9]/g, '');
  const isInputWa =
    numericOnly.length >= 9 &&
    (identitasLogin.trim().startsWith('0') ||
      identitasLogin.trim().startsWith('62') ||
      identitasLogin.trim().startsWith('+62') ||
      identitasLogin.trim().startsWith('8'));

  let previewLoginId = '';
  if (isInputWa) {
    let w = numericOnly;
    if (w.startsWith('62')) w = '0' + w.substring(2);
    previewLoginId = w;
  } else {
    const rawVal = identitasLogin.trim() || (nama.trim().split(' ')[0] || '');
    const userClean = rawVal.toLowerCase().replace(/[^a-z0-9_]/g, '');
    previewLoginId = userClean ? buatLoginIdKru(userClean, namaBrand) : '';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi aturan paket langganan
    if (isStandar) {
      setToastMessage({
        type: 'warning',
        text: '⚠️ Paket Standar hanya untuk 1 Owner (0 Admin, 0 Crew). Upgrade ke Pro untuk 1 Admin atau Ultimate untuk 2 Admin & 10 Crew.',
      });
      return;
    }

    if (isPro && isLimitReached) {
      setToastMessage({
        type: 'warning',
        text: '⚠️ Paket Pro hanya mengizinkan 1 Admin & 1 Owner (0 Crew). Kuota admin telah terisi. Upgrade ke Ultimate untuk 2 Admin & 10 Crew.',
      });
      return;
    }

    if (isUltimate) {
      if (role === 'admin' && isAdminFull) {
        setToastMessage({
          type: 'warning',
          text: '⚠️ Kuota Admin untuk Paket Ultimate telah penuh (2/2 Admin). Anda masih bisa mendaftarkan Crew (maksimal 10 Crew).',
        });
        return;
      }
      if (role === 'anggota' && isCrewFull) {
        setToastMessage({
          type: 'warning',
          text: '⚠️ Kuota Crew untuk Paket Ultimate telah penuh (10/10 Crew). Anda masih bisa mendaftarkan Admin (maksimal 2 Admin).',
        });
        return;
      }
    }

    if (!nama.trim()) return;

    let waBersih = '';
    let userClean = '';
    let loginIdFinal = '';

    if (isInputWa) {
      let w = numericOnly;
      if (w.startsWith('62')) w = '0' + w.substring(2);
      waBersih = w;
      userClean = w;
      loginIdFinal = w;
    } else {
      const rawVal = identitasLogin.trim() || (nama.trim().split(' ')[0] || 'crew');
      const u = rawVal.toLowerCase().replace(/[^a-z0-9_]/g, '');
      userClean = u;
      loginIdFinal = buatLoginIdKru(u, namaBrand);
    }

    const pass = password.trim() || '123456';
    const roleFinal = isPro ? 'admin' : role;

    onAddTim({
      uid: `tim-${Date.now()}`,
      nama: nama.trim(),
      username: userClean,
      loginId: loginIdFinal,
      noWhatsApp: waBersih,
      password: pass,
      role: roleFinal,
      posisi: posisi.trim() || (roleFinal === 'admin' ? 'Admin Operasional' : 'Crew Studio'),
      namaBrand,
      ownerParentId: ownerUid,
      tanggalDibuat: Date.now(),
    });

    setToastMessage({
      type: 'success',
      text: `✓ Staf "${nama.trim()}" (${roleFinal === 'admin' ? 'Admin' : 'Crew'}) berhasil didaftarkan! ID Login: ${loginIdFinal}`,
    });
    setTimeout(() => setToastMessage(null), 4000);

    setNama('');
    setIdentitasLogin('');
    setPassword('');
    setPosisi('');
  };

  const handleCopyId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(idToCopy);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Toast Peringatan / Sukses */}
      {toastMessage && (
        <div
          className={`rounded-xl p-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg border transition-all ${
            toastMessage.type === 'warning'
              ? 'bg-amber-950/95 border-amber-500 text-amber-200'
              : toastMessage.type === 'info'
              ? 'bg-sky-950/95 border-sky-500 text-sky-200'
              : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/10 rounded cursor-pointer text-slate-400 hover:text-white shrink-0"
            title="Tutup"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal / Card Peringatan Konfirmasi Hapus Crew */}
      {pendingDeleteTim && (
        <div className="rounded-xl bg-rose-950/90 border-2 border-rose-500/70 p-4 shadow-2xl text-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
              <Shield className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm">
                ⚠️ Peringatan: Hapus Akses Anggota Tim / Crew
              </h4>
              <p className="text-rose-200 mt-1 leading-relaxed">
                Yakin ingin menghapus akses <strong className="text-white underline">{pendingDeleteTim.nama}</strong> ({pendingDeleteTim.posisi})? ID login{' '}
                <code className="bg-black/60 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                  {pendingDeleteTim.loginId || buatLoginIdKru(pendingDeleteTim.username || pendingDeleteTim.nama, namaBrand)}
                </code>{' '}
                akan langsung dicabut.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-rose-500/25">
            <button
              type="button"
              onClick={() => {
                const batalNama = pendingDeleteTim.nama;
                setPendingDeleteTim(null);
                setToastMessage({
                  type: 'info',
                  text: `Penghapusan akses crew "${batalNama}" dibatalkan.`,
                });
                setTimeout(() => setToastMessage(null), 2500);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                const namaTerhapus = pendingDeleteTim.nama;
                onRemoveTim(pendingDeleteTim.uid);
                setPendingDeleteTim(null);
                setToastMessage({
                  type: 'success',
                  text: `✓ Akses crew "${namaTerhapus}" berhasil dihapus.`,
                });
                setTimeout(() => setToastMessage(null), 3500);
              }}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-900/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Konfirmasi Hapus</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                Daftar Staf &amp; Crew Studio ({timList.length} Orang)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isStandar
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : isPro
                    ? currentAdmin >= 1
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isLimitReached
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isStandar
                  ? 'Standar: 1 Owner (0 Admin, 0 Crew)'
                  : isPro
                  ? `Pro: ${currentAdmin}/1 Admin (0 Crew)${currentAdmin >= 1 ? ' • Penuh' : ''}`
                  : `Ultimate: ${currentAdmin}/2 Admin • ${currentCrew}/10 Crew`}
              </span>
            </div>
            <Users className="w-5 h-5 text-sky-400 shrink-0" />
          </div>

          {timList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isStandar
                ? 'Paket Standar khusus 1 Owner (tidak ada staf). Upgrade ke Pro untuk 1 Admin atau Ultimate untuk 2 Admin & 10 Crew.'
                : 'Belum ada staf atau crew yang didaftarkan.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {timList.map((item) => {
                const itemLoginId = item.loginId || buatLoginIdKru(item.username || item.nama, namaBrand);
                return (
                  <div
                    key={item.uid}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-sm font-bold text-white">{item.nama}</span>
                        <span className="text-slate-500">·</span>
                        <span
                          className={
                            item.role === 'admin'
                              ? 'text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30'
                              : 'text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30'
                          }
                        >
                          {item.role === 'admin' ? 'ADMIN' : 'CREW'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-amber-500/40 text-xs">
                          <span className="text-slate-400 text-[11px]">ID Login:</span>
                          <span className="font-mono font-bold text-amber-300">{itemLoginId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(itemLoginId)}
                            className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-1"
                            title="Salin ID Login"
                          >
                            {copiedId === itemLoginId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {item.password && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                            <span className="text-slate-500">Sandi:</span>
                            <span className="font-bold">{item.password}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingDeleteTim(item);
                          setToastMessage({
                            type: 'warning',
                            text: `⚠️ Peringatan: Yakin ingin menghapus akses crew "${item.nama}"? Klik konfirmasi hapus di kotak peringatan di atas.`,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                        title="Hapus Akses Crew"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3.5 text-xs shadow-xl"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">
                Tambah Staf / Crew Baru
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  isStandar
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : isPro
                    ? currentAdmin >= 1
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : isLimitReached
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isStandar
                  ? 'Standar: 0 Staf'
                  : isPro
                  ? `${currentAdmin}/1 Admin`
                  : `${currentAdmin}/2 Admin • ${currentCrew}/10 Crew`}
              </span>
            </div>

            {/* Peringatan jika kuota paket Standar, Pro, atau Ultimate penuh */}
            {isStandar && (
              <div className="rounded-xl bg-amber-950/80 border border-amber-500/50 p-3 text-xs text-amber-200 space-y-1 shadow-md">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Paket Standar: 1 Owner (0 Admin, 0 Crew)</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  Upgrade ke <strong>Pro (1 Admin)</strong> atau <strong>Ultimate (2 Admin, 10 Crew)</strong> untuk mendaftarkan staf.
                </div>
              </div>
            )}

            {isPro && isLimitReached && (
              <div className="rounded-xl bg-amber-950/80 border border-amber-500/50 p-3 text-xs text-amber-200 space-y-1 shadow-md">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Kuota Paket Pro Penuh (1 Admin, 1 Owner)</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  Upgrade ke <strong>Ultimate</strong> untuk kuota 2 Admin &amp; 10 Crew.
                </div>
              </div>
            )}

            {isUltimate && isLimitReached && (
              <div className="rounded-xl bg-amber-950/80 border border-amber-500/50 p-3 text-xs text-amber-200 space-y-1 shadow-md">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Kuota Paket Ultimate Penuh (2 Admin, 10 Crew, 1 Owner)</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  Semua batas kuota 2 Admin dan 10 Crew untuk studio Anda telah terisi.
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Nama Lengkap *</label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="Cth: Nadia"
                value={nama}
                onChange={(e) => {
                  const val = e.target.value;
                  setNama(val);
                  if (!identitasLogin) {
                    const autoSlug = val.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setIdentitasLogin(autoSlug);
                  }
                }}
                className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white ${
                  isLimitReached ? 'border-slate-800 opacity-60 cursor-not-allowed' : 'border-slate-700'
                }`}
              />
            </div>

            {/* Satu input praktis: Username atau WhatsApp (tanpa dua kali kerja) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-medium">Username atau WhatsApp *</label>
                {previewLoginId && (
                  <span className="text-[11px] text-amber-300 font-bold">
                    ID Login:{' '}
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                      {previewLoginId}
                    </code>
                  </span>
                )}
              </div>
              <div className={`flex items-center rounded-lg bg-slate-950 border px-3 py-2 focus-within:border-sky-500 ${
                isLimitReached ? 'border-slate-800 opacity-60 cursor-not-allowed' : 'border-slate-700'
              }`}>
                <input
                  type="text"
                  required
                  disabled={isLimitReached}
                  placeholder="Cth: nadia atau 0812xxxx"
                  value={identitasLogin}
                  onChange={(e) => setIdentitasLogin(e.target.value)}
                  className="w-full bg-transparent text-white font-mono focus:outline-none disabled:cursor-not-allowed text-xs"
                />
                {!isInputWa && (
                  <span className="text-amber-400/80 text-xs font-mono shrink-0 pl-1">
                    .{brandSlug || 'namabrand'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Kata Sandi (Min 6)</label>
                <input
                  type="text"
                  disabled={isLimitReached}
                  placeholder="123456"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white font-mono ${
                    isLimitReached ? 'border-slate-800 opacity-60 cursor-not-allowed' : 'border-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Posisi / Tugas</label>
                <input
                  type="text"
                  disabled={isLimitReached}
                  placeholder="Kasir / Fotografer"
                  value={posisi}
                  onChange={(e) => setPosisi(e.target.value)}
                  className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white ${
                    isLimitReached ? 'border-slate-800 opacity-60 cursor-not-allowed' : 'border-slate-700'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-slate-300 font-bold">Hak Akses:</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${
                  isLimitReached || isPro || (isUltimate && isCrewFull) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    disabled={isLimitReached || isPro || (isUltimate && isCrewFull)}
                    checked={role === 'anggota'}
                    onChange={() => setRole('anggota')}
                    className="accent-sky-500"
                  />
                  <span className="font-bold text-white text-xs">
                    Crew {isUltimate ? `(${currentCrew}/10)` : ''}
                  </span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${
                  isLimitReached || (isUltimate && isAdminFull) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    disabled={isLimitReached || (isUltimate && isAdminFull)}
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="accent-purple-500"
                  />
                  <span className="font-bold text-white text-xs">
                    Admin {isUltimate ? `(${currentAdmin}/2)` : isPro ? `(${currentAdmin}/1)` : ''}
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLimitReached}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all shadow-lg ${
                isLimitReached
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/80 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-sky-900/20'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isStandar
                  ? 'Standar: Khusus 1 Owner'
                  : isPro && isLimitReached
                  ? 'Batas Pro Penuh (1 Admin, 1 Owner)'
                  : isPro
                  ? 'Daftarkan Admin Studio'
                  : isUltimate && isLimitReached
                  ? 'Batas Ultimate Penuh (2 Admin, 10 Crew)'
                  : `Daftarkan ${role === 'admin' ? 'Admin' : 'Crew'} Studio`}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. PENGATURAN STUDIO TERPISAH (PROFIL, WEBSITE, REKENING, TEMPLATE WA, PAKET)
 * ========================================================================== */
export type PengaturanSubTab = 'PROFIL' | 'WEB' | 'REKENING' | 'WA' | 'PAKET';

export const PengaturanStudioView: React.FC<{
  owner: OwnerProfile;
  rekening: RekeningModel;
  initialSubTab?: PengaturanSubTab;
  onUpdateOwner: (updates: Partial<OwnerProfile>) => Promise<void> | void;
  onUpdateRekening: (rek: RekeningModel) => Promise<void> | void;
  onOpenSignatureModal: () => void;
  onSwitchDemoProfession?: (preset: ProfessionPresetKey) => void;
}> = ({
  owner,
  rekening,
  initialSubTab = 'PROFIL',
  onUpdateOwner,
  onUpdateRekening,
  onOpenSignatureModal,
}) => {
  const [subTab, setSubTab] = useState<PengaturanSubTab>(initialSubTab);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isTestExpiredLocal, setIsTestExpiredLocal] = useState(false);
  const [durasiPaketStudio, setDurasiPaketStudio] = useState<'BULANAN' | 'TAHUNAN'>('BULANAN');


  React.useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const [namaBrand, setNamaBrand] = useState(owner.namaBrand);
  const [namaOwner, setNamaOwner] = useState(owner.namaOwner);
  const [jenisUsaha, setJenisUsaha] = useState(owner.jenisUsaha);
  const [noWa, setNoWa] = useState(owner.noWhatsApp);
  const [emailStudio, setEmailStudio] = useState(owner.email || '');

  const [usernameWeb, setUsernameWeb] = useState(owner.username || owner.uid || 'kafelastudio');
  const [taglineWeb, setTaglineWeb] = useState(owner.taglineWeb);
  const [bioWeb, setBioWeb] = useState(owner.bioWeb || '');
  const [linkIg, setLinkIg] = useState(owner.linkIg);
  const [linkTiktok, setLinkTiktok] = useState(owner.linkTiktok);
  const [linkYoutube, setLinkYoutube] = useState(owner.linkYoutube || '');
  const [linkFacebook, setLinkFacebook] = useState(owner.linkFacebook || '');
  const [lokasi1, setLokasi1] = useState(owner.lokasi1);
  const [lokasi2, setLokasi2] = useState(owner.lokasi2 || '');
  const [lokasi3, setLokasi3] = useState(owner.lokasi3 || '');
  const [portoPhotos, setPortoPhotos] = useState<string[]>(() =>
    Array.from({ length: 8 }, (_, i) => owner.portofolioWeb?.[i] || '')
  );
  const [portoCaptions, setPortoCaptions] = useState<string[]>(() =>
    Array.from({ length: 8 }, (_, i) => owner.portofolioCaptions?.[i] || '')
  );
  const [logoWeb, setLogoWeb] = useState(owner.logoBrandUrl || '/logo-kafela.svg');
  const [temaWeb, setTemaWeb] = useState<'MODERN_STUDIO' | 'LUXURY_GOLD' | 'CLEAN_MINIMALIST' | 'VERTICAL_LANDING'>(
    owner.temaWeb || 'MODERN_STUDIO'
  );
  const [layoutWeb, setLayoutWeb] = useState<WebLayoutType>(
    owner.layoutWeb || 'HORIZONTAL_BOOK'
  );
  const [pesanPenutupWeb, setPesanPenutupWeb] = useState(owner.pesanPenutupWeb || '');
  const [jamOperasionalWeb, setJamOperasionalWeb] = useState(owner.jamOperasionalWeb || '');
  const [ctaTeksKustom, setCtaTeksKustom] = useState(owner.ctaTeksKustom || '');
  const [ctaLinkKustom, setCtaLinkKustom] = useState(owner.ctaLinkKustom || '');
  const [teksTombolBooking, setTeksTombolBooking] = useState(owner.teksTombolBooking || '');
  const [isWebsiteActive, setIsWebsiteActive] = useState<boolean>(owner.isWebsiteActive ?? true);
  const [isBookingActive, setIsBookingActive] = useState<boolean>(owner.isBookingActive ?? true);
  const [openSectionTema, setOpenSectionTema] = useState<boolean>(false);
  const [openSectionPenutup, setOpenSectionPenutup] = useState<boolean>(false);
  const [openSectionSosmed, setOpenSectionSosmed] = useState<boolean>(false);
  const [openSectionUpload, setOpenSectionUpload] = useState<boolean>(false);
  const [openSectionWeb2, setOpenSectionWeb2] = useState<boolean>(false);

  // Website Profil Ke-2 (Sub-Brand / Spesialisasi)
  const [web2Aktif, setWeb2Aktif] = useState(owner.webProfil2?.aktif || false);
  const [web2SubJudul, setWeb2SubJudul] = useState(owner.webProfil2?.subJudul || '');
  const [web2Slug, setWeb2Slug] = useState(owner.webProfil2?.usernameSlug || `${owner.username || 'vendor'}-2`);
  const [web2Tagline, setWeb2Tagline] = useState(owner.webProfil2?.taglineWeb || '');
  const [web2Bio, setWeb2Bio] = useState(owner.webProfil2?.bioWeb || '');
  const [web2Tema, setWeb2Tema] = useState<'MODERN_STUDIO' | 'LUXURY_GOLD' | 'CLEAN_MINIMALIST' | 'VERTICAL_LANDING'>(
    owner.webProfil2?.temaWeb || 'VERTICAL_LANDING'
  );
  const [web2Layout, setWeb2Layout] = useState<WebLayoutType>(
    owner.webProfil2?.layoutWeb || 'VERTICAL_LANDING'
  );
  const [web2LinkBookingKhusus, setWeb2LinkBookingKhusus] = useState(owner.webProfil2?.linkBookingKhusus || '');
  const [web2PortoPhotos, setWeb2PortoPhotos] = useState<string[]>(() =>
    Array.from({ length: 6 }, (_, i) => owner.webProfil2?.portofolioWeb?.[i] || '')
  );
  const [web2PortoCaptions, setWeb2PortoCaptions] = useState<string[]>(() =>
    Array.from({ length: 6 }, (_, i) => owner.webProfil2?.portofolioCaptions?.[i] || '')
  );

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [activeWebPreview, setActiveWebPreview] = useState<'NONE' | 'BOOKING' | 'PROFIL' | 'PROFIL2'>('NONE');
  const [previewReloadKey, setPreviewReloadKey] = useState(0);

  const [rekState, setRekState] = useState<RekeningModel>(rekening);
  const [waTagihan, setWaTagihan] = useState(owner.templateWaTagihan);
  const [waKonfirmasi, setWaKonfirmasi] = useState(owner.templateWaKonfirmasi);
  const [waBookingWeb, setWaBookingWeb] = useState(owner.templateWaBookingWeb);

  // Sinkronkan form saat data owner/rekening selesai dimuat dari Firebase
  React.useEffect(() => {
    setNamaBrand(owner.namaBrand || '');
    setNamaOwner(owner.namaOwner || '');
    setJenisUsaha(owner.jenisUsaha || '');
    setNoWa(owner.noWhatsApp || '');
    setEmailStudio(owner.email || '');
    setUsernameWeb(owner.username || owner.uid || 'kafelastudio');
    setTaglineWeb(owner.taglineWeb || '');
    setBioWeb(owner.bioWeb || '');
    setLinkIg(owner.linkIg || '');
    setLinkTiktok(owner.linkTiktok || '');
    setLinkYoutube(owner.linkYoutube || '');
    setLinkFacebook(owner.linkFacebook || '');
    setLokasi1(owner.lokasi1 || '');
    setLokasi2(owner.lokasi2 || '');
    setLokasi3(owner.lokasi3 || '');
    setPortoPhotos(Array.from({ length: 8 }, (_, i) => owner.portofolioWeb?.[i] || ''));
    setPortoCaptions(Array.from({ length: 8 }, (_, i) => owner.portofolioCaptions?.[i] || ''));
    setLogoWeb(owner.logoBrandUrl || '/logo-kafela.svg');
    setTemaWeb(owner.temaWeb || 'MODERN_STUDIO');
    setLayoutWeb(owner.layoutWeb || 'HORIZONTAL_BOOK');
    setPesanPenutupWeb(owner.pesanPenutupWeb || '');
    setJamOperasionalWeb(owner.jamOperasionalWeb || '');
    setCtaTeksKustom(owner.ctaTeksKustom || '');
    setCtaLinkKustom(owner.ctaLinkKustom || '');
    setTeksTombolBooking(owner.teksTombolBooking || '');
    setIsWebsiteActive(owner.isWebsiteActive ?? true);
    setIsBookingActive(owner.isBookingActive ?? true);

    setWeb2Aktif(owner.webProfil2?.aktif || false);
    setWeb2SubJudul(owner.webProfil2?.subJudul || '');
    setWeb2Slug(owner.webProfil2?.usernameSlug || `${owner.username || 'vendor'}-2`);
    setWeb2Tagline(owner.webProfil2?.taglineWeb || '');
    setWeb2Bio(owner.webProfil2?.bioWeb || '');
    setWeb2Tema(owner.webProfil2?.temaWeb || 'VERTICAL_LANDING');
    setWeb2Layout(owner.webProfil2?.layoutWeb || 'VERTICAL_LANDING');
    setWeb2LinkBookingKhusus(owner.webProfil2?.linkBookingKhusus || '');
    setWeb2PortoPhotos(Array.from({ length: 6 }, (_, i) => owner.webProfil2?.portofolioWeb?.[i] || ''));
    setWeb2PortoCaptions(Array.from({ length: 6 }, (_, i) => owner.webProfil2?.portofolioCaptions?.[i] || ''));

    setWaTagihan(owner.templateWaTagihan || '');
    setWaKonfirmasi(owner.templateWaKonfirmasi || '');
    setWaBookingWeb(owner.templateWaBookingWeb || '');
  }, [owner]);

  React.useEffect(() => {
    setRekState(rekening);
  }, [rekening]);

  const compressDataUrlToBudget = (
    rawDataUrl: string,
    maxDim: number,
    maxChars: number
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!rawDataUrl || !rawDataUrl.startsWith('data:image/')) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let targetW = img.width;
        let targetH = img.height;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        // MULTI-STEP PROGRESSIVE DOWNSCALING (Halving 50% bertahap agar tajam & anti-pecah)
        let curCanvas = document.createElement('canvas');
        let curW = img.width;
        let curH = img.height;
        curCanvas.width = curW;
        curCanvas.height = curH;
        const curCtx = curCanvas.getContext('2d');
        if (!curCtx) {
          reject(new Error('Canvas context gagal'));
          return;
        }
        curCtx.imageSmoothingEnabled = true;
        curCtx.imageSmoothingQuality = 'high';
        curCtx.drawImage(img, 0, 0, curW, curH);

        while (curW * 0.5 > targetW && curH * 0.5 > targetH) {
          const nextW = Math.max(targetW, Math.round(curW * 0.5));
          const nextH = Math.max(targetH, Math.round(curH * 0.5));
          const stepCanvas = document.createElement('canvas');
          stepCanvas.width = nextW;
          stepCanvas.height = nextH;
          const stepCtx = stepCanvas.getContext('2d');
          if (!stepCtx) break;
          stepCtx.imageSmoothingEnabled = true;
          stepCtx.imageSmoothingQuality = 'high';
          stepCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
          curCanvas = stepCanvas;
          curW = nextW;
          curH = nextH;
        }

        let finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) {
          reject(new Error('Canvas context gagal'));
          return;
        }
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, targetW, targetH);

        // Pastikan setiap foto <= maxChars (~95.000 karakter = ~70 KB)
        // supaya 8 foto sekaligus (~560 KB) 100% muat di bawah batas 1MB Firestore tanpa pernah gagal simpan!
        let q = 0.84;
        let resultDataUrl = finalCanvas.toDataURL('image/jpeg', q);
        while (resultDataUrl.length > maxChars && q > 0.58) {
          q -= 0.06;
          resultDataUrl = finalCanvas.toDataURL('image/jpeg', q);
        }

        // Jika masih di atas budget, turunkan dimensi 15% secara halus
        while (resultDataUrl.length > maxChars && targetW > 640) {
          targetW = Math.round(targetW * 0.85);
          targetH = Math.round(targetH * 0.85);
          const smaller = document.createElement('canvas');
          smaller.width = targetW;
          smaller.height = targetH;
          const sCtx = smaller.getContext('2d');
          if (!sCtx) break;
          sCtx.imageSmoothingEnabled = true;
          sCtx.imageSmoothingQuality = 'high';
          sCtx.drawImage(finalCanvas, 0, 0, finalCanvas.width, finalCanvas.height, 0, 0, targetW, targetH);
          finalCanvas = smaller;
          resultDataUrl = finalCanvas.toDataURL('image/jpeg', 0.76);
        }

        resolve(resultDataUrl);
      };
      img.onerror = reject;
      img.src = rawDataUrl;
    });

  const compressGalleryImage = (file: File, maxDim: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const rawDataUrl = String(ev.target?.result || '');
          const maxChars = maxDim <= 600 ? 45000 : 95000;
          const fitted = await compressDataUrlToBudget(rawDataUrl, maxDim, maxChars);
          resolve(fitted);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSelectPhotoFromGallery = async (
    slotId: string,
    file: File | undefined,
    maxDim: number,
    setter: (val: string) => void
  ) => {
    if (!file) return;
    try {
      setUploadingSlot(slotId);
      const compressedDataUrl = await compressGalleryImage(file, maxDim);
      setter(compressedDataUrl);
      notifySaved('Foto berhasil dipilih. Klik Simpan Pengaturan di bawah untuk menerapkan perubahan.');
    } catch (err) {
      console.error('Gagal memproses foto galeri:', err);
    } finally {
      setUploadingSlot(null);
    }
  };

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [isSavingToast, setIsSavingToast] = useState(false);

  const notifySaved = (msg: string) => {
    setIsSavingToast(false);
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 3500);
  };

  const handleSaveOwnerWithToast = async (
    updates: Partial<OwnerProfile>,
    successMessage: string
  ) => {
    try {
      setIsSavingToast(true);
      setSavedBanner('Menyimpan perubahan ke server...');
      await onUpdateOwner(updates);
      setPreviewReloadKey((k) => k + 1);
      notifySaved(successMessage);
    } catch (err) {
      console.error('Gagal menyimpan pengaturan:', err);
      setIsSavingToast(false);
      setSavedBanner('Gagal menyimpan ke server. Periksa koneksi internet Anda.');
      setTimeout(() => setSavedBanner(null), 4000);
    }
  };

  const targetIdParam = (owner.username || usernameWeb || 'studio').trim();
  const linkProfilUtama = `${targetIdParam}.web.app`;
  const linkBookingUtama = `${targetIdParam}.web.app/booking`;
  const localBookingUrl = `/booking.html?id=${encodeURIComponent(targetIdParam)}&tema=${encodeURIComponent(temaWeb)}&v=${previewReloadKey}`;
  const localProfilUrl = `/profil.html?id=${encodeURIComponent(targetIdParam)}&uid=${encodeURIComponent(owner.uid || '')}&preview=1&tema=${encodeURIComponent(temaWeb)}&v=${previewReloadKey}`;

  // Sinkronisasi data draft ke sessionStorage agar pratinjau live instan dan 0 kuota Firebase
  useEffect(() => {
    if (activeWebPreview === 'PROFIL') {
      try {
        const draft = {
          ownerUid: owner.uid,
          namaBrand: namaBrand || 'Studio',
          namaOwner,
          jenisUsaha,
          username: usernameWeb,
          noWhatsApp: noWa,
          taglineWeb,
          bioWeb,
          temaWeb,
          layoutWeb,
          linkIg,
          linkTiktok,
          lokasi1,
          lokasi2,
          lokasi3,
          logoBrandUrl: logoWeb,
          portofolioWeb: portoPhotos.filter(Boolean),
          portofolioCaptions: portoCaptions,
          pesanPenutupWeb,
          jamOperasionalWeb,
          ctaTeksKustom,
          ctaLinkKustom,
          teksTombolBooking,
          isWebsiteActive: true,
        };
        sessionStorage.setItem('current_owner_preview_draft', JSON.stringify(draft));
      } catch (e) {
        console.warn('Gagal simpan draft preview:', e);
      }
    }
  }, [
    activeWebPreview,
    owner.uid,
    namaBrand,
    namaOwner,
    jenisUsaha,
    usernameWeb,
    noWa,
    taglineWeb,
    bioWeb,
    temaWeb,
    layoutWeb,
    linkIg,
    linkTiktok,
    lokasi1,
    lokasi2,
    lokasi3,
    logoWeb,
    portoPhotos,
    portoCaptions,
    pesanPenutupWeb,
    jamOperasionalWeb,
    ctaTeksKustom,
    ctaLinkKustom,
    teksTombolBooking,
  ]);

  const sisaHari = Math.max(
    0,
    Math.ceil((owner.tanggalLangganan - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {savedBanner && (
        <>
          {/* FLOATING TOAST POPUP MELAYANG DI ATAS LAYAR */}
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-md pointer-events-auto">
            <div
              className={`rounded-2xl px-4 py-3.5 shadow-2xl border flex items-center justify-between gap-3 backdrop-blur-md transition-all ${
                isSavingToast
                  ? 'bg-slate-900/95 border-sky-500/70 text-sky-200'
                  : 'bg-emerald-950/95 border-emerald-400/80 text-emerald-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isSavingToast
                      ? 'bg-sky-500/20 text-sky-300 animate-spin'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {isSavingToast ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-snug">{savedBanner}</p>
                  {!isSavingToast && (
                    <p className="text-[10px] text-emerald-300/90">
                      Tersimpan di database &amp; langsung aktif di website klien
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSavedBanner(null)}
                className="text-[11px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}

      {/* 1. TAB PROFIL STUDIO & STRUK */}
      {subTab === 'PROFIL' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Profil Brand &amp; Tanda Tangan Struk</h3>
                <p className="text-[11px] text-slate-400">
                  Mengatur nama bisnis, jenis profesi, logo, dan tanda tangan nota digital
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSignatureModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Atur Logo &amp; Tanda Tangan Struk</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-400 mb-1">Nama Brand / Usaha</label>
              <input
                type="text"
                value={namaBrand}
                onChange={(e) => setNamaBrand(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Nama Penanggung Jawab (Owner)</label>
              <input
                type="text"
                value={namaOwner}
                onChange={(e) => setNamaOwner(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-slate-400 mb-1">Jenis Usaha Utama (Modul Form)</label>
              <select
                value={jenisUsaha}
                onChange={(e) => setJenisUsaha(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              >
                {DAFTAR_JENIS_USAHA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Nomor WhatsApp Kontak</label>
              <input
                type="tel"
                value={noWa}
                onChange={(e) => setNoWa(e.target.value)}
                placeholder="08123456789"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Email Kontak (Opsional)</label>
              <input
                type="email"
                value={emailStudio}
                onChange={(e) => setEmailStudio(e.target.value)}
                placeholder="studio@email.com"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingToast}
            onClick={() =>
              handleSaveOwnerWithToast(
                {
                  namaBrand: namaBrand.trim(),
                  namaOwner: namaOwner.trim(),
                  jenisUsaha,
                  noWhatsApp: noWa.trim(),
                  email: emailStudio.trim(),
                },
                'Profil Brand & Kontak berhasil disimpan!'
              )
            }
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {isSavingToast ? 'Menyimpan...' : 'Simpan Profil Brand'}
          </button>
        </div>
      )}

      {/* 2. TAB PENGATURAN WEBSITE PRIBADI & LINK BOOKING */}
      {subTab === 'WEB' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-2 space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-0 px-4">
            <Globe className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Website &amp; Link Booking
              </h3>
              <p className="text-[11px] text-slate-400">
                Bagikan tautan ini ke bio sosmed atau kirim ke WhatsApp klien
              </p>
            </div>
          </div>

          {/* TOGGLE BUKA / TUTUP WEBSITE & LINK BOOKING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block text-xs">Status Website Studio</span>
                <span className="text-[11px] text-slate-400">
                  {isWebsiteActive ? 'Website Aktif (Buka)' : 'Website Ditutup (Istirahat)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newVal = !isWebsiteActive;
                  setIsWebsiteActive(newVal);
                  handleSaveOwnerWithToast({ isWebsiteActive: newVal }, newVal ? 'Website berhasil dibuka!' : 'Website ditutup.');
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  isWebsiteActive ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block text-xs">Status Link Booking Online</span>
                <span className="text-[11px] text-slate-400">
                  {isBookingActive ? 'Booking Aktif (Buka)' : 'Booking Ditutup'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newVal = !isBookingActive;
                  setIsBookingActive(newVal);
                  handleSaveOwnerWithToast({ isBookingActive: newVal }, newVal ? 'Link Booking berhasil dibuka!' : 'Link Booking ditutup.');
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  isBookingActive ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400">Username Tautan (Tanpa Spasi)</label>
                {Boolean(owner.username && owner.username.trim().length > 0) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🔒 Terkunci Permanen
                  </span>
                )}
              </div>
              <input
                type="text"
                value={usernameWeb}
                disabled={Boolean(owner.username && owner.username.trim().length > 0)}
                onChange={(e) =>
                  setUsernameWeb(e.target.value.toLowerCase().replace(/\s+/g, ''))
                }
                placeholder="Contoh: kaphotostudio"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {owner.username
                  ? 'Username web dikunci, hubungi admin.'
                  : 'Atur sekali dan akan dikunci permanen untuk kestabilan web.'}
              </p>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Slogan Singkat (Tampil di Halaman Utama)</label>
              <input
                type="text"
                placeholder="Contoh: Abadikan Momen Sekali Seumur Hidup"
                value={taglineWeb}
                onChange={(e) => setTaglineWeb(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
          </div>

  
          <div>
            <label className="block text-slate-400 mb-1">
              Bio / Caption Perkenalan Studio (Tampil di Halaman Utama di Bawah Slogan)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Halo, kami melayani dokumentasi pernikahan, prewedding, dan event profesional dengan sentuhan hangat..."
              value={bioWeb}
              onChange={(e) => setBioWeb(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white text-xs leading-relaxed"
            />
          </div>

          {/* KOTAK TAUTAN BOOKING & LANDING PAGE PROFIL + TAMPILAN LANGSUNG SAAT DIKLIK */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-slate-400 block text-[11px]">
                  Tautan Langsung Form Booking (booking.html):
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveWebPreview((prev) => (prev === 'BOOKING' ? 'NONE' : 'BOOKING'))
                  }
                  className="font-mono text-sky-400 hover:text-sky-300 underline font-bold text-left cursor-pointer mt-0.5"
                >
                  https://{linkBookingUtama}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${linkBookingUtama}`);
                    notifySaved('Tautan Form Booking disalin ke clipboard!');
                  }}
                  className="px-2.5 py-1.5 rounded border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveWebPreview((prev) => (prev === 'BOOKING' ? 'NONE' : 'BOOKING'))
                  }
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{activeWebPreview === 'BOOKING' ? 'Tutup Form' : 'Buka Form Booking'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
              <div className="truncate">
                <span className="text-slate-400 block text-[11px]">
                  Tautan Website Profesional / Landing Page (Untuk Bio IG / TikTok):
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveWebPreview((prev) => (prev === 'PROFIL' ? 'NONE' : 'PROFIL'))
                  }
                  className="font-mono text-sky-400 hover:text-sky-300 underline font-bold text-left cursor-pointer mt-0.5"
                >
                  https://{linkProfilUtama}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${linkProfilUtama}`);
                    notifySaved('Tautan Website Profil disalin ke clipboard!');
                  }}
                  className="px-2.5 py-1.5 rounded border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveWebPreview((prev) => (prev === 'PROFIL' ? 'NONE' : 'PROFIL'))
                  }
                  className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {activeWebPreview === 'PROFIL' ? 'Tutup Website' : 'Buka Website Klien'}
                  </span>
                </button>
              </div>
            </div>

            {/* TAMPILAN LANGSUNG BOOKING.HTML / PROFIL.HTML SAAT LINK DIKLIK */}
            {activeWebPreview !== 'NONE' && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWebPreview('PROFIL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        activeWebPreview === 'PROFIL'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      🌐 Website Studio Profesional (profil.html)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWebPreview('BOOKING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        activeWebPreview === 'BOOKING'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📝 Form Booking Online (booking.html)
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={
                        activeWebPreview === 'BOOKING'
                          ? localBookingUrl
                          : `${localProfilUrl}&layout=${layoutWeb}&tema=${temaWeb}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tab Penuh</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveWebPreview('NONE')}
                      className="px-2.5 py-1.5 rounded bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 text-[11px] font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                <div className="w-full rounded-xl overflow-hidden border border-slate-700 bg-[#f4f6f8] shadow-inner">
                  <iframe
                    key={`${activeWebPreview}-${targetIdParam}-${temaWeb}-${layoutWeb}`}
                    src={
                      activeWebPreview === 'BOOKING'
                        ? localBookingUrl
                        : `${localProfilUrl}&layout=${layoutWeb}&tema=${temaWeb}`
                    }
                    title={
                      activeWebPreview === 'BOOKING'
                        ? 'Form Booking Online'
                        : 'Website Studio Profesional'
                    }
                    className="w-full h-[720px] border-0"
                  />
                </div>
              </div>
            )}
          {/* 3. LINK IG, TIKTOK, YOUTUBE, FACEBOOK, EMAIL, WA & CABANG / LOKASI */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSectionSosmed(!openSectionSosmed)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-white text-xs hover:bg-slate-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🔗</span>
                <span>Link Sosmed, Kontak &amp; Cabang</span>
              </div>
              <span className="text-slate-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                {openSectionSosmed ? '▲' : '▼'}
              </span>
            </button>
            {openSectionSosmed && (
              <div className="p-4 pt-0 space-y-3.5 border-t border-slate-800/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Link Instagram</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/..."
                      value={linkIg}
                      onChange={(e) => setLinkIg(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Link TikTok</label>
                    <input
                      type="text"
                      placeholder="https://tiktok.com/@..."
                      value={linkTiktok}
                      onChange={(e) => setLinkTiktok(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Link YouTube</label>
                    <input
                      type="text"
                      placeholder="https://youtube.com/..."
                      value={linkYoutube}
                      onChange={(e) => setLinkYoutube(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Link Facebook</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/..."
                      value={linkFacebook}
                      onChange={(e) => setLinkFacebook(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Email Kontak</label>
                    <input
                      type="email"
                      placeholder="email@domain.com"
                      value={emailStudio}
                      onChange={(e) => setEmailStudio(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="0812..."
                      value={noWa}
                      onChange={(e) => setNoWa(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Cabang / Lokasi 1</label>
                    <input
                      type="text"
                      placeholder="Contoh: Cabang Pusat..."
                      value={lokasi1}
                      onChange={(e) => setLokasi1(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cabang / Lokasi 2 (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Cabang 2..."
                      value={lokasi2}
                      onChange={(e) => setLokasi2(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cabang / Lokasi 3 (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Cabang 3..."
                      value={lokasi3}
                      onChange={(e) => setLokasi3(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={isSavingToast}
            onClick={() =>
              handleSaveOwnerWithToast(
                {
                  username: usernameWeb.trim(),
                  taglineWeb: taglineWeb.trim(),
                  bioWeb: bioWeb.trim(),
                  linkIg: linkIg.trim(),
                  linkTiktok: linkTiktok.trim(),
                  linkYoutube: linkYoutube.trim(),
                  linkFacebook: linkFacebook.trim(),
                  email: emailStudio.trim(),
                  noWhatsApp: noWa.trim(),
                  lokasi1: lokasi1.trim(),
                  lokasi2: lokasi2.trim(),
                  lokasi3: lokasi3.trim(),
                },
                'Website & Link berhasil disimpan!'
              )
            }
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {isSavingToast ? 'Menyimpan...' : 'Simpan Website & Link'}
          </button>
        </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSectionTema(!openSectionTema)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-white text-xs hover:bg-slate-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span>Pilih Tema, Warna &amp; Tata Letak Website (8 Pilihan Layout)</span>
              </div>
              <span className="text-slate-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                {openSectionTema ? '▲' : '▼'}
              </span>
            </button>
            {openSectionTema && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-800/80">
                {/* PILIHAN ARSITEKTUR TATA LETAK WEBSITE (8 PILIHAN BERBEDA) */}
                <div className="pt-3">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>📱</span>
                      <span>Pilih Arsitektur &amp; Gaya Tata Letak Website (8 Pilihan Karakter Berbeda)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Setiap template memiliki struktur visual, alur navigasi, dan pengalaman interaksi yang unik:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2.5">
                    {(
                      [
                        {
                          id: 'HORIZONTAL_BOOK',
                          title: '1. Buku Editorial Majalah',
                          subtitle: 'Sistem geser samping per bab (Lookbook Seni)',
                          badge: 'LOOKBOOK GESER',
                          icon: '📖',
                          accentBorder: 'border-purple-500',
                          desc: 'Pengalaman membuka majalah seni eksklusif. Geser ke kanan per bab halaman portofolio.',
                        },
                        {
                          id: 'VERTICAL_LANDING',
                          title: '2. Landing Page Modern',
                          subtitle: 'Scroll vertikal alami, hero megah & konversi tinggi',
                          badge: 'SCROLL VERTIKAL',
                          icon: '⚡',
                          accentBorder: 'border-emerald-500',
                          desc: 'Sangat direkomendasikan untuk HP. Alur scrolling mulus ke bawah dengan sticky action bar.',
                        },
                        {
                          id: 'CINEMATIC_SHOWCASE',
                          title: '3. Sinematik Layar Lebar',
                          subtitle: 'Rasio 21:9 ultra-wide, moodboard film & tiket VIP',
                          badge: 'CINEMATIC 21:9',
                          icon: '🎬',
                          accentBorder: 'border-amber-500',
                          desc: 'Gaya film festival/cinema noir. Banner layar lebar dengan horizontal filmstrip & tiket VIP.',
                        },
                        {
                          id: 'GRID_MASONRY',
                          title: '4. Galeri Masonry Pinterest',
                          subtitle: 'Dinding foto staggered multi-tinggi & filter tag',
                          badge: 'MASONRY WALL',
                          icon: '🧱',
                          accentBorder: 'border-cyan-500',
                          desc: 'Gaya visual Pinterest/Behance. Portofolio tersaji berjenjang artistik dengan filter kategori.',
                        },
                        {
                          id: 'SPLIT_EDITORIAL',
                          title: '5. Split-Screen Atelier',
                          subtitle: 'Panel kiri terkunci (sticky) & lookbook kanan',
                          badge: 'DUAL PANE',
                          icon: '⚖️',
                          accentBorder: 'border-indigo-500',
                          desc: 'Gaya atelier fashion Paris. Info brand terkunci di kiri, galeri foto mengalir bebas di kanan.',
                        },
                        {
                          id: 'MINIMAL_LINKTREE',
                          title: '6. Bio-Link Premium Ringkas',
                          subtitle: 'Kartu biolink terpusat (Instagram/TikTok bio)',
                          badge: 'BIOLINK IG/TT',
                          icon: '🔗',
                          accentBorder: 'border-rose-500',
                          desc: 'Dioptimalkan untuk link bio medsos. Avatar terpusat, akordeon tarif, & tombol WA instan.',
                        },
                        {
                          id: 'CAROUSEL_FULLSCREEN',
                          title: '7. Fullscreen Slide Imersif',
                          subtitle: '100vh layar penuh dramatis & laci katalog bawah',
                          badge: 'IMMERSIVE 100VH',
                          icon: '🖼️',
                          accentBorder: 'border-sky-500',
                          desc: 'Tampilan layar penuh 100% viewport. Transisi foto megah dengan tombol laci laci tarif.',
                        },
                        {
                          id: 'RETRO_BRUTALIST',
                          title: '8. Neo-Brutalist Pop Studio',
                          subtitle: 'Garis hitam tegas, bayangan keras, pita marquee',
                          badge: 'NEO BRUTALIST',
                          icon: '🏷️',
                          accentBorder: 'border-yellow-400',
                          desc: 'Gaya kekinian anak muda. Garis tepi tebal, stiker taktil, bayangan keras, & badge pop.',
                        },
                      ] as const
                    ).map((layoutItem) => {
                      const isSelected = layoutWeb === layoutItem.id;
                      return (
                        <button
                          key={layoutItem.id}
                          type="button"
                          onClick={() => setLayoutWeb(layoutItem.id)}
                          className={`text-left rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? `${layoutItem.accentBorder} bg-slate-900 ring-2 ring-purple-500/40 shadow-lg`
                              : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{layoutItem.icon}</span>
                                <span className="line-clamp-1">{layoutItem.title}</span>
                              </span>
                              {isSelected ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold shrink-0">
                                  AKTIF
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono shrink-0">
                                  {layoutItem.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {layoutItem.desc}
                            </p>
                          </div>
                          <span className="text-[10px] text-sky-400 font-semibold truncate">
                            {layoutItem.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PILIHAN TEMA WARNA VISUAL */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        🎨 Pilih Palet Warna &amp; Nuansa Visual (profil.html)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Dapat dipadukan dengan gaya Geser Samping maupun Scroll ke Bawah:
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(
                      [
                        {
                          id: 'MODERN_STUDIO',
                          title: '1. Amour Ivory & Rose Gold',
                          subtitle: 'Krem Hangat, Dusty Rose & Emas Lembut',
                          badge: 'IVORY ROSE',
                          previewBg: 'bg-gradient-to-br from-rose-200 via-amber-50 to-rose-100',
                          accentBorder: 'border-rose-400',
                        },
                        {
                          id: 'LUXURY_GOLD',
                          title: '2. Royal Obsidian & Gold',
                          subtitle: 'Hitam Obsidian & Tinta Emas Mewah',
                          badge: 'ROYAL GOLD',
                          previewBg: 'bg-gradient-to-br from-neutral-950 via-stone-900 to-amber-950',
                          accentBorder: 'border-amber-500',
                        },
                        {
                          id: 'CLEAN_MINIMALIST',
                          title: '3. Botanical White & Sage',
                          subtitle: 'Putih Bersih & Aksen Hijau Sage Modern',
                          badge: 'BOTANICAL SAGE',
                          previewBg: 'bg-gradient-to-br from-slate-100 via-white to-emerald-50',
                          accentBorder: 'border-emerald-500',
                        },
                        {
                          id: 'VERTICAL_LANDING',
                          title: '4. Obsidian Glow & Amber',
                          subtitle: 'Gelap Modern & Aksen Emas Hangat',
                          badge: 'OBSIDIAN GLOW',
                          previewBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900',
                          accentBorder: 'border-amber-400',
                        },
                      ] as const
                    ).map((t) => {
                      const isSelected = temaWeb === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTemaWeb(t.id)}
                          className={`text-left rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? `${t.accentBorder} bg-slate-900 ring-2 ring-purple-500/40`
                              : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className={`h-10 w-full rounded-lg ${t.previewBg} border border-white/10 flex items-center justify-between px-2.5`}>
                              <span className={`text-[10px] font-extrabold tracking-wider ${t.id === 'LUXURY_GOLD' || t.id === 'VERTICAL_LANDING' ? 'text-white' : 'text-slate-900'}`}>
                                {t.badge}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold">
                                  AKTIF
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-white text-xs">{t.title}</p>
                            <p className="text-[10px] text-slate-400 leading-snug">{t.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. PENGATURAN HALAMAN PENUTUP & KONTAK (TERTUTUP DEFAULT) */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSectionPenutup(!openSectionPenutup)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-white text-xs hover:bg-slate-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>💌</span>
                <span>Halaman Penutup &amp; Kontak</span>
              </div>
              <span className="text-slate-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                {openSectionPenutup ? '▲' : '▼'}
              </span>
            </button>
            {openSectionPenutup && (
              <div className="p-4 pt-0 space-y-3 border-t border-slate-800/80">
                <div className="pt-3">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Atur pesan penutup, jam operasional, tombol tautan, dan teks tombol booking:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Pesan Penutup (Tampil di atas tombol booking)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Setiap momen berharga layak diabadikan dengan sentuhan terbaik. Diskusikan konsep impianmu bersama kami."
                      value={pesanPenutupWeb}
                      onChange={(e) => setPesanPenutupWeb(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Jam Operasional / Keterangan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Buka Setiap Hari: 09.00 - 21.00 WIB (Reservasi H-1)"
                      value={jamOperasionalWeb}
                      onChange={(e) => setJamOperasionalWeb(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                    />
                    <div className="mt-2.5">
                      <label className="block text-slate-400 mb-1">
                        Teks Tombol Booking Utama
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Booking Online / Reservasi Jadwal"
                        value={teksTombolBooking}
                        onChange={(e) => setTeksTombolBooking(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Label Tombol Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Chat WhatsApp Konsultasi / Buka Google Maps"
                      value={ctaTeksKustom}
                      onChange={(e) => setCtaTeksKustom(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Tautan Tombol Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://wa.me/628... atau link Google Maps / Drive"
                      value={ctaLinkKustom}
                      onChange={(e) => setCtaLinkKustom(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>



          {/* 4. UPLOAD FOTO & GALERI PORTOFOLIO (TERTUTUP DEFAULT) */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSectionUpload(!openSectionUpload)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-white text-xs hover:bg-slate-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>📷</span>
                <span>Upload Foto Profil / Logo &amp; Galeri Portofolio </span>
              </div>
              <span className="text-slate-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                {openSectionUpload ? '▲' : '▼'}
              </span>
            </button>
            {openSectionUpload && (
              <div className="p-4 pt-0 space-y-3 border-t border-slate-800/80">
                <div className="space-y-3 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-slate-200 font-bold text-xs">
                        Foto Profil / Logo &amp; Galeri Portofolio
                      </label>
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-amber-300">Foto 1</strong> untuk latar belakang sampul utama. <strong className="text-sky-300">Foto 2 s/d 8</strong> tampil di galeri portofolio web.
                      </p>
                    </div>
                  </div>

                  {/* Baris Upload Logo Brand Landing Page */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoWeb || '/logo-kafela.svg'}
                        alt="Logo Studio"
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/70 bg-white shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">Foto Profil / Logo Brand di Aplikasi &amp; Website</p>
                        <p className="text-[11px] text-slate-400">
                          {uploadingSlot === 'LOGO'
                            ? 'Memproses logo...'
                            : logoWeb && logoWeb !== '/logo-kafela.svg'
                            ? 'Logo kustom terpasang'
                            : "Menggunakan Logo Resmi kafela's Agenda"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer">
                        <span>📷 Ganti Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleSelectPhotoFromGallery('LOGO', e.target.files?.[0], 500, setLogoWeb)
                          }
                        />
                      </label>
                      {logoWeb && logoWeb !== '/logo-kafela.svg' && (
                        <button
                          type="button"
                          onClick={() => setLogoWeb('/logo-kafela.svg')}
                          className="px-2.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 font-bold text-xs cursor-pointer"
                        >
                          Reset ke Logo Kafela
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid 8 Slot Foto Galeri */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }, (_, idx) => {
                      const slotId = `PORTO_${idx + 1}`;
                      const val = portoPhotos[idx] || '';
                      const captionVal = portoCaptions[idx] || '';
                      const isBgCover = idx === 0;
                      const isFeaturedTop = idx === 1;

                      const updatePhotoAt = (newUrl: string) => {
                        setPortoPhotos((prev) => {
                          const copy = [...prev];
                          copy[idx] = newUrl;
                          return copy;
                        });
                      };

                      const updateCaptionAt = (newCap: string) => {
                        setPortoCaptions((prev) => {
                          const copy = [...prev];
                          copy[idx] = newCap;
                          return copy;
                        });
                      };

                      return (
                        <div
                          key={slotId}
                          className={`rounded-xl p-2.5 flex flex-col justify-between space-y-2 border ${
                            isBgCover
                              ? 'bg-amber-950/20 border-amber-500/60'
                              : isFeaturedTop
                              ? 'bg-sky-950/20 border-sky-500/50'
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="text-[11px] font-extrabold text-white block">
                                {isBgCover
                                  ? '📌 Foto 1 (Sampul)'
                                  : isFeaturedTop
                                  ? '⭐ Foto 2 (Foto Utama)'
                                  : `🖼️ Foto ${idx + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-400 block leading-tight">
                                {isBgCover
                                  ? 'Latar Sampul Depan'
                                  : isFeaturedTop
                                  ? 'Foto Utama di Galeri'
                                  : 'Tampil di Grid Galeri'}
                              </span>
                            </div>
                            {val && (
                              <button
                                type="button"
                                onClick={() => {
                                  updatePhotoAt('');
                                  updateCaptionAt('');
                                }}
                                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                              >
                                Hapus
                              </button>
                            )}
                          </div>

                          {val ? (
                            <div className="relative rounded-lg overflow-hidden h-28 bg-slate-950 border border-slate-800">
                              <img
                                src={val}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold shadow bg-emerald-600 text-white">
                                ✓ Siap Simpan
                              </span>
                            </div>
                          ) : (
                            <label className="h-28 rounded-lg border-2 border-dashed border-slate-700 hover:border-purple-400 bg-slate-950 flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-colors">
                              <span className="text-lg">📷</span>
                              <span className="text-[11px] font-bold text-purple-300 mt-1">
                                {uploadingSlot === slotId ? 'Memproses...' : 'Pilih Foto'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleSelectPhotoFromGallery(
                                    slotId,
                                    e.target.files?.[0],
                                    1280,
                                    updatePhotoAt
                                  )
                                }
                              />
                            </label>
                          )}

                          {/* Input Judul / Keterangan Foto */}
                          {!isBgCover && (
                            <input
                              type="text"
                              placeholder="Judul / Keterangan Foto"
                              value={captionVal}
                              onChange={(e) => updateCaptionAt(e.target.value)}
                              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500"
                            />
                          )}

                          {isBgCover && (
                            <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-semibold text-center">
                              Latar Sampul Depan
                            </div>
                          )}

                          {val && (
                            <label className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-center text-[11px] font-bold text-slate-200 cursor-pointer block">
                              <span>Ganti Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleSelectPhotoFromGallery(
                                    slotId,
                                    e.target.files?.[0],
                                    1280,
                                    updatePhotoAt
                                  )
                                }
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. WEBSITE PROFIL KE-2 (TERTUTUP DEFAULT) */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSectionWeb2(!openSectionWeb2)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-white text-xs hover:bg-slate-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>✨</span>
                <span>Website Profil Ke-2 (Sub-Brand / Spesialisasi Niche)</span>
              </div>
              <span className="text-slate-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                {openSectionWeb2 ? '▲' : '▼'}
              </span>
            </button>
            {openSectionWeb2 && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-xs">
                      Website Profil Ke-2 (Sub-Brand / Spesialisasi Niche)
                    </h4>
                               </div>
                  <p className="text-[11px] text-slate-400">
                    Miliki 2 link profil web berbeda (misal: Wedding vs Self Studio / Wisuda / MUA) dalam 1 akun kasir yang sama!
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg hover:border-amber-400 transition-colors">
                <input
                  type="checkbox"
                  checked={web2Aktif}
                  onChange={(e) => setWeb2Aktif(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-white">
                  {web2Aktif ? 'Web Ke-2 Aktif' : 'Aktifkan Web Ke-2'}
                </span>
              </label>
            </div>

            {web2Aktif ? (
              <div className="space-y-4 pt-1">
                {/* Tautan Web 2 */}
                <div className="rounded-lg bg-slate-900/90 border border-amber-500/30 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-amber-400 block text-[11px] font-bold">
                      Tautan Langsung Web Profil Ke-2:
                    </span>
                    <span className="font-mono text-white text-xs select-all">
                      https://kflsagnd.web.app/{targetIdParam}?web=2
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://kflsagnd.web.app/${targetIdParam}?web=2`);
                        notifySaved('Tautan Web Profil Ke-2 disalin ke clipboard!');
                      }}
                      className="px-2.5 py-1.5 rounded border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </button>
                    <a
                      href={`/profil.html?id=${encodeURIComponent(targetIdParam)}&web=2&v=${previewReloadKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka Web Ke-2</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Sub-Judul / Nama Niche Spesialisasi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Wedding & Prewedding / Creative Self Studio"
                      value={web2SubJudul}
                      onChange={(e) => setWeb2SubJudul(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Slogan Khusus Web Ke-2
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Studio Foto Self-Service Pertama di Kota Anda"
                      value={web2Tagline}
                      onChange={(e) => setWeb2Tagline(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Bio / Deskripsi Perkenalan Khusus Web Ke-2
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Abadikan momen seru wisuda dan hangout tanpa fotografer, foto sepuasnya dengan shutter nirkabel..."
                    value={web2Bio}
                    onChange={(e) => setWeb2Bio(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Gaya Tata Letak Web Ke-2
                    </label>
                    <select
                      value={web2Layout}
                      onChange={(e) => setWeb2Layout(e.target.value as any)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                    >
                      <option value="VERTICAL_LANDING">⚡ Landing Page Modern (Scroll ke Bawah)</option>
                      <option value="HORIZONTAL_BOOK">📖 Buku Editorial (Geser Samping per Bab)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Tema Warna Web Ke-2
                    </label>
                    <select
                      value={web2Tema}
                      onChange={(e) => setWeb2Tema(e.target.value as any)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                    >
                      <option value="VERTICAL_LANDING">Obsidian Glow & Amber (Modern Landing)</option>
                      <option value="MODERN_STUDIO">Amour Ivory & Rose Gold</option>
                      <option value="LUXURY_GOLD">Royal Obsidian & Gold</option>
                      <option value="CLEAN_MINIMALIST">Botanical White & Sage</option>
                    </select>
                  </div>
                </div>

                {/* Pengaturan Link Booking Khusus Web 2 */}
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-2">
                  <label className="block text-white font-bold text-xs">
                    🔗 Opsi Link Booking untuk Web Ke-2:
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Kosongkan jika ingin memakai Form Booking utama bawaan, atau isi link khusus (misal Google Form / WhatsApp divisi khusus / reservasi slot):
                  </p>
                  <input
                    type="text"
                    placeholder="Contoh: https://wa.me/628... atau link khusus (Kosongkan = otomatis booking utama)"
                    value={web2LinkBookingKhusus}
                    onChange={(e) => setWeb2LinkBookingKhusus(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white text-xs font-mono"
                  />
                </div>

                {/* Upload Foto Khusus Web 2 */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs">
                      🖼️ Foto Portofolio Khusus Web Ke-2 (Hingga 6 Foto)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Foto 1 menjadi background sampul Web 2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {Array.from({ length: 6 }, (_, idx) => {
                      const slotId = `WEB2_PORTO_${idx + 1}`;
                      const val = web2PortoPhotos[idx] || '';
                      const capVal = web2PortoCaptions[idx] || '';
                      return (
                        <div key={slotId} className="rounded-lg p-2 bg-slate-900 border border-slate-800 space-y-1.5 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-slate-300 block truncate">
                            {idx === 0 ? '📌 Sampul Web 2' : `Foto ${idx + 1}`}
                          </span>
                          {val ? (
                            <div className="relative rounded overflow-hidden h-20 bg-slate-950 border border-slate-800">
                              <img src={val} alt={`Web 2 ${idx}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setWeb2PortoPhotos((prev) => { const c = [...prev]; c[idx] = ''; return c; });
                                  setWeb2PortoCaptions((prev) => { const c = [...prev]; c[idx] = ''; return c; });
                                }}
                                className="absolute top-1 right-1 px-1 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold cursor-pointer"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <label className="h-20 rounded border border-dashed border-slate-700 hover:border-amber-400 bg-slate-950 flex flex-col items-center justify-center text-center p-1 cursor-pointer">
                              <span className="text-sm">📷</span>
                              <span className="text-[9px] font-bold text-amber-300 mt-0.5">Pilih Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleSelectPhotoFromGallery(
                                    slotId,
                                    e.target.files?.[0],
                                    1280,
                                    (u) => setWeb2PortoPhotos((prev) => { const c = [...prev]; c[idx] = u; return c; })
                                  )
                                }
                              />
                            </label>
                          )}
                          <input
                            type="text"
                            placeholder="Judul"
                            value={capVal}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setWeb2PortoCaptions((prev) => { const c = [...prev]; c[idx] = newVal; return c; });
                            }}
                            className="w-full rounded bg-slate-950 border border-slate-800 px-1.5 py-1 text-[10px] text-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-900/50 border border-dashed border-slate-800 p-4 text-center space-y-2">
                <p className="text-slate-300 font-bold text-xs">
                  {owner.paketAktif !== 'Ultimate' 
                    ? 'Website Profil Ke-2 memerlukan Paket Ultimate.' 
                    : 'Website Profil Ke-2 belum diaktifkan.'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  {owner.paketAktif !== 'Ultimate' 
                    ? 'Upgrade ke paket Ultimate untuk mengaktifkan fitur website kedua.' 
                    : 'Aktifkan fitur ini untuk membuat halaman web kedua dengan portofolio, slogan, dan tema terpisah tanpa harus membuat akun kasir baru.'}
                </p>
                {owner.paketAktif === 'Ultimate' && (
                  <button
                    type="button"
                    onClick={() => setWeb2Aktif(true)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>✨ Aktifkan Web Profil Ke-2 Sekarang</span>
                  </button>
                )}
              </div>
            )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isSavingToast}
            onClick={async () => {
              const validPhotos: string[] = [];
              const validCaptions: string[] = [];
              for (let i = 0; i < 8; i++) {
                const u = (portoPhotos[i] || '').trim();
                if (u) {
                  // Pastikan foto lama yang ukurannya terlalu besar otomatis di-fit <= 95KB sebelum dikirim ke Firestore
                  const safePhoto =
                    u.startsWith('data:image/') && u.length > 98000
                      ? await compressDataUrlToBudget(u, 1280, 95000)
                      : u;
                  validPhotos.push(safePhoto);
                  validCaptions.push((portoCaptions[i] || '').trim());
                }
              }

              // Fit foto Web 2
              const validWeb2Photos: string[] = [];
              const validWeb2Captions: string[] = [];
              for (let i = 0; i < 6; i++) {
                const u2 = (web2PortoPhotos[i] || '').trim();
                if (u2) {
                  const safePhoto2 =
                    u2.startsWith('data:image/') && u2.length > 98000
                      ? await compressDataUrlToBudget(u2, 1280, 95000)
                      : u2;
                  validWeb2Photos.push(safePhoto2);
                  validWeb2Captions.push((web2PortoCaptions[i] || '').trim());
                }
              }

              const safeLogo =
                logoWeb && logoWeb.startsWith('data:image/') && logoWeb.length > 48000
                  ? await compressDataUrlToBudget(logoWeb, 500, 45000)
                  : logoWeb || '/logo-kafela.svg';

              // Check rate limit
              const isAllowed = await checkAndIncrementActions(owner.uid, owner.paketAktif);
              if (!isAllowed) {
                alert("Batas aktivitas harian tercapai. Silakan coba lagi besok.");
                return;
              }

              handleSaveOwnerWithToast(
                {
                  username: usernameWeb.trim().toLowerCase().replace(/\s+/g, ''),
                  taglineWeb,
                  bioWeb,
                  linkIg,
                  linkTiktok,
                  lokasi1,
                  lokasi2,
                  lokasi3,
                  logoBrandUrl: safeLogo,
                  portofolioWeb: validPhotos,
                  portofolioCaptions: validCaptions,
                  temaWeb,
                  layoutWeb,
                  pesanPenutupWeb,
                  jamOperasionalWeb,
                  ctaTeksKustom,
                  ctaLinkKustom,
                  teksTombolBooking,
                  isWebsiteActive,
                  isBookingActive,
                  webProfil2: {
                    aktif: web2Aktif,
                    subJudul: web2SubJudul.trim(),
                    usernameSlug: web2Slug.trim().toLowerCase().replace(/\s+/g, ''),
                    taglineWeb: web2Tagline,
                    bioWeb: web2Bio,
                    temaWeb: web2Tema,
                    layoutWeb: web2Layout,
                    linkBookingKhusus: web2LinkBookingKhusus.trim(),
                    portofolioWeb: validWeb2Photos,
                    portofolioCaptions: validWeb2Captions,
                    pesanPenutupWeb,
                  },
                },
                'Pengaturan Website, Layout, Penutup & Web Ke-2 berhasil disimpan ke server!'
              );
            }}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-extrabold shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSavingToast
                ? 'Menyimpan ke Server...'
                : 'Simpan Identitas Website'}
            </span>
          </button>
        </div>
      )}

      {/* 3. TAB REKENING BANK & QRIS */}
      {subTab === 'REKENING' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Atur Rekening Pembayaran &amp; Link QRIS
              </h3>
              <p className="text-[11px] text-slate-400">
                Otomatis dicantumkan saat mengirim tagihan atau instruksi DP ke WhatsApp klien
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Bank Utama</label>
              <input
                type="text"
                placeholder="BCA"
                value={rekState.bankUtama}
                onChange={(e) => setRekState({ ...rekState, bankUtama: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Nomor Rekening</label>
              <input
                type="text"
                placeholder="3770xxx"
                value={rekState.rekUtama}
                onChange={(e) => setRekState({ ...rekState, rekUtama: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Atas Nama</label>
              <input
                type="text"
                value={rekState.namaUtama}
                onChange={(e) => setRekState({ ...rekState, namaUtama: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Bank / E-Wallet ke-2</label>
              <input
                type="text"
                placeholder="DANA / Mandiri"
                value={rekState.bankAlternatif}
                onChange={(e) => setRekState({ ...rekState, bankAlternatif: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">No. Rek / HP ke-2</label>
              <input
                type="text"
                value={rekState.rekAlternatif}
                onChange={(e) => setRekState({ ...rekState, rekAlternatif: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Atas Nama ke-2</label>
              <input
                type="text"
                value={rekState.namaAlternatif}
                onChange={(e) => setRekState({ ...rekState, namaAlternatif: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Link Pembayaran / QRIS (Opsional)</label>
            <input
              type="text"
              placeholder="https://..."
              value={rekState.linkPembayaran}
              onChange={(e) => setRekState({ ...rekState, linkPembayaran: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-white font-mono"
            />
          </div>

          <button
            type="button"
            disabled={isSavingToast}
            onClick={async () => {
              setIsSavingToast(true);
              setSavedBanner('Menyimpan rekening ke server...');
              await onUpdateRekening(rekState);
              notifySaved('Data Rekening Bank & QRIS berhasil disimpan!');
            }}
            className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {isSavingToast ? 'Menyimpan...' : 'Simpan Pengaturan Rekening'}
          </button>
        </div>
      )}

      {/* 4. TAB TEMPLATE PESAN WHATSAPP */}
      {subTab === 'WA' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3.5 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Pengaturan Template Pesan WhatsApp</h3>
              <p className="text-[11px] text-slate-400">
                Sesuaikan kalimat pesan otomatis saat mengirim tagihan atau konfirmasi ke klien
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-sky-950/40 border border-sky-500/30 p-3 text-[11px] text-sky-200">
            <strong>Kode Otomatis:</strong> <code>[NAMA]</code> <code>[ACARA]</code>{' '}
            <code>[LOKASI]</code> <code>[SISA]</code> <code>[HARGA]</code> <code>[REKENING]</code>{' '}
            <code>[BRAND]</code> <code>[TANGGAL]</code>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              1. Pesan Penagihan (Masih ada sisa tagihan)
            </label>
            <textarea
              rows={3}
              value={waTagihan}
              onChange={(e) => setWaTagihan(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              2. Pesan Konfirmasi Jadwal (Lunas / Pengingat H-1)
            </label>
            <textarea
              rows={3}
              value={waKonfirmasi}
              onChange={(e) => setWaKonfirmasi(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-purple-300 font-semibold mb-1">
              3. Pesan Booking Baru (Dari Web / Instruksi DP)
            </label>
            <textarea
              rows={3}
              value={waBookingWeb}
              onChange={(e) => setWaBookingWeb(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>

          <button
            type="button"
            disabled={isSavingToast}
            onClick={() =>
              handleSaveOwnerWithToast(
                {
                  templateWaTagihan: waTagihan,
                  templateWaKonfirmasi: waKonfirmasi,
                  templateWaBookingWeb: waBookingWeb,
                },
                'Template WhatsApp berhasil disimpan!'
              )
            }
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {isSavingToast ? 'Menyimpan...' : 'Simpan Template WhatsApp'}
          </button>
        </div>
      )}

      {/* 5. TAB INFO PAKET LANGGANAN & SALDO AKUN */}
      {subTab === 'PAKET' && (
        <div className="rounded-xltext-xs">
          {/* SALDO AKUN BANNER */}
<div className="rounded-xl bg-slate-950 border border-amber-500/30 p-3 shadow-lg">
  <div className="flex flex-wrap items-center justify-between gap-3">
    {/* Informasi Saldo */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-base">
        💳
      </div>

      <div>
        <p className="text-slate-400 text-[11px]">
          Saldo Akun
        </p>

        <p className="text-xl font-mono font-extrabold text-amber-400">
          Rp {(owner.saldo || 0).toLocaleString("id-ID")}
        </p>
      </div>
    </div>

    {/* Tombol Aksi Saldo */}
    <div className="flex flex-wrap items-center gap-2">


      <button
        type="button"
        onClick={() => setIsTopUpModalOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
      >
        <span>+</span>
        <span>Top-Up Saldo</span>
      </button>
    </div>
  </div>
</div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2 pt-2">
            <div>
              <h2 className="text-base font-bold text-white">
                Pilih &amp; Perpanjang Paket Langganan
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Paket Aktif Saat Ini:{' '}
                <span className="text-emerald-400 font-bold uppercase">
                  {owner.paketAktif} (Sisa {sisaHari} Hari)
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDurasiPaketStudio('BULANAN')}
                className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                  durasiPaketStudio === 'BULANAN' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                Bulanan (30 Hari)
              </button>
              <button
                type="button"
                onClick={() => setDurasiPaketStudio('TAHUNAN')}
                className={`px-3 py-2 rounded font-semibold cursor-pointer ${
                  durasiPaketStudio === 'TAHUNAN' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Tahunan (Hemat 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {(
              [
                {
                  tier: 'Starter',
                  title: 'Paket Starter (Standar)',
                  priceVal: durasiPaketStudio === 'TAHUNAN' ? 158400 : 16500,
                  days: durasiPaketStudio === 'TAHUNAN' ? 365 : 30,
                  price: durasiPaketStudio === 'TAHUNAN' ? 'Rp 158.400 / thn' : 'Rp 16.500 / bln',
                  desc: '1 Owner (0 Admin, 0 Crew) • Maks 100 Jadwal/Bulan • Khusus Aplikasi HP',
                },
                {
                  tier: 'Pro',
                  title: 'Paket Pro (Terlaris)',
                  priceVal: durasiPaketStudio === 'TAHUNAN' ? 432000 : 45000,
                  days: durasiPaketStudio === 'TAHUNAN' ? 365 : 30,
                  price: durasiPaketStudio === 'TAHUNAN' ? 'Rp 432.000 / thn' : 'Rp 45.000 / bln',
                  desc: '1 Owner & 1 Admin (0 Crew) • Maks 300 Jadwal/Bulan • Akses Kasir PC • Link Website Pribadi',
                },
                {
                  tier: 'Ultimate',
                  title: 'Paket Ultimate',
                  priceVal: durasiPaketStudio === 'TAHUNAN' ? 1334400 : 139000,
                  days: durasiPaketStudio === 'TAHUNAN' ? 365 : 30,
                  price: durasiPaketStudio === 'TAHUNAN' ? 'Rp 1.334.400 / thn' : 'Rp 139.000 / bln',
                  desc: '1 Owner, 2 Admin & 10 Crew • Jadwal Unlimited • Kasir PC Live Sync • Fitur Tim Lengkap',
                },
              ] as { tier: PaketLanggananTier; title: string; priceVal: number; days: number; price: string; desc: string }[]
            ).map((p) => {
              const active = owner.paketAktif.toLowerCase() === p.tier.toLowerCase();
              return (
                <div
                  key={p.tier}
                  className={`rounded-xl p-4 border flex flex-col justify-between ${
                    active
                      ? 'bg-sky-950/35 border-sky-500 shadow-lg'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{p.title}</span>
                      <span className="font-mono font-bold text-emerald-400">{p.price}</span>
                    </div>
                    <p className="text-slate-400 mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                  <div className="mt-1 pt-2.5 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={async () => {
                        const currentSaldo = owner.saldo || 0;
                        if (currentSaldo < p.priceVal) {
                          alert(`Saldo Anda tidak mencukupi (Rp ${currentSaldo.toLocaleString()}). Diperlukan Rp ${p.priceVal.toLocaleString()}. Silakan Top-Up Saldo terlebih dahulu.`);
                          setIsTopUpModalOpen(true);
                          return;
                        }
                        if (!confirm(`Konfirmasi Perpanjang/Upgrade ke ${p.title} (${durasiPaketStudio}) seharga ${p.price} menggunakan Saldo Akun?`)) return;

                        setIsSavingToast(true);
                        setSavedBanner('Memproses perpanjangan dengan saldo...');
                        const res = await renewSubscriptionWithSaldo(owner.uid, owner.username || owner.uid, p.tier, p.days, p.priceVal);
                        setIsSavingToast(false);
                        if (res.success) {
                          notifySaved(`Berhasil memperpanjang paket ${p.tier}! Saldo telah dipotong.`);
                          onUpdateOwner({
                            paketAktif: p.tier,
                            saldo: currentSaldo - p.priceVal,
                            tanggalLangganan: res.newExpired || (Math.max(owner.tanggalLangganan || Date.now(), Date.now()) + p.days * 24 * 60 * 60 * 1000),
                          });
                        } else {
                          alert(res.error || 'Gagal memperpanjang paket.');
                        }
                      }}
                      className={`w-full py-2 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                        active
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                    >
                      {active ? `✓ Perpanjang Paket Ini (${p.price})` : `Pilih & Aktifkan (${p.price})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL TOP-UP SALDO REUSABLE */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        owner={owner}
      />

      {/* PRATINJAU HALAMAN HABIS LANGGANAN */}
      {isTestExpiredLocal && (
        <SubscriptionExpiredScreen
          owner={owner}
          userRole="owner"
          onUpdateOwner={onUpdateOwner}
          onLogout={() => setIsTestExpiredLocal(false)}
          isTestPreview={true}
          onCloseTestMode={() => setIsTestExpiredLocal(false)}
        />
      )}
    
    </div>
  );
};

export const DaftarPelangganView: React.FC<{
  pelangganList: PelangganModel[];
  onSavePelanggan: (p: PelangganModel) => void;
  onDeletePelanggan: (id: string) => void;
}> = ({ pelangganList, onSavePelanggan, onDeletePelanggan }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PelangganModel | null>(null);
  const [nama, setNama] = useState('');
  const [noWhatsApp, setNoWhatsApp] = useState('');
  const [catatan, setCatatan] = useState('');

  const filtered = pelangganList.filter(
    (c) => c.nama.toLowerCase().includes(searchQuery.toLowerCase()) || c.noWhatsApp.includes(searchQuery)
  );

  const handleOpenAdd = () => {
    setEditItem(null);
    setNama('');
    setNoWhatsApp('');
    setCatatan('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PelangganModel) => {
    setEditItem(p);
    setNama(p.nama);
    setNoWhatsApp(p.noWhatsApp);
    setCatatan(p.catatan || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !noWhatsApp.trim()) return;
    const payload: PelangganModel = {
      idPelanggan: editItem ? editItem.idPelanggan : `cust_${Date.now()}`,
      nama: nama.trim(),
      noWhatsApp: noWhatsApp.trim(),
      catatan: catatan.trim(),
      createdAt: editItem ? editItem.createdAt : Date.now(),
    };
    onSavePelanggan(payload);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Daftar Pelanggan</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {pelangganList.length} Pelanggan
              </span>
            </div>
            <p className="text-xs text-slate-400">Database  pelanggan dan WhatsApp </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Pelanggan</span>
        </button>
      </div>

      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
        <Search className="w-4 h-4 text-slate-400 mr-2" />
        <input
          type="text"
          placeholder="Cari nama pelanggan atau nomor WhatsApp..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white focus:outline-none"
        />
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {searchQuery ? 'Tidak ada data pelanggan yang cocok dengan pencarian.' : 'Belum ada data pelanggan tersimpan.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4 font-semibold">Nama Pelanggan</th>
                  <th className="py-3 px-4 font-semibold">Nomor WhatsApp</th>
                  <th className="py-3 px-4 font-semibold">Catatan</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((c) => (
                  <tr key={c.idPelanggan} className="hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{c.nama}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      <a
                        href={`https://wa.me/${c.noWhatsApp.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span>{c.noWhatsApp}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.catatan || '-'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="px-2.5 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menghapus data pelanggan "${c.nama}"?`)) {
                            onDeletePelanggan(c.idPelanggan);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                {editItem ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Budi Santoso"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nomor WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="Cth: 08123456789"
                  value={noWhatsApp}
                  onChange={(e) => setNoWhatsApp(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Catatan Pelanggan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Cth: Pelanggan langganan VIP"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

