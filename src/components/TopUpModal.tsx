import { useState } from 'react';
import { Copy, Check, MessageSquare, CreditCard, X } from 'lucide-react';
import { OwnerProfile } from '../types/kafela';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: OwnerProfile;
}

export function TopUpModal({ isOpen, onClose, owner }: TopUpModalProps) {
  const [topUpNominal, setTopUpNominal] = useState<string>('50000');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const num = Number(topUpNominal);
  const isValidNominal = Number.isSafeInteger(num) && num >= 10000;

  const handleSendWA = () => {
    if (!isValidNominal) return;

    const pesan = [
      'Halo Admin Kafela, saya ingin melakukan top-up saldo studio.',
      '',
      `Nama Owner: ${owner.namaOwner || '-'}`,
      `Nama Brand: ${owner.namaBrand || '-'}`,
      `Username: ${owner.username || '-'}`,
      `Nominal Top-Up: Rp ${num.toLocaleString('id-ID')}`,
      '',
      'Saya akan melampirkan bukti transfer pada chat ini.',
      'Mohon bantu verifikasi dan penambahan saldo akun saya. Terima kasih!'
    ].join('\n');

    const url = `https://wa.me/6283132304649?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-slate-100"
      >
        {/* HEADER */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="topup-title" className="text-base font-bold text-white">
                Top-Up Saldo Akun Studio
              </h3>
              <p className="text-xs text-slate-400">
                Saldo saat ini:{' '}
                <span className="font-mono font-bold text-amber-400">
                  Rp {(owner.saldo || 0).toLocaleString('id-ID')}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup modal"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* INFORMASI REKENING RESMI */}
          <div className="space-y-2 rounded-xl border border-amber-500/20 bg-slate-950 p-3.5">
            <p className="leading-relaxed text-slate-300 font-medium text-[11px]">
              Silakan transfer sesuai nominal ke salah satu rekening resmi di bawah:
            </p>

            {/* BRI */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Bank BRI
                </span>
                <p className="font-mono text-sm font-bold text-amber-400 mt-0.5">
                  4108 0100 8396 530
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">a.n. Iqbal S Nuha</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('410801008396530', 'BRI')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                {copiedBank === 'BRI' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBank === 'BRI' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            {/* DANA */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  E-Wallet DANA
                </span>
                <p className="font-mono text-sm font-bold text-amber-400 mt-0.5">
                  0858 9026 1536
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">a.n. Suci S Kusumah</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('085890261536', 'DANA')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                {copiedBank === 'DANA' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBank === 'DANA' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* INPUT NOMINAL */}
          <div className="space-y-2">
            <label htmlFor="topup-nominal-input" className="block font-semibold text-slate-200 text-xs">
              Nominal Top-Up:
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1 transition focus-within:border-amber-500">
              <span className="font-bold text-slate-400">Rp</span>
              <input
                id="topup-nominal-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Contoh: 50000"
                value={topUpNominal}
                onChange={(e) => setTopUpNominal(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent py-2.5 font-mono text-sm font-bold text-white outline-none placeholder:text-slate-600"
              />
            </div>

            {/* PILIHAN CEPAT */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[20000, 50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpNominal(String(amt))}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold cursor-pointer transition ${
                    topUpNominal === String(amt)
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                      : 'border-slate-800 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  Rp {(amt / 1000).toFixed(0)}rb
                </button>
              ))}
            </div>

            {/* RINGKASAN */}
            {isValidNominal ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                <span className="text-slate-300 text-xs">Total yang akan ditransfer:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  Rp {num.toLocaleString('id-ID')}
                </span>
              </div>
            ) : (
              topUpNominal !== '' && (
                <p className="text-[11px] text-red-400">Minimal top-up saldo adalah Rp 10.000.</p>
              )
            )}
          </div>

          {/* PETUNJUK VERIFIKASI */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-amber-400">Penting:</span> Setelah transfer berhasil, klik tombol di bawah untuk konfirmasi otomatis ke WhatsApp Admin dengan melampirkan screenshot bukti transfer. Saldo akan langsung ditambahkan ke akun Anda.
          </div>

          {/* AKSI */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!isValidNominal}
              onClick={handleSendWA}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Kirim Konfirmasi via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
