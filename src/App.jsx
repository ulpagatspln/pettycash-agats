import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, PlusCircle, CheckCircle, AlertCircle,
  Edit2, Trash2, X, Loader2, RefreshCw, FileText, Calendar,
  TrendingUp, TrendingDown,
  Search, ChevronLeft, ChevronRight, Lock, KeyRound, User,
  Camera, Image as ImageIcon, Link as LinkIcon,
  PieChart, BarChart2, Lightbulb,
  Download, Printer, LogOut, Eye, EyeOff, ShieldCheck
} from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnH52D3refqCMgu0gWnGeHej1QnR5bOnGEKYpu7ChRZTwy7qPKNPqRT4C-TaXL8XSr/exec';
const IMGBB_API_KEY = '5b61e2501a3eb730c451da7eb318a032';

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

const PETUGAS_MAP = { 'Ade': 'Cash Card', 'Satria': 'Taktis', 'Herry': 'Lisdes' };
const WALLETS = ['Ade / Cash Card', 'Satria / Taktis', 'Herry / Lisdes'];

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

  useEffect(() => {
    if (isLoggedIn) fetchTransactions();
  }, [isLoggedIn]);

  useEffect(() => { setCurrentPage(1); }, [filterMonth, filterYear, activeTab, searchQuery]);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    // Simulasi loading sebentar agar terasa profesional
    setTimeout(() => {
      if (loginData.username === 'admin' && loginData.password === 'admin') {
        setIsLoggedIn(true);
      } else {
        setLoginError('Username atau password salah.');
      }
      setIsLoggingIn(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginData({ username: '', password: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Network error");
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid format"); }

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

  const handleAction = async (action, data, successMessage) => {
    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        showToast(successMessage, "success");
        await fetchTransactions();
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Gagal ${action}:`, error);
      showToast(`Gagal: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; const MAX_HEIGHT = 1000;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
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

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authModal.password === 'Agats@123') {
      setIsAuthorized(true);
      const { pendingAction, data, id } = authModal;
      setAuthModal({ show: false, pendingAction: null, data: null, id: null, password: '', error: '' });
      if (pendingAction === 'edit') setEditModal({ show: true, data });
      if (pendingAction === 'delete') setDeleteModal({ show: true, id });
      showToast("Akses diizinkan!", "success");
    } else {
      setAuthModal(prev => ({ ...prev, error: 'Password salah!' }));
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
      setIsLoading(true);
      let uploadedImageUrl = '';

      if (form.receiptBase64) {
        showToast("Mengunggah kwitansi ke server...", "success");
        try {
          const b64Data = form.receiptBase64.split(',')[1];
          const formData = new FormData();
          formData.append('image', b64Data);

          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          if (data.success) {
            uploadedImageUrl = data.data.url;
          } else {
            showToast("Gagal unggah foto. Data disimpan tanpa foto.", "error");
          }
        } catch (error) {
          console.error("Upload Error:", error);
          showToast("Gagal unggah foto.", "error");
        }
      }

      const newTransaction = {
        ...form,
        id: Date.now().toString(),
        amount: parseFloat(form.amount),
        criteria: form.type === 'Pemasukan' ? 'Pemasukan Kas' : form.criteria,
        timestamp: new Date().toISOString(),
        receiptUrl: uploadedImageUrl
      };

      delete newTransaction.receiptBase64;

      await handleAction('add', newTransaction, "Transaksi berhasil disimpan!");
      setForm(prev => ({ ...INITIAL_FORM_STATE, petugas: prev.petugas, wallet: prev.wallet }));
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
    link.setAttribute("download", `Jurnal_${activeTab}_${monthLabel}_${filterYear}.csv`);
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
          <title>Jurnal ${activeTab} - ${monthLabel} ${filterYear}</title>
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
          <div class="header"><h1>Buku Jurnal Kas Kecil - ${activeTab}</h1><p>Periode: ${monthLabel} ${filterYear}</p></div>
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-teal-50 p-8 text-center border-b border-teal-100">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-600/30">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-teal-900">Petty Cash ULP</h1>
            <p className="text-teal-600 text-sm mt-1 font-medium">Sistem Pengelolaan Kas Kecil Agats</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                  placeholder="Masukkan username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span className="font-medium">{loginError}</span>
              </div>
            )}

            <button type="submit" disabled={isLoggingIn} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk Sistem'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 md:pb-10">
      {/* Header Utama */}
      <header className="bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <Wallet className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Petty Cash Agats</h1>
                <p className="text-teal-100 text-xs sm:text-sm mt-0.5">Sistem Manajemen Kas ULP</p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex-1 sm:flex-none justify-center">
                <Calendar className="w-4 h-4 text-teal-300" />
                <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="bg-transparent text-white border-none outline-none text-sm font-semibold cursor-pointer appearance-none">
                  {months.map(m => <option key={m.value} value={m.value} className="text-slate-800">{m.label}</option>)}
                </select>
                <span className="text-teal-500/50">|</span>
                <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="bg-transparent text-white border-none outline-none text-sm font-semibold cursor-pointer appearance-none">
                  {years.map(y => <option key={y} value={y} className="text-slate-800">{y}</option>)}
                </select>
              </div>
              <button onClick={handleLogout} className="p-2.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 rounded-xl border border-rose-500/30 transition-colors" title="Keluar">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards Saldo (Scrollable on Mobile) */}
          <div className="flex overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory hide-scrollbar gap-4">
            <div className="min-w-[240px] sm:min-w-0 sm:flex-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 shadow-lg border border-orange-300/30 snap-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-orange-50 text-sm font-medium">Total Keseluruhan</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">{formatRp(balances.Total)}</p>
              <div className="mt-4 flex gap-4 text-xs font-semibold text-orange-50 bg-black/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-300" /> {formatRp(periodData.summary.pemasukan)}</span>
                <span className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-rose-300" /> {formatRp(periodData.summary.pengeluaran)}</span>
              </div>
            </div>
            {WALLETS.map(wallet => (
              <div key={wallet} className="min-w-[200px] sm:min-w-0 sm:flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 snap-center">
                <p className="text-teal-100 text-sm font-medium">{wallet}</p>
                <p className="text-xl font-bold text-white mt-1">{formatRp(balances[wallet])}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-teal-100/90">
                  <span className="flex items-center justify-between bg-black/10 px-2 py-1 rounded"><span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> In</span> <span>{formatRp(periodData.summary.wallets[wallet]?.pemasukan || 0)}</span></span>
                  <span className="flex items-center justify-between bg-black/10 px-2 py-1 rounded"><span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-rose-400" /> Out</span> <span>{formatRp(periodData.summary.wallets[wallet]?.pengeluaran || 0)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Navigation (Desktop) */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 mt-8">
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 max-w-xl">
          {[
            { id: 'input', icon: PlusCircle, label: 'Input Transaksi' },
            { id: 'journal', icon: FileText, label: 'Buku Jurnal' },
            { id: 'analysis', icon: PieChart, label: 'Analisa' }
          ].map(item => (
            <button key={item.id} onClick={() => setMainMenu(item.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${mainMenu === item.id ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 md:mt-8">

        { }
        {mainMenu === 'input' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <PlusCircle className="w-5 h-5 text-teal-600" /> Catat Transaksi Baru
              </h2>
              {form.type === 'Pengeluaran' && (
                <div>
                  <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleScanReceipt} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all disabled:opacity-70 active:scale-95">
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isScanning ? 'Memproses...' : 'Scan Kwitansi'}</span>
                    <span className="sm:hidden">{isScanning ? 'Proses...' : 'Scan'}</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
              {form.receiptBase64 && (
                <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden flex-shrink-0">
                    <img src={form.receiptBase64} alt="Kwitansi" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900">Kwitansi Terlampir</p>
                    <p className="text-xs text-blue-600/80 mt-0.5">Siap diunggah ke cloud.</p>
                  </div>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, receiptBase64: null }))} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Transaksi</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button type="button" onClick={() => setForm({ ...form, type: 'Pengeluaran' })} className={`flex-1 py-2 px-3 text-sm rounded-lg font-bold transition-all ${form.type === 'Pengeluaran' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pengeluaran</button>
                    <button type="button" onClick={() => { setForm({ ...form, type: 'Pemasukan', receiptBase64: null }); }} className={`flex-1 py-2 px-3 text-sm rounded-lg font-bold transition-all ${form.type === 'Pemasukan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pemasukan</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5"><User className="w-4 h-4 text-teal-600" /> Petugas</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(PETUGAS_MAP).map(petugas => (
                      <button key={petugas} type="button" onClick={() => handlePetugasChange(petugas)} className={`px-4 py-2 text-sm rounded-xl font-semibold transition-all border ${form.petugas === petugas ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>{petugas}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-teal-600" /> Dompet Terpilih</label>
                  <input type="text" readOnly value={form.wallet} className="w-full p-3 bg-slate-200/50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-not-allowed" />
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">*Dompet menyesuaikan nama petugas.</p>
                </div>
              </div>

              {form.type === 'Pengeluaran' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kriteria Pengeluaran</label>
                  <select value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all">
                    {CRITERIA_LIST.filter(c => c !== "Pemasukan Kas").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Uraian / Keterangan</label>
                <input type="text" required placeholder="Contoh: Beli token listrik prabayar..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                  <input type="number" required min="0" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all font-bold text-slate-800" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isLoading || isScanning} className="w-full py-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-bold shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                  {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        )}

        { }
        {mainMenu === 'journal' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto hide-scrollbar px-2 sm:px-0">
              {WALLETS.map(wallet => (
                <button key={wallet} onClick={() => setActiveTab(wallet)} className={`px-6 py-3.5 font-bold text-sm whitespace-nowrap transition-all relative rounded-t-2xl ${activeTab === wallet ? 'text-teal-700 bg-white border-t-2 border-x border-teal-500 shadow-sm' : 'text-slate-500 hover:text-teal-600 hover:bg-slate-200/50'}`}>
                  {wallet}
                  {activeTab === wallet && <div className="absolute -bottom-px left-0 w-full h-1 bg-white"></div>}
                </button>
              ))}
            </div>

            <div className="bg-white sm:rounded-b-3xl sm:rounded-tr-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-teal-600" /> Buku Jurnal Kas
                  </h2>
                  <a href="https://drive.google.com/drive/folders/1HGEo0hp1Dv63K20Wudu_BFbn_A7zq_aa?usp=drive_link" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mt-2 font-semibold bg-blue-50 px-2.5 py-1 rounded-md transition-colors border border-blue-100">
                    <LinkIcon className="w-3.5 h-3.5" /> Buka Folder Kwitansi (G-Drive)
                  </a>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                  <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={handleExportExcel} className="p-2 sm:px-3 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5" title="Export CSV">
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Excel</span>
                    </button>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <button onClick={handleExportPDF} className="p-2 sm:px-3 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5" title="Cetak PDF">
                      <Printer className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-bold">Cetak</span>
                    </button>
                  </div>

                  <div className="relative flex-1 md:w-56">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari transaksi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm" />
                  </div>

                  <button onClick={fetchTransactions} className="p-2.5 text-slate-600 hover:text-teal-700 bg-white border border-slate-200 rounded-xl shadow-sm transition-colors hover:bg-slate-50 flex-shrink-0" title="Muat ulang">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-5 py-4 w-28">Tanggal</th>
                      <th className="px-5 py-4">Uraian / Keterangan</th>
                      <th className="px-5 py-4 text-center w-24">Bukti</th>
                      <th className="px-5 py-4 text-right w-36">Pemasukan</th>
                      <th className="px-5 py-4 text-right w-36">Pengeluaran</th>
                      <th className="px-5 py-4 text-right w-44 bg-teal-50/50 text-teal-900 border-l border-teal-100">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading && transactions.length === 0 ? (
                      <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-500 font-medium"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" /> Memuat data...</td></tr>
                    ) : processedJournalData.data.length === 0 ? (
                      <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-500 font-medium bg-slate-50/50">{searchQuery ? 'Tidak ada hasil pencarian.' : `Belum ada transaksi di dompet ${activeTab}.`}</td></tr>
                    ) : (
                      processedJournalData.data.map((t) => {
                        const tDate = new Date(t.date);
                        const previousData = periodData.allDataUpToPeriod.filter(pt => pt.wallet === t.wallet && (new Date(pt.date) < tDate || (new Date(pt.date).getTime() === tDate.getTime() && pt.id <= t.id)));
                        let runBal = 0;
                        previousData.forEach(pt => { if (pt.type === 'Pemasukan') runBal += pt.amount; else runBal -= pt.amount; });
                        const isPemasukan = t.type === 'Pemasukan';

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group relative">
                            <td className="px-5 py-4 text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{t.description}</p>
                              {t.criteria && t.criteria !== 'Pemasukan Kas' && (
                                <span className="inline-block mt-1.5 text-[10px] font-semibold bg-slate-200/60 text-slate-600 px-2.5 py-1 rounded-md border border-slate-300/50">{t.criteria}</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {t.receiptUrl && typeof t.receiptUrl === 'string' && t.receiptUrl.startsWith('http') ? (
                                <button
                                  onClick={() => setReceiptPreview({ show: true, dataUrl: t.receiptUrl })}
                                  className="inline-flex p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700 rounded-xl border border-teal-200 transition-colors shadow-sm active:scale-95"
                                  title="Lihat Foto Kwitansi">
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 font-bold">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-emerald-600 font-bold bg-emerald-50/10">{isPemasukan ? formatRp(t.amount) : '-'}</td>
                            <td className="px-5 py-4 text-right text-rose-600 font-bold bg-rose-50/10">{!isPemasukan ? formatRp(t.amount) : '-'}</td>
                            <td className="px-5 py-4 text-right font-black text-teal-900 bg-teal-50/40 border-l border-teal-50">
                              {formatRp(runBal)}
                              {/* Action Buttons (visible on hover desktop, always visible mobile) */}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-1.5 bg-white shadow-md border border-slate-200 rounded-lg p-1.5 z-10">
                                {!isAuthorized && <Lock className="w-3.5 h-3.5 absolute -top-1.5 -right-1.5 text-slate-400 bg-white rounded-full ring-2 ring-white" />}
                                <button onClick={() => triggerProtectedAction('edit', t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => triggerProtectedAction('delete', t)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {processedJournalData.totalPages > 1 && (
                <div className="p-4 sm:p-5 border-t bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500 font-medium">Menampilkan <span className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, processedJournalData.totalItems)}</span> dari <span className="font-bold text-slate-800">{processedJournalData.totalItems}</span></span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm">{currentPage} / {processedJournalData.totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(processedJournalData.totalPages, p + 1))} disabled={currentPage === processedJournalData.totalPages} className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        { }
        {mainMenu === 'analysis' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">

                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-teal-600" /> Arus Kas & Dompet</h3>
                  <div className="space-y-8">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Total Keseluruhan</p>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="w-24 text-xs font-bold text-slate-600">Pemasukan</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div className="bg-gradient-to-r from-teal-400 to-teal-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, analysisData.totalPemasukan / (Math.max(analysisData.totalPemasukan, analysisData.totalPengeluaran) || 1) * 100)}%` }}></div>
                          </div>
                          <span className="w-24 text-sm font-black text-teal-700 text-right">{formatRp(analysisData.totalPemasukan)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="w-24 text-xs font-bold text-slate-600">Pengeluaran</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, analysisData.totalPengeluaran / (Math.max(analysisData.totalPemasukan, analysisData.totalPengeluaran) || 1) * 100)}%` }}></div>
                          </div>
                          <span className="w-24 text-sm font-black text-rose-700 text-right">{formatRp(analysisData.totalPengeluaran)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-slate-200"></div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Rincian Per Dompet</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {WALLETS.map(wallet => {
                          const p = periodData.summary.wallets[wallet].pemasukan;
                          const k = periodData.summary.wallets[wallet].pengeluaran;
                          const max = Math.max(p, k) || 1;
                          return (
                            <div key={wallet} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                              <p className="text-sm font-bold text-slate-800 mb-3">{wallet}</p>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="bg-teal-400 h-full rounded-full" style={{ width: `${(p / max) * 100}%` }}></div></div>
                                  <span className="text-[11px] font-bold text-teal-700 w-16 text-right">{formatRp(p)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="bg-rose-400 h-full rounded-full" style={{ width: `${(k / max) * 100}%` }}></div></div>
                                  <span className="text-[11px] font-bold text-rose-700 w-16 text-right">{formatRp(k)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 sm:p-8 rounded-3xl shadow-sm border border-amber-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Lightbulb className="w-24 h-24 text-amber-500" /></div>
                  <h3 className="text-lg font-bold text-amber-900 mb-5 flex items-center gap-2 relative z-10"><Lightbulb className="w-5 h-5 text-amber-600" /> Hasil Evaluasi Bulan Ini</h3>

                  {transactions.length === 0 ? (
                    <p className="text-amber-700 text-sm font-medium relative z-10">Belum ada data untuk dievaluasi pada periode ini.</p>
                  ) : (
                    <ul className="space-y-4 text-sm text-amber-900 relative z-10">
                      <li className="flex gap-3 bg-white/50 p-3 rounded-xl border border-white/50">
                        <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed"><b>Status Keuangan:</b> {analysisData.totalPemasukan >= analysisData.totalPengeluaran ? <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded ml-1">Surplus (Aman)</span> : <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded ml-1">Defisit (Perhatian)</span>}. Serapan dana <b>{analysisData.totalPemasukan > 0 ? ((analysisData.totalPengeluaran / analysisData.totalPemasukan) * 100).toFixed(1) : 0}%</b>.</div>
                      </li>
                      <li className="flex gap-3 bg-white/50 p-3 rounded-xl border border-white/50">
                        <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed"><b>Aktivitas Dompet:</b> Dompet <b>{analysisData.dompetTerboros}</b> mencatat pengeluaran tertinggi <b>({formatRp(periodData.summary.wallets[analysisData.dompetTerboros]?.pengeluaran || 0)})</b>.</div>
                      </li>
                      {analysisData.topKriteria && (
                        <li className="flex gap-3 bg-white/50 p-3 rounded-xl border border-white/50">
                          <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="leading-relaxed"><b>Beban Terbesar:</b> Alokasi tertinggi untuk <b>"{analysisData.topKriteria.name}"</b> (mencakup <b>{analysisData.topKriteria.percentage.toFixed(1)}%</b>).</div>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-teal-600" /> Rekapitulasi Berdasarkan Kriteria</h3>

                {analysisData.kriteriaList.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Belum ada pengeluaran di bulan ini.</div>
                ) : (
                  <div className="space-y-5 pr-2 flex-1">
                    {analysisData.kriteriaList.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-slate-600 truncate pr-2 flex-1 group-hover:text-slate-900 transition-colors" title={item.name}>{item.name}</span>
                          <div className="text-right leading-none">
                            <span className="text-sm font-black text-slate-800">{formatRp(item.amount)}</span>
                            <span className="text-[11px] text-slate-500 ml-2 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${item.percentage}%` }}></div>
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

      { }
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          {[
            { id: 'input', icon: PlusCircle, label: 'Input' },
            { id: 'journal', icon: FileText, label: 'Jurnal' },
            { id: 'analysis', icon: PieChart, label: 'Analisa' }
          ].map(item => (
            <button key={item.id} onClick={() => setMainMenu(item.id)} className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all ${mainMenu === item.id ? 'text-teal-700 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              <item.icon className={`w-6 h-6 ${mainMenu === item.id ? 'fill-teal-50 text-teal-600' : ''}`} />
              <span className={`text-[10px] font-bold ${mainMenu === item.id ? 'text-teal-700' : ''}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      { }
      <div className={`fixed top-4 right-4 sm:top-auto sm:bottom-6 sm:right-6 transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 sm:translate-y-10 opacity-0 pointer-events-none'} z-[70]`}>
        <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      </div>

      {/* Auth Modal */}
      {authModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner border border-amber-200"><KeyRound className="w-8 h-8 text-amber-600" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Otorisasi Diperlukan</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">Masukkan sandi khusus untuk mengubah data.</p>
            <form onSubmit={handleAuthSubmit}>
              <input type="password" autoFocus placeholder="••••••••" value={authModal.password} onChange={e => setAuthModal({ ...authModal, password: e.target.value, error: '' })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-center mb-2 font-bold tracking-widest text-lg" />
              {authModal.error && <p className="text-rose-500 text-xs font-bold mb-4">{authModal.error}</p>}
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setAuthModal({ show: false, pendingAction: null, data: null, id: null, password: '', error: '' })} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-colors">Buka Kunci</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-200"><AlertCircle className="w-8 h-8 text-rose-600" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Transaksi?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Tindakan ini permanen dan akan memengaruhi saldo dompet.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
              <button onClick={confirmDelete} className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.show && editModal.data && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-5 h-5 text-blue-600" /> Edit Transaksi</h3>
              <button onClick={() => setEditModal({ show: false, data: null })} className="p-2 bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal</label><input type="date" required value={editModal.data.date.split('T')[0]} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, date: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis</label>
                  <select value={editModal.data.type} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, type: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Pengeluaran">Pengeluaran</option><option value="Pemasukan">Pemasukan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Dompet</label>
                <select value={editModal.data.wallet} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, wallet: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {WALLETS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              {editModal.data.type === 'Pengeluaran' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kriteria</label>
                  <select value={editModal.data.criteria} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, criteria: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {CRITERIA_LIST.filter(c => c !== "Pemasukan Kas").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5">Uraian / Keterangan</label><input type="text" required value={editModal.data.description} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1.5">Nominal (Rp)</label><input type="number" required min="0" value={editModal.data.amount} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, amount: e.target.value } })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>

              <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setEditModal({ show: false, data: null })} className="px-5 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isLoading} className="px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {receiptPreview.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 z-[70] animate-in fade-in zoom-in-95" onClick={() => setReceiptPreview({ show: false, dataUrl: null })}>
          <div className="relative max-w-3xl w-full flex flex-col bg-slate-100 rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-teal-600" /> Preview Dokumen</h3>
              <div className="flex items-center gap-2">
                <a href={receiptPreview.dataUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Buka di Tab Baru"><LinkIcon className="w-5 h-5" /></a>
                <button onClick={() => setReceiptPreview({ show: false, dataUrl: null })} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="bg-slate-200/50 flex justify-center items-center w-full relative p-4" style={{ height: '70vh' }}>
              <img
                src={receiptPreview.dataUrl}
                alt="Bukti Kwitansi"
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}