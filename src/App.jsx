import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, PlusCircle, CheckCircle, AlertCircle,
  Edit2, Trash2, X, Loader2, RefreshCw, FileText, Calendar,
  Search, ChevronLeft, ChevronRight, Lock, KeyRound, User,
  Camera, Image as ImageIcon, Link as LinkIcon,
  PieChart, Lightbulb,
  Download, Printer, LogOut, Eye, EyeOff, ShieldCheck,
  CreditCard, Target, Zap, ArrowUpRight, ArrowDownLeft, Percent
} from 'lucide-react';
import { Field, Segmented, Modal, StatTile, MoneyInput } from './ui';
import MonthlyTrend from './MonthlyTrend';

import {
  fetchAllTransactions, saveTransaction, removeTransaction,
  subscribeAuth, login, logout, confirmPassword, fetchReceipt
} from './firebase';
import { compressImage } from './compressImage';

const CRITERIA_LIST = [
  "Pemeliharaan kendaraan bermotor, bahan bakar kendaraan bermotor, dan biaya tol",
  "Pembelian material kecil untuk pemeliharaan yang bersifat emergency",
  "Pemakaian perkakas dan peralatan",
  "Gas dan Air",
  "Pos dan Telekomunikasi",
  "Bahan makanan dan Konsumsi",
  "Alat dan Keperluan Kantor",
  "Barang Cetakan",
  "Pajak dan Retribusi",
  "Iuran, Abonemen, dan Iklan",
  "Penerbitan",
  "Biaya Keamanan",
  "Biaya Pemeliharaan Gedung",
  "Operasional",
  "Lain-Lain",
  "Pemasukan Kas"
];

const PETUGAS_MAP = { 'Ade': 'Cash Card', 'Revol ex Satria': 'Taktis', 'Raka ex Herry': 'Lisdes' };
const WALLETS = ['Cash Card', 'Taktis', 'Lisdes'];
const WALLET_STYLE = {
  'Cash Card': { label: 'Ops Kantor', pic: 'PIC Ade', icon: CreditCard, tint: 'bg-lime/15 text-lime' },
  'Taktis': { label: 'Taktis', pic: 'PIC Revol Ex Satria', icon: Target, tint: 'bg-violet/15 text-violet' },
  'Lisdes': { label: 'Lisdes', pic: 'PIC Raka Ex Herry', icon: Zap, tint: 'bg-amber/15 text-amber' }
};
// Nama tampilan saja; nilai yang tersimpan di database tetap 'Cash Card' dst.
const walletName = (wallet) => WALLET_STYLE[wallet]?.label ?? wallet;
const NAV_ITEMS = [
  { value: 'input', icon: PlusCircle, label: 'Input' },
  { value: 'journal', icon: FileText, label: 'Jurnal' },
  { value: 'analysis', icon: PieChart, label: 'Analisa' }
];

const INITIAL_FORM_STATE = {
  id: '',
  date: new Date().toISOString().split('T')[0],
  type: 'Pengeluaran',
  wallet: 'Cash Card',
  petugas: 'Ade',
  criteria: 'Bahan makanan dan Konsumsi',
  amount: '',
  description: '',
  receiptBase64: null
};

export default function PettyCashApp() {
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App States
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [activeTab, setActiveTab] = useState(WALLETS[0]);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [mainMenu, setMainMenu] = useState('input');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authModal, setAuthModal] = useState({ show: false, pendingAction: null, data: null, id: null, password: '', error: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [editModal, setEditModal] = useState({ show: false, data: null });
  const [receiptPreview, setReceiptPreview] = useState({ show: false, dataUrl: null });
  const [hideBalance, setHideBalance] = useState(false);

  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());

  const fileInputRef = useRef(null);

  const months = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  useEffect(() => subscribeAuth((user) => {
    setIsLoggedIn(!!user);
    setIsAuthReady(true);
    if (!user) {
      setIsAuthorized(false);
      setTransactions([]);
    }
  }), []);

  useEffect(() => {
    if (isLoggedIn) fetchTransactions();
  }, [isLoggedIn]);

  useEffect(() => { setCurrentPage(1); }, [filterMonth, filterYear, activeTab, searchQuery]);

  const authErrorMessage = (error) => {
    if (error.code === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Coba lagi nanti.';
    if (error.code === 'auth/network-request-failed') return 'Koneksi gagal. Periksa jaringan Anda.';
    return 'Username atau password salah.';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await login(loginData.username, loginData.password);
      setLoginData({ username: '', password: '' });
    } catch (error) {
      setLoginError(authErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Gagal keluar:", error);
      showToast("Gagal keluar. Periksa jaringan Anda.", "error");
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllTransactions();
      const parsedData = data.map(t => ({
        ...t, id: t.id.toString(), amount: parseFloat(t.amount)
      }));
      setTransactions(parsedData);
    } catch (error) {
      console.error("Gagal memuat:", error);
      showToast("Koneksi gagal. Periksa jaringan Anda.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, data, successMessage, receiptDataUrl) => {
    setIsLoading(true);
    try {
      if (action === 'delete') await removeTransaction(data.id);
      else await saveTransaction(data, receiptDataUrl); // 'add' dan 'edit'
      showToast(successMessage, "success");
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error(`Gagal ${action}:`, error);
      showToast(`Gagal: ${error.message}`, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const openReceipt = async (t) => {
    if (typeof t.receiptUrl === 'string' && t.receiptUrl.startsWith('http')) {
      setReceiptPreview({ show: true, dataUrl: t.receiptUrl });
      return;
    }
    setIsLoading(true);
    try {
      const dataUrl = await fetchReceipt(t.id);
      if (dataUrl) setReceiptPreview({ show: true, dataUrl });
      else showToast("Foto kwitansi tidak ditemukan.", "error");
    } catch (error) {
      console.error("Gagal memuat foto:", error);
      showToast("Gagal memuat foto kwitansi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsScanning(true);
      showToast("Memproses gambar...", "success");
      const base64DataUrl = await compressImage(file);
      setForm(prev => ({ ...prev, receiptBase64: base64DataUrl }));
    } catch (error) {
      showToast("Gagal memproses gambar.", "error");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      await confirmPassword(authModal.password);
      setIsAuthorized(true);
      const { pendingAction, data, id } = authModal;
      setAuthModal({ show: false, pendingAction: null, data: null, id: null, password: '', error: '' });
      if (pendingAction === 'edit') setEditModal({ show: true, data });
      if (pendingAction === 'delete') setDeleteModal({ show: true, id });
      showToast("Akses diizinkan!", "success");
    } catch (error) {
      setAuthModal(prev => ({ ...prev, error: authErrorMessage(error) }));
    }
  };

  const triggerProtectedAction = (action, item) => {
    if (isAuthorized) {
      if (action === 'edit') setEditModal({ show: true, data: item });
      if (action === 'delete') setDeleteModal({ show: true, id: item.id });
    } else {
      setAuthModal({ show: true, pendingAction: action, data: action === 'edit' ? item : null, id: action === 'delete' ? item.id : null, password: '', error: '' });
    }
  };

  const handlePetugasChange = (petugas) => { setForm(prev => ({ ...prev, petugas, wallet: PETUGAS_MAP[petugas] })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) { showToast("Harap isi uraian dan nominal!", "error"); return; }

    const processSubmit = async () => {
      const newTransaction = {
        ...form,
        id: Date.now().toString(),
        amount: parseFloat(form.amount),
        criteria: form.type === 'Pemasukan' ? 'Pemasukan Kas' : form.criteria,
        timestamp: new Date().toISOString(),
        hasReceipt: !!form.receiptBase64
      };

      delete newTransaction.receiptBase64;

      const saved = await handleAction('add', newTransaction, "Transaksi berhasil disimpan!", form.receiptBase64);
      // Form dan foto tetap ada kalau gagal, supaya tidak perlu mengisi ulang
      if (saved) setForm(prev => ({ ...INITIAL_FORM_STATE, petugas: prev.petugas, wallet: prev.wallet }));
    };

    processSubmit();
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedData = {
      ...editModal.data,
      amount: parseFloat(editModal.data.amount),
      criteria: editModal.data.type === 'Pemasukan' ? 'Pemasukan Kas' : editModal.data.criteria,
      timestamp: new Date().toISOString()
    };
    handleAction('edit', updatedData, "Transaksi diperbarui!");
    setEditModal({ show: false, data: null });
  };

  const confirmDelete = () => {
    if (deleteModal.id) { handleAction('delete', { id: deleteModal.id }, "Transaksi dihapus!"); setDeleteModal({ show: false, id: null }); }
  };

  const periodData = useMemo(() => {
    const allDataUpToPeriod = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const filteredJournal = allDataUpToPeriod.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() + 1 === filterMonth && tDate.getFullYear() === filterYear;
    });

    const summary = {
      pemasukan: 0, pengeluaran: 0,
      wallets: { 'Cash Card': { pemasukan: 0, pengeluaran: 0 }, 'Taktis': { pemasukan: 0, pengeluaran: 0 }, 'Lisdes': { pemasukan: 0, pengeluaran: 0 } }
    };

    filteredJournal.forEach(t => {
      if (t.type === 'Pemasukan') {
        summary.pemasukan += t.amount;
        if (summary.wallets[t.wallet]) summary.wallets[t.wallet].pemasukan += t.amount;
      } else {
        summary.pengeluaran += t.amount;
        if (summary.wallets[t.wallet]) summary.wallets[t.wallet].pengeluaran += t.amount;
      }
    });
    return { allDataUpToPeriod, filteredJournal, summary };
  }, [transactions, filterMonth, filterYear]);

  const activeJournalData = useMemo(() => periodData.filteredJournal.filter(t => t.wallet === activeTab), [periodData, activeTab]);

  const processedJournalData = useMemo(() => {
    const searched = activeJournalData.filter(t =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.criteria && t.criteria.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const totalPages = Math.ceil(searched.length / ITEMS_PER_PAGE) || 1;
    const paginated = searched.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { data: paginated, totalPages, totalItems: searched.length };
  }, [activeJournalData, searchQuery, currentPage]);

  const balances = useMemo(() => {
    const bals = { 'Cash Card': 0, 'Taktis': 0, 'Lisdes': 0, Total: 0 };
    const endOfPeriod = new Date(filterYear, filterMonth, 0);
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate <= endOfPeriod) {
        if (t.type === 'Pemasukan') { bals[t.wallet] += t.amount; bals.Total += t.amount; }
        else { bals[t.wallet] -= t.amount; bals.Total -= t.amount; }
      }
    });
    return bals;
  }, [transactions, filterMonth, filterYear]);

  const analysisData = useMemo(() => {
    const totalPengeluaran = periodData.summary.pengeluaran;
    const totalPemasukan = periodData.summary.pemasukan;
    const kriteriaMap = {};
    periodData.filteredJournal.forEach(t => { if (t.type === 'Pengeluaran') kriteriaMap[t.criteria] = (kriteriaMap[t.criteria] || 0) + t.amount; });
    const kriteriaList = Object.entries(kriteriaMap).map(([name, amount]) => ({
      name, amount, percentage: totalPengeluaran > 0 ? (amount / totalPengeluaran) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
    let topKriteria = kriteriaList.length > 0 ? kriteriaList[0] : null;
    let dompetTerboros = WALLETS.reduce((max, w) => (periodData.summary.wallets[w].pengeluaran > (periodData.summary.wallets[max]?.pengeluaran || 0)) ? w : max, WALLETS[0]);
    return { totalPengeluaran, totalPemasukan, kriteriaList, topKriteria, dompetTerboros };
  }, [periodData]);

  const monthlyTrend = useMemo(() => {
    const totals = months.map(() => 0);
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (t.type === 'Pengeluaran' && tDate.getFullYear() === filterYear) totals[tDate.getMonth()] += t.amount;
    });
    const now = new Date();
    return months.map((m, i) => ({
      label: m.label.slice(0, 3),
      fullLabel: `${m.label} ${filterYear}`,
      // Bulan yang belum berjalan tidak digambar sebagai nol
      value: filterYear > now.getFullYear() || (filterYear === now.getFullYear() && i > now.getMonth()) ? null : totals[i]
    }));
  }, [transactions, filterYear]);

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const getExportData = () => {
    return activeJournalData.map(t => {
      const tDate = new Date(t.date);
      const previousData = periodData.allDataUpToPeriod.filter(pt => pt.wallet === t.wallet && (new Date(pt.date) < tDate || (new Date(pt.date).getTime() === tDate.getTime() && pt.id <= t.id)));
      let runBal = 0;
      previousData.forEach(pt => { if (pt.type === 'Pemasukan') runBal += pt.amount; else runBal -= pt.amount; });
      return { ...t, runBal };
    });
  };

  const handleExportExcel = () => {
    const dataToExport = getExportData();
    let csvContent = "\uFEFFTanggal,Uraian,Kriteria,Pemasukan,Pengeluaran,Saldo Akhir\n";
    dataToExport.forEach(row => {
      const date = new Date(row.date).toLocaleDateString('id-ID');
      const desc = `"${row.description.replace(/"/g, '""')}"`;
      const crit = `"${row.criteria && row.criteria !== 'Pemasukan Kas' ? row.criteria : ''}"`;
      const pem = row.type === 'Pemasukan' ? row.amount : 0;
      const peng = row.type === 'Pengeluaran' ? row.amount : 0;
      const bal = row.runBal;
      csvContent += `${date},${desc},${crit},${pem},${peng},${bal}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const monthLabel = months.find(m => m.value === filterMonth).label;
    link.setAttribute("href", url);
    link.setAttribute("download", `Jurnal_${walletName(activeTab)}_${monthLabel}_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Data diekspor ke Excel!", "success");
  };

  const handleExportPDF = () => {
    const dataToExport = getExportData();
    const printWindow = window.open('', '_blank');
    const monthLabel = months.find(m => m.value === filterMonth).label;

    printWindow.document.write(`
      <html>
        <head>
          <title>Jurnal ${walletName(activeTab)} - ${monthLabel} ${filterYear}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f766e; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #0f766e; font-size: 22px; }
            .header p { margin: 5px 0 0; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; color: #0f766e; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-green { color: #16a34a; }
            .text-red { color: #dc2626; }
            .criteria { display: block; font-size: 10px; color: #64748b; margin-top: 4px; }
            @media print { body { padding: 0; } @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <div class="header"><h1>Buku Jurnal Kas Kecil - ${walletName(activeTab)}</h1><p>Periode: ${monthLabel} ${filterYear}</p></div>
          <table>
            <thead>
              <tr><th width="12%">Tanggal</th><th width="40%">Uraian / Keterangan</th><th width="16%" class="text-right">Pemasukan</th><th width="16%" class="text-right">Pengeluaran</th><th width="16%" class="text-right">Saldo Akhir</th></tr>
            </thead>
            <tbody>
              ${dataToExport.length === 0 ? `<tr><td colspan="5" style="text-align:center">Tidak ada transaksi pada periode ini.</td></tr>` : ''}
              ${dataToExport.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><span class="font-bold">${t.description}</span>${t.criteria && t.criteria !== 'Pemasukan Kas' ? `<span class="criteria">${t.criteria}</span>` : ''}</td>
                  <td class="text-right text-green">${t.type === 'Pemasukan' ? formatRp(t.amount) : '-'}</td>
                  <td class="text-right text-red">${t.type === 'Pengeluaran' ? formatRp(t.amount) : '-'}</td>
                  <td class="text-right font-bold">${formatRp(t.runBal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="text-align: right; margin-top: 30px; font-size: 11px; color: #94a3b8;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const brandMark = () => (
    <div className="w-12 h-12 flex-none rounded-2xl bg-lime text-ink flex items-center justify-center">
      <Wallet className="w-6 h-6" />
    </div>
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="enter w-full max-w-[400px] card p-7 sm:p-9">
          {brandMark()}
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Petty Cash ULP</h1>
          <p className="mt-1 text-sm text-muted">Sistem pengelolaan kas kecil Agats</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <Field label="Username" htmlFor="login-username">
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  className="input !pl-11"
                  placeholder="Masukkan username"
                />
              </div>
            </Field>
            <Field label="Password" htmlFor="login-password">
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  className="input !pl-11 !pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-faint hover:text-fg">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {loginError && (
              <div role="alert" className="p-3 bg-down/10 rounded-xl flex items-center gap-2 text-down text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-none" /> {loginError}
              </div>
            )}

            <button type="submit" disabled={isLoggingIn} className="btn-primary w-full">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const money = (value) => (hideBalance ? 'Rp ••••••' : formatRp(value));
  const hasReceipt = (t) => t.hasReceipt || (typeof t.receiptUrl === 'string' && t.receiptUrl.startsWith('http'));
  const shortDate = (value) => new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthLabel = months.find(m => m.value === filterMonth).label;

  const journalRows = processedJournalData.data.map(t => {
    const tDate = new Date(t.date);
    const previousData = periodData.allDataUpToPeriod.filter(pt => pt.wallet === t.wallet && (new Date(pt.date) < tDate || (new Date(pt.date).getTime() === tDate.getTime() && pt.id <= t.id)));
    let runBal = 0;
    previousData.forEach(pt => { if (pt.type === 'Pemasukan') runBal += pt.amount; else runBal -= pt.amount; });
    return { ...t, runBal };
  });

  const startEntry = (type) => {
    setForm(prev => ({ ...prev, type, receiptBase64: type === 'Pemasukan' ? null : prev.receiptBase64 }));
    setMainMenu('input');
  };

  const startScan = () => {
    startEntry('Pengeluaran');
    fileInputRef.current?.click();
  };

  const openWallet = (wallet) => {
    setActiveTab(wallet);
    setMainMenu('journal');
  };

  const netFlow = analysisData.totalPemasukan - analysisData.totalPengeluaran;
  const absorption = analysisData.totalPemasukan > 0 ? (analysisData.totalPengeluaran / analysisData.totalPemasukan) * 100 : 0;

  const periodPicker = (className) => (
    <div className={`flex items-center gap-2 h-11 px-3.5 bg-raised rounded-2xl ${className}`}>
      <Calendar className="w-4 h-4 flex-none text-lime" />
      <select aria-label="Bulan" value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="flex-1 min-w-0 bg-transparent text-sm font-semibold outline-none">
        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <span className="w-px h-4 bg-line" />
      <select aria-label="Tahun" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="bg-transparent text-sm font-semibold outline-none">
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  const walletIcon = (wallet) => {
    const Icon = WALLET_STYLE[wallet].icon;
    return (
      <span className={`w-10 h-10 flex-none rounded-full flex items-center justify-center ${WALLET_STYLE[wallet].tint}`}>
        <Icon className="w-5 h-5" />
      </span>
    );
  };

  const rowActions = (t) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => triggerProtectedAction('edit', t)} aria-label={`Edit ${t.description}`} title="Edit" className="icon-btn !w-10 !h-10 !bg-transparent hover:!bg-raised text-muted hover:text-fg"><Edit2 className="w-4 h-4" /></button>
      <button onClick={() => triggerProtectedAction('delete', t)} aria-label={`Hapus ${t.description}`} title="Hapus" className="icon-btn !w-10 !h-10 !bg-transparent hover:!bg-down/15 text-muted hover:text-down"><Trash2 className="w-4 h-4" /></button>
    </div>
  );

  const receiptButton = (t) => hasReceipt(t) ? (
    <button onClick={() => openReceipt(t)} aria-label={`Lihat kwitansi ${t.description}`} title="Lihat foto kwitansi" className="icon-btn !w-10 !h-10 !bg-lime/10 text-lime hover:!bg-lime/20">
      <ImageIcon className="w-4 h-4" />
    </button>
  ) : null;

  return (
    <div className="min-h-screen pb-28 md:pb-12">
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleScanReceipt} className="hidden" />

      <header className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-5 md:pt-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 md:w-[300px]">
            {brandMark()}
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">Halo, Admin!</h1>
              <p className="text-xs text-muted truncate">Petty Cash ULP Agats</p>
            </div>
          </div>

          <Segmented label="Menu utama" className="hidden md:flex flex-none" value={mainMenu} onChange={setMainMenu} options={NAV_ITEMS} />

          <div className="flex items-center justify-end gap-2 md:w-[300px]">
            {periodPicker('hidden md:flex')}
            <button onClick={handleLogout} className="icon-btn hover:!text-down" aria-label="Keluar dari akun" title="Keluar dari akun"><LogOut className="w-[18px] h-[18px]" /></button>
          </div>
        </div>
        {periodPicker('md:hidden mt-4')}
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-5 md:mt-7">

        {mainMenu === 'input' && (
          <div className="enter grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-5 items-start">
            <div className="space-y-4 min-w-0 lg:sticky lg:top-6">
              <section aria-label="Total saldo" className="card-hero p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-fg/75">Total saldo</p>
                  <button onClick={() => setHideBalance(!hideBalance)} aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'} className="w-9 h-9 -mr-1.5 flex items-center justify-center text-fg/70 hover:text-fg">
                    {hideBalance ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                <p className="tabular mt-1 text-[34px] sm:text-[38px] leading-tight font-bold tracking-tight">{money(balances.Total)}</p>
                <p className="mt-1 text-xs text-fg/65">Sampai akhir {monthLabel} {filterYear}</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-fg/70"><ArrowDownLeft className="w-3.5 h-3.5 text-up" /> Masuk bulan ini</p>
                    <p className="tabular mt-1 text-sm font-bold truncate">{money(periodData.summary.pemasukan)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-fg/70"><ArrowUpRight className="w-3.5 h-3.5 text-down" /> Keluar bulan ini</p>
                    <p className="tabular mt-1 text-sm font-bold truncate">{money(periodData.summary.pengeluaran)}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-px rounded-2xl overflow-hidden">
                  {[
                    { label: 'Keluar', icon: ArrowUpRight, onClick: () => startEntry('Pengeluaran') },
                    { label: 'Masuk', icon: ArrowDownLeft, onClick: () => startEntry('Pemasukan') },
                    { label: 'Foto', icon: Camera, onClick: startScan },
                    { label: 'Jurnal', icon: FileText, onClick: () => setMainMenu('journal') }
                  ].map(action => (
                    <button key={action.label} onClick={action.onClick} className="flex flex-col items-center justify-center gap-1.5 h-[68px] bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold transition-colors">
                      <action.icon className="w-[18px] h-[18px] text-lime" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>

              <section aria-label="Dompet" className="flex lg:flex-col gap-2.5 overflow-x-auto hide-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
                {WALLETS.map(wallet => (
                  <button key={wallet} onClick={() => openWallet(wallet)} title={`Buka jurnal ${walletName(wallet)}`} className="card flex-none w-[210px] sm:w-auto sm:flex-1 lg:w-full snap-start flex items-center gap-3 p-3.5 text-left hover:bg-raised transition-colors !rounded-[20px]">
                    {walletIcon(wallet)}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{walletName(wallet)}</span>
                      <span className="block text-[11px] font-medium text-muted truncate">{WALLET_STYLE[wallet].pic}</span>
                      <span className={`tabular block mt-0.5 text-sm font-bold truncate ${balances[wallet] < 0 && !hideBalance ? 'text-down' : ''}`}>{money(balances[wallet])}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 flex-none text-faint hidden lg:block" />
                  </button>
                ))}
              </section>
            </div>

            <section className="card p-5 sm:p-7 min-w-0">
              <h2 className="text-lg font-bold">Catat transaksi</h2>
              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <Segmented label="Jenis transaksi" value={form.type} onChange={startEntry} options={[{ value: 'Pengeluaran', label: 'Pengeluaran' }, { value: 'Pemasukan', label: 'Pemasukan' }]} />

                <div>
                  <label htmlFor="amount" className="block text-xs font-semibold text-muted mb-2">Nominal</label>
                  <div className="flex items-baseline gap-2 px-4 py-3 bg-raised rounded-2xl border border-transparent focus-within:border-lime transition-colors">
                    <span className="text-xl font-bold text-faint">Rp</span>
                    <MoneyInput id="amount" required placeholder="0" value={form.amount} onChange={amount => setForm({ ...form, amount })} className="tabular w-full min-w-0 bg-transparent text-[28px] font-bold tracking-tight outline-none placeholder:text-faint" />
                  </div>
                </div>

                <Field label="Uraian / keterangan" htmlFor="description">
                  <input id="description" type="text" required placeholder="Contoh: Beli token listrik prabayar" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Tanggal" htmlFor="date">
                    <input id="date" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
                  </Field>
                  {form.type === 'Pengeluaran' && (
                    <Field label="Kriteria pengeluaran" htmlFor="criteria">
                      <select id="criteria" value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} className="input">
                        {CRITERIA_LIST.filter(c => c !== "Pemasukan Kas").map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted mb-2">Petugas</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(PETUGAS_MAP).map(petugas => (
                      <button key={petugas} type="button" aria-pressed={form.petugas === petugas} onClick={() => handlePetugasChange(petugas)} className={`min-h-11 px-5 rounded-full text-sm font-semibold border transition-colors ${form.petugas === petugas ? 'bg-lime/15 border-lime text-lime' : 'border-line text-muted hover:text-fg hover:border-white/20'}`}>{petugas}</button>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs text-muted flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Dicatat ke dompet <span className="font-semibold text-fg">{walletName(form.wallet)}</span></p>
                </div>

                {form.type === 'Pengeluaran' && (form.receiptBase64 ? (
                  <div className="flex items-center gap-3 p-3 bg-raised rounded-2xl">
                    <img src={form.receiptBase64} alt="Foto kwitansi terlampir" className="w-14 h-14 flex-none rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Kwitansi terlampir</p>
                      <p className="mt-0.5 text-xs text-muted">Ikut tersimpan bersama transaksi.</p>
                    </div>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, receiptBase64: null }))} aria-label="Hapus foto kwitansi" className="icon-btn !bg-transparent hover:!bg-down/15 hover:text-down"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="w-full min-h-[60px] flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/20 text-sm font-semibold text-muted hover:text-fg hover:border-lime transition-colors disabled:opacity-60">
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-lime" />}
                    {isScanning ? 'Memproses foto...' : 'Foto kwitansi'}
                  </button>
                ))}

                <button type="submit" disabled={isLoading || isScanning} className="btn-primary w-full">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {isLoading ? 'Menyimpan...' : 'Simpan transaksi'}
                </button>
              </form>
            </section>
          </div>
        )}

        {mainMenu === 'journal' && (
          <section className="enter space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {WALLETS.map(wallet => {
                const active = activeTab === wallet;
                return (
                  <button key={wallet} aria-pressed={active} onClick={() => setActiveTab(wallet)} className={`min-w-0 text-left rounded-[20px] p-3 sm:p-4 border transition-colors ${active ? 'bg-lime border-lime text-ink' : 'bg-surface border-line hover:bg-raised'}`}>
                    <span className={`block text-xs font-semibold truncate ${active ? 'text-ink/70' : 'text-muted'}`}>{walletName(wallet)}</span>
                    <span className={`tabular block mt-1 text-[13px] sm:text-xl font-bold tracking-tight truncate ${!active && balances[wallet] < 0 ? 'text-down' : ''}`}>{formatRp(balances[wallet])}</span>
                  </button>
                );
              })}
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Buku jurnal {walletName(activeTab)}</h2>
                  <p className="mt-0.5 text-xs text-muted">{monthLabel} {filterYear} · {processedJournalData.totalItems} transaksi</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 lg:w-64 lg:flex-none">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input type="text" aria-label="Cari transaksi" placeholder="Cari transaksi" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input !min-h-11 !py-2 !pl-10" />
                  </div>
                  <button onClick={handleExportExcel} className="icon-btn" title="Ekspor ke Excel" aria-label="Ekspor ke Excel"><Download className="w-[18px] h-[18px]" /></button>
                  <button onClick={handleExportPDF} className="icon-btn" title="Cetak" aria-label="Cetak"><Printer className="w-[18px] h-[18px]" /></button>
                  <button onClick={fetchTransactions} className="icon-btn" title="Muat ulang" aria-label="Muat ulang"><RefreshCw className={`w-[18px] h-[18px] ${isLoading ? 'animate-spin' : ''}`} /></button>
                </div>
              </div>

              {isLoading && transactions.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-lime" /> Memuat data...</div>
              ) : journalRows.length === 0 ? (
                <div className="py-20 px-4 text-center">
                  <FileText className="w-8 h-8 mx-auto text-faint" />
                  <p className="mt-3 text-sm font-medium text-muted">{searchQuery ? 'Tidak ada hasil pencarian.' : `Belum ada transaksi ${walletName(activeTab)} di ${monthLabel} ${filterYear}.`}</p>
                </div>
              ) : (
                <>
                  {/* Tabel untuk layar lebar */}
                  <div className="hidden md:block">
                    <table className="w-full table-fixed text-sm text-left">
                      <thead className="text-xs font-semibold text-muted">
                        <tr className="border-y border-line">
                          <th scope="col" className="pl-5 pr-3 py-3 font-semibold w-[116px]">Tanggal</th>
                          <th scope="col" className="px-3 py-3 font-semibold">Uraian</th>
                          <th scope="col" className="px-3 py-3 font-semibold text-right w-[132px]">Pemasukan</th>
                          <th scope="col" className="px-3 py-3 font-semibold text-right w-[132px]">Pengeluaran</th>
                          <th scope="col" className="px-3 py-3 font-semibold text-right w-[140px]">Saldo</th>
                          <th scope="col" className="pl-3 pr-4 py-3 font-semibold w-[148px]"><span className="sr-only">Aksi</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {journalRows.map(t => {
                          const isPemasukan = t.type === 'Pemasukan';
                          return (
                            <tr key={t.id} className="hover:bg-white/[0.025] transition-colors">
                              <td className="pl-5 pr-3 py-3.5 text-muted whitespace-nowrap">{shortDate(t.date)}</td>
                              <td className="px-3 py-3.5 min-w-0">
                                <p className="font-semibold truncate" title={t.description}>{t.description}</p>
                                {t.criteria && t.criteria !== 'Pemasukan Kas' && <p className="mt-0.5 text-xs text-muted truncate" title={t.criteria}>{t.criteria}</p>}
                              </td>
                              <td className="tabular px-3 py-3.5 text-right font-semibold text-up">{isPemasukan ? formatRp(t.amount) : <span className="text-faint">-</span>}</td>
                              <td className="tabular px-3 py-3.5 text-right font-semibold text-down">{!isPemasukan ? formatRp(t.amount) : <span className="text-faint">-</span>}</td>
                              <td className={`tabular px-3 py-3.5 text-right font-bold ${t.runBal < 0 ? 'text-down' : ''}`}>{formatRp(t.runBal)}</td>
                              <td className="pl-3 pr-4 py-2">
                                <div className="flex items-center justify-end gap-1.5">{receiptButton(t)}{rowActions(t)}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Daftar untuk ponsel */}
                  <ul className="md:hidden divide-y divide-line border-t border-line">
                    {journalRows.map(t => {
                      const isPemasukan = t.type === 'Pemasukan';
                      return (
                        <li key={t.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold break-words">{t.description}</p>
                              <p className="mt-1 text-xs text-muted">{shortDate(t.date)}{t.criteria && t.criteria !== 'Pemasukan Kas' ? ` · ${t.criteria}` : ''}</p>
                            </div>
                            <p className={`tabular flex-none text-sm font-bold ${isPemasukan ? 'text-up' : 'text-down'}`}>{isPemasukan ? '+' : '−'}{formatRp(t.amount)}</p>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">Saldo <span className={`tabular font-semibold ${t.runBal < 0 ? 'text-down' : 'text-fg'}`}>{formatRp(t.runBal)}</span></p>
                            <div className="flex items-center gap-1 -mr-2">{receiptButton(t)}{rowActions(t)}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              <div className="p-4 sm:px-5 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
                <a href="https://drive.google.com/drive/folders/1HGEo0hp1Dv63K20Wudu_BFbn_A7zq_aa?usp=drive_link" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-10 font-semibold hover:text-lime transition-colors">
                  <LinkIcon className="w-3.5 h-3.5" /> Folder kwitansi (Google Drive)
                </a>
                {processedJournalData.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Halaman sebelumnya" className="icon-btn disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="tabular px-2 font-semibold text-fg">{currentPage} / {processedJournalData.totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(processedJournalData.totalPages, p + 1))} disabled={currentPage === processedJournalData.totalPages} aria-label="Halaman berikutnya" className="icon-btn disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {mainMenu === 'analysis' && (
          <section className="enter space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Pemasukan" value={formatRp(analysisData.totalPemasukan)} icon={ArrowDownLeft} tone="text-up" hint={`${monthLabel} ${filterYear}`} />
              <StatTile label="Pengeluaran" value={formatRp(analysisData.totalPengeluaran)} icon={ArrowUpRight} tone="text-down" hint={`${monthLabel} ${filterYear}`} />
              <StatTile label="Selisih" value={formatRp(netFlow)} icon={Wallet} tone="text-lime" hint={netFlow >= 0 ? 'Surplus' : 'Defisit'} />
              <StatTile label="Serapan dana" value={`${absorption.toFixed(1)}%`} icon={Percent} tone="text-lime" hint="Dari pemasukan" />
            </div>

            <div className="card p-5 sm:p-6">
              <h3 className="text-base font-bold">Pengeluaran per bulan</h3>
              <p className="mt-0.5 mb-4 text-xs text-muted">Tahun {filterYear}, semua dompet</p>
              <MonthlyTrend data={monthlyTrend} selectedIndex={filterMonth - 1} formatValue={formatRp} seriesLabel="pengeluaran" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div className="space-y-4 min-w-0">
                <div className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h3 className="text-base font-bold">Rincian per dompet</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-muted">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-lime" /> Masuk</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-down" /> Keluar</span>
                    </div>
                  </div>
                  <div className="mt-5 space-y-5">
                    {WALLETS.map(wallet => {
                      const inflow = periodData.summary.wallets[wallet].pemasukan;
                      const outflow = periodData.summary.wallets[wallet].pengeluaran;
                      const max = Math.max(inflow, outflow) || 1;
                      return (
                        <div key={wallet}>
                          <div className="flex items-center gap-2.5">{walletIcon(wallet)}<p className="text-sm font-semibold">{walletName(wallet)}</p></div>
                          <div className="mt-3 space-y-2">
                            {[{ label: 'Masuk', value: inflow, color: 'bg-lime' }, { label: 'Keluar', value: outflow, color: 'bg-down' }].map(bar => (
                              <div key={bar.label} className="flex items-center gap-3" title={`${walletName(wallet)}, ${bar.label}: ${formatRp(bar.value)}`}>
                                <div className="flex-1 h-2 rounded-full bg-raised overflow-hidden">
                                  <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${(bar.value / max) * 100}%` }} />
                                </div>
                                <span className="tabular w-28 flex-none text-right text-xs font-semibold">{formatRp(bar.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card p-5 sm:p-6">
                  <h3 className="text-base font-bold flex items-center gap-2"><Lightbulb className="w-[18px] h-[18px] text-lime" /> Evaluasi {monthLabel}</h3>
                  {periodData.filteredJournal.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">Belum ada data untuk dievaluasi pada periode ini.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-line text-sm">
                      <li className="py-3 first:pt-0 flex items-start justify-between gap-4">
                        <span className="text-muted">Status keuangan</span>
                        <span className={`flex-none px-2.5 py-1 rounded-full text-xs font-bold ${netFlow >= 0 ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>{netFlow >= 0 ? 'Surplus (aman)' : 'Defisit (perhatian)'}</span>
                      </li>
                      <li className="py-3 flex items-start justify-between gap-4">
                        <span className="text-muted">Pengeluaran dompet tertinggi</span>
                        <span className="text-right font-semibold">{walletName(analysisData.dompetTerboros)}<span className="tabular block text-xs font-medium text-muted">{formatRp(periodData.summary.wallets[analysisData.dompetTerboros]?.pengeluaran || 0)}</span></span>
                      </li>
                      {analysisData.topKriteria && (
                        <li className="py-3 last:pb-0 flex items-start justify-between gap-4">
                          <span className="flex-none text-muted">Beban terbesar</span>
                          <span className="text-right font-semibold">{analysisData.topKriteria.name}<span className="tabular block text-xs font-medium text-muted">{analysisData.topKriteria.percentage.toFixed(1)}% dari pengeluaran</span></span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className="card p-5 sm:p-6 min-w-0">
                <h3 className="text-base font-bold">Pengeluaran per kriteria</h3>
                <p className="mt-0.5 text-xs text-muted">{monthLabel} {filterYear}</p>
                {analysisData.kriteriaList.length === 0 ? (
                  <div className="mt-5 py-12 text-center text-sm text-muted rounded-2xl border border-dashed border-line">Belum ada pengeluaran di bulan ini.</div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {analysisData.kriteriaList.map(item => (
                      <div key={item.name} title={`${item.name}: ${formatRp(item.amount)}, ${item.percentage.toFixed(1)}%`}>
                        <p className="text-xs font-medium text-muted">{item.name}</p>
                        <div className="mt-1.5 flex items-baseline justify-between gap-3">
                          <span className="tabular text-sm font-bold">{formatRp(item.amount)}</span>
                          <span className="tabular text-xs font-semibold text-muted">{item.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-raised overflow-hidden">
                          <div className="h-full rounded-full bg-lime" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Navigasi bawah untuk ponsel */}
      <nav aria-label="Menu utama" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line pb-safe">
        <div className="flex">
          {NAV_ITEMS.map(item => {
            const active = mainMenu === item.value;
            return (
              <button key={item.value} aria-current={active ? 'page' : undefined} onClick={() => setMainMenu(item.value)} className={`relative flex-1 h-[66px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? 'text-lime' : 'text-faint'}`}>
                {active && <span className="absolute top-0 inset-x-6 h-[3px] rounded-b-full bg-lime" />}
                <item.icon className="w-[22px] h-[22px]" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notifikasi */}
      <div role="status" className={`fixed top-4 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-8 sm:translate-y-8 opacity-0 pointer-events-none'} z-[80]`}>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-raised border border-line shadow-2xl">
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 flex-none text-up" /> : <AlertCircle className="w-5 h-5 flex-none text-down" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      </div>

      {authModal.show && (
        <Modal title="Otorisasi diperlukan" size="max-w-sm" onClose={() => setAuthModal({ show: false, pendingAction: null, data: null, id: null, password: '', error: '' })}>
          <div className="w-12 h-12 rounded-2xl bg-lime/15 text-lime flex items-center justify-center"><KeyRound className="w-6 h-6" /></div>
          <p className="mt-4 text-sm text-muted">Masukkan password akun Anda untuk mengubah data.</p>
          <form onSubmit={handleAuthSubmit} className="mt-4">
            <input type="password" autoFocus aria-label="Password" placeholder="••••••••" value={authModal.password} onChange={e => setAuthModal({ ...authModal, password: e.target.value, error: '' })} className="input" />
            {authModal.error && <p role="alert" className="mt-2 text-xs font-semibold text-down">{authModal.error}</p>}
            <button type="submit" className="btn-primary w-full mt-5">Buka kunci</button>
          </form>
        </Modal>
      )}

      {deleteModal.show && (
        <Modal title="Hapus transaksi?" size="max-w-sm" onClose={() => setDeleteModal({ show: false, id: null })}>
          <div className="w-12 h-12 rounded-2xl bg-down/15 text-down flex items-center justify-center"><AlertCircle className="w-6 h-6" /></div>
          <p className="mt-4 text-sm text-muted">Tindakan ini permanen dan akan memengaruhi saldo dompet.</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button onClick={() => setDeleteModal({ show: false, id: null })} className="btn-quiet">Batal</button>
            <button onClick={confirmDelete} className="min-h-12 rounded-[14px] bg-down text-ink text-sm font-bold hover:opacity-90 transition-opacity">Ya, hapus</button>
          </div>
        </Modal>
      )}

      {editModal.show && editModal.data && (
        <Modal title="Edit transaksi" size="max-w-lg" onClose={() => setEditModal({ show: false, data: null })}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" htmlFor="edit-date"><input id="edit-date" type="date" required value={editModal.data.date.split('T')[0]} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, date: e.target.value } })} className="input" /></Field>
              <Field label="Jenis" htmlFor="edit-type">
                <select id="edit-type" value={editModal.data.type} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, type: e.target.value } })} className="input">
                  <option value="Pengeluaran">Pengeluaran</option><option value="Pemasukan">Pemasukan</option>
                </select>
              </Field>
            </div>
            <Field label="Dompet" htmlFor="edit-wallet">
              <select id="edit-wallet" value={editModal.data.wallet} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, wallet: e.target.value } })} className="input">
                {WALLETS.map(w => <option key={w} value={w}>{walletName(w)}</option>)}
              </select>
            </Field>
            {editModal.data.type === 'Pengeluaran' && (
              <Field label="Kriteria" htmlFor="edit-criteria">
                <select id="edit-criteria" value={editModal.data.criteria} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, criteria: e.target.value } })} className="input">
                  {CRITERIA_LIST.filter(c => c !== "Pemasukan Kas").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            )}
            <Field label="Uraian / keterangan" htmlFor="edit-description"><input id="edit-description" type="text" required value={editModal.data.description} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })} className="input" /></Field>
            <Field label="Nominal (Rp)" htmlFor="edit-amount"><MoneyInput id="edit-amount" required value={editModal.data.amount} onChange={amount => setEditModal({ ...editModal, data: { ...editModal.data, amount } })} className="input tabular !text-base font-bold" /></Field>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button type="button" onClick={() => setEditModal({ show: false, data: null })} className="btn-quiet">Batal</button>
              <button type="submit" disabled={isLoading} className="btn-primary !min-h-12 !text-sm">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {receiptPreview.show && (
        <Modal title="Foto kwitansi" size="max-w-3xl" zIndex="z-[70]" onClose={() => setReceiptPreview({ show: false, dataUrl: null })}>
          {receiptPreview.dataUrl?.startsWith('http') && (
            <a href={receiptPreview.dataUrl} target="_blank" rel="noreferrer" className="mb-3 inline-flex items-center gap-1.5 min-h-10 text-xs font-semibold text-lime"><LinkIcon className="w-3.5 h-3.5" /> Buka di tab baru</a>
          )}
          <div className="flex justify-center rounded-2xl bg-raised p-3">
            <img src={receiptPreview.dataUrl} alt="Bukti kwitansi" className="max-w-full max-h-[68vh] object-contain rounded-xl" />
          </div>
        </Modal>
      )}
    </div>
  );
}
