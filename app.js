const STORAGE_KEY = 'badminton_gai_cibubur_v1';
const PIN_STORAGE_KEY = 'badminton_gai_pin_v1';
const AUTH_SESSION_KEY = 'badminton_gai_unlocked_v1';

// PIN Standar Bendahara (Bisa diubah langsung di sini sebelum di-upload ke GitHub, atau lewat menu PIN di aplikasi)
const DEFAULT_BENDAHARA_PIN = '20261127';

const QUICK_NOMINALS = [0, 15000, 20000, 25000, 30000];

function getDefaultState() {
  return {
    clubName: 'Klub Badminton GAI Cibubur',
    prevBalance: 406770,
    sessionDate: '2026-11-21',
    reportDate: '2026-11-22',
    closingNote: 'Alhamdulillah...',
    members: [
      { id: 'm1', name: 'Pak Adhi', amount: 20000 },
      { id: 'm2', name: 'Pak Fatta', amount: 15000 },
      { id: 'm3', name: 'Pak Sharif', amount: 15000 },
      { id: 'm4', name: 'Pak Erwin', amount: 25000 },
      { id: 'm5', name: 'Mang Rusdy', amount: 20000 },
      { id: 'm6', name: 'Jangkung', amount: 15000 },
      { id: 'm7', name: 'Pak Romi', amount: 15000 },
      { id: 'm8', name: 'Pak Fauzi', amount: 20000 },
      { id: 'm9', name: 'Tomo', amount: 20000 }
    ],
    expenses: [
      { id: 'e1', name: 'Kok prowan 1 slop', amount: 125000 }
    ]
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return { ...getDefaultState(), ...parsed };
  } catch (e) {
    return getDefaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore storage errors
  }
}

// Formatting helpers (Indonesian dot separator: 406.770)
function formatNumberID(num) {
  const n = Number(num) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatRupiah(num) {
  return 'Rp ' + formatNumberID(num);
}

function parseNumericInput(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str || '').replace(/[^\d-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// Date formatting helpers: YYYY-MM-DD -> DD/MM/YYYY and DD/MM
function formatDateFull(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateShort(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return '-';
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calculate totals
function computeTotals() {
  const paidMembers = state.members.filter((m) => (Number(m.amount) || 0) > 0 && m.name.trim() !== '');
  const totalIncome = paidMembers.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const validExpenses = state.expenses.filter((e) => (Number(e.amount) || 0) > 0 || e.name.trim() !== '');
  const totalExpense = validExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const prevBalance = Number(state.prevBalance) || 0;
  const finalBalance = prevBalance + totalIncome - totalExpense;

  return {
    paidMembers,
    totalIncome,
    validExpenses,
    totalExpense,
    prevBalance,
    finalBalance
  };
}

// Generate exact WhatsApp report text
function generateWhatsAppReport() {
  const {
    paidMembers,
    totalIncome,
    validExpenses,
    prevBalance,
    finalBalance
  } = computeTotals();

  const clubTitle = (state.clubName || 'Klub Badminton GAI Cibubur').trim();
  const fullSessionDate = formatDateFull(state.sessionDate);
  const shortSessionDate = formatDateShort(state.sessionDate);
  const fullReportDate = formatDateFull(state.reportDate);

  const lines = [];
  lines.push(`LAPORAN KEUANGAN ${clubTitle} `);
  lines.push('');
  lines.push(`#Saldo Sebelumnya *${formatRupiah(prevBalance)}* `);
  lines.push('');
  lines.push('Pemasukan;');
  lines.push(`#Iuran Kok ${fullSessionDate}`);

  if (paidMembers.length === 0) {
    lines.push('- (Belum ada pemasukan iuran)');
  } else {
    paidMembers.forEach((m, idx) => {
      lines.push(`${idx + 1}. ${m.name.trim()} ${formatNumberID(m.amount)}`);
    });
  }

  lines.push(`- Total pemasukan tgl ${shortSessionDate} *${formatRupiah(totalIncome)}* `);
  lines.push('');
  lines.push(`Pengeluaran; tgl ${fullSessionDate}`);

  const activeExpenses = validExpenses.filter((e) => e.name.trim() !== '' || (Number(e.amount) || 0) > 0);
  if (activeExpenses.length === 0) {
    lines.push('- Tidak ada pengeluaran *Rp 0*');
  } else {
    activeExpenses.forEach((e) => {
      const label = e.name.trim() || 'Pengeluaran';
      lines.push(`- ${label} *${formatRupiah(e.amount)}* `);
    });
  }

  lines.push('');
  lines.push(`Saldo saat ini ${fullReportDate} *${formatRupiah(finalBalance)}* `);

  const closing = (state.closingNote || '').trim();
  if (closing) {
    lines.push('');
    lines.push(closing);
  }

  return lines.join('\n');
}

// DOM Elements
const elHeaderClubTitle = document.getElementById('headerClubTitle');
const elClubName = document.getElementById('clubName');
const elPrevBalance = document.getElementById('prevBalance');
const elSessionDate = document.getElementById('sessionDate');
const elReportDate = document.getElementById('reportDate');
const elClosingNote = document.getElementById('closingNote');

const elMemberList = document.getElementById('memberList');
const elExpenseList = document.getElementById('expenseList');
const elPaidCountBadge = document.getElementById('paidCountBadge');
const elLblIncomeDate = document.getElementById('lblIncomeDate');
const elLblTotalIncome = document.getElementById('lblTotalIncome');
const elLblTotalExpense = document.getElementById('lblTotalExpense');
const elWaPreviewText = document.getElementById('waPreviewText');

const elSumPrev = document.getElementById('sumPrev');
const elSumIncome = document.getElementById('sumIncome');
const elSumExpense = document.getElementById('sumExpense');
const elSumFinal = document.getElementById('sumFinal');

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2300);
}

// Update summary & preview without re-creating input DOMs
function refreshSummaryAndPreview() {
  saveState();
  const { paidMembers, totalIncome, totalExpense, prevBalance, finalBalance } = computeTotals();

  elHeaderClubTitle.textContent = state.clubName || 'Klub Badminton';
  elPaidCountBadge.textContent = `${paidMembers.length} bayar`;
  elLblIncomeDate.textContent = formatDateShort(state.sessionDate);
  elLblTotalIncome.textContent = formatRupiah(totalIncome);
  elLblTotalExpense.textContent = formatRupiah(totalExpense);

  elSumPrev.textContent = formatRupiah(prevBalance);
  elSumIncome.textContent = formatRupiah(totalIncome);
  elSumExpense.textContent = formatRupiah(totalExpense);
  elSumFinal.textContent = formatRupiah(finalBalance);

  elWaPreviewText.textContent = generateWhatsAppReport();

  // Update member row visual numbers & paid state
  let paidOrder = 0;
  const rows = elMemberList.querySelectorAll('.member-item');
  rows.forEach((row) => {
    const id = row.dataset.id;
    const member = state.members.find((m) => m.id === id);
    if (!member) return;
    const isPaid = (Number(member.amount) || 0) > 0;
    row.classList.toggle('paid', isPaid);
    const badge = row.querySelector('.member-badge-num');
    if (isPaid) {
      paidOrder += 1;
      badge.textContent = paidOrder;
    } else {
      badge.textContent = '-';
    }

    // Highlight matching nominal chip
    const chips = row.querySelectorAll('.chip-nom');
    chips.forEach((chip) => {
      const chipVal = Number(chip.dataset.val);
      chip.classList.toggle('active', chipVal === (Number(member.amount) || 0));
    });
  });
}

function renderMembers() {
  elMemberList.innerHTML = '';

  state.members.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'member-item' + ((Number(member.amount) || 0) > 0 ? ' paid' : '');
    row.dataset.id = member.id;

    const chipsHtml = QUICK_NOMINALS.map((nom) => {
      const label = nom === 0 ? 'Absen (0)' : `${nom / 1000}rb`;
      const zeroClass = nom === 0 ? ' zero' : '';
      const activeClass = (Number(member.amount) || 0) === nom ? ' active' : '';
      return `<button type="button" class="chip-nom${zeroClass}${activeClass}" data-val="${nom}">${label}</button>`;
    }).join('');

    row.innerHTML = `
      <div class="member-top">
        <div class="member-name-wrap">
          <span class="member-badge-num">-</span>
          <input type="text" class="member-name-input" value="${escapeHtml(member.name)}" placeholder="Nama anggota" />
        </div>
        <div class="member-controls">
          <div class="member-amount-wrap">
            <span class="prefix">Rp</span>
            <input type="text" class="member-amount-input" inputmode="numeric" value="${formatNumberID(member.amount)}" />
          </div>
          <button type="button" class="btn-delete" title="Hapus anggota" aria-label="Hapus anggota">✕</button>
        </div>
      </div>
      <div class="nominal-chips">
        ${chipsHtml}
      </div>
    `;

    const nameInput = row.querySelector('.member-name-input');
    const amountInput = row.querySelector('.member-amount-input');
    const deleteBtn = row.querySelector('.btn-delete');
    const chips = row.querySelectorAll('.chip-nom');

    nameInput.addEventListener('input', (e) => {
      member.name = e.target.value;
      refreshSummaryAndPreview();
    });

    amountInput.addEventListener('input', (e) => {
      const val = parseNumericInput(e.target.value);
      member.amount = val;
      e.target.value = formatNumberID(val);
      refreshSummaryAndPreview();
    });

    amountInput.addEventListener('focus', (e) => {
      e.target.select();
    });

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = Number(chip.dataset.val);
        member.amount = val;
        amountInput.value = formatNumberID(val);
        refreshSummaryAndPreview();
      });
    });

    deleteBtn.addEventListener('click', () => {
      state.members = state.members.filter((m) => m.id !== member.id);
      renderMembers();
      refreshSummaryAndPreview();
      showToast(`Anggota "${member.name}" dihapus`);
    });

    elMemberList.appendChild(row);
  });
}

function renderExpenses() {
  elExpenseList.innerHTML = '';

  if (state.expenses.length === 0) {
    elExpenseList.innerHTML = `<div class="expense-empty">Belum ada pengeluaran. Klik "+ Tambah Item" atau tombol cepat di atas.</div>`;
    return;
  }

  state.expenses.forEach((exp) => {
    const row = document.createElement('div');
    row.className = 'expense-item';
    row.dataset.id = exp.id;

    row.innerHTML = `
      <input type="text" class="exp-name-input" value="${escapeHtml(exp.name)}" placeholder="Keterangan (cth: Kok prowan 1 slop)" />
      <div class="input-currency">
        <span class="prefix">Rp</span>
        <input type="text" class="exp-amount-input" inputmode="numeric" value="${formatNumberID(exp.amount)}" />
      </div>
      <button type="button" class="btn-delete" title="Hapus pengeluaran">✕</button>
    `;

    const nameInput = row.querySelector('.exp-name-input');
    const amountInput = row.querySelector('.exp-amount-input');
    const deleteBtn = row.querySelector('.btn-delete');

    nameInput.addEventListener('input', (e) => {
      exp.name = e.target.value;
      refreshSummaryAndPreview();
    });

    amountInput.addEventListener('input', (e) => {
      const val = parseNumericInput(e.target.value);
      exp.amount = val;
      e.target.value = formatNumberID(val);
      refreshSummaryAndPreview();
    });

    amountInput.addEventListener('focus', (e) => {
      e.target.select();
    });

    deleteBtn.addEventListener('click', () => {
      state.expenses = state.expenses.filter((item) => item.id !== exp.id);
      renderExpenses();
      refreshSummaryAndPreview();
    });

    elExpenseList.appendChild(row);
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initFormFields() {
  elClubName.value = state.clubName;
  elPrevBalance.value = formatNumberID(state.prevBalance);
  elSessionDate.value = state.sessionDate;
  elReportDate.value = state.reportDate;
  elClosingNote.value = state.closingNote;

  elClubName.addEventListener('input', (e) => {
    state.clubName = e.target.value;
    refreshSummaryAndPreview();
  });

  elPrevBalance.addEventListener('input', (e) => {
    const val = parseNumericInput(e.target.value);
    state.prevBalance = val;
    e.target.value = formatNumberID(val);
    refreshSummaryAndPreview();
  });

  elPrevBalance.addEventListener('focus', (e) => e.target.select());

  elSessionDate.addEventListener('change', (e) => {
    state.sessionDate = e.target.value;
    refreshSummaryAndPreview();
  });

  elReportDate.addEventListener('change', (e) => {
    state.reportDate = e.target.value;
    refreshSummaryAndPreview();
  });

  elClosingNote.addEventListener('input', (e) => {
    state.closingNote = e.target.value;
    refreshSummaryAndPreview();
  });

  // Add Member
  document.getElementById('formAddMember').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newMemberName');
    const name = input.value.trim();
    if (!name) {
      showToast('Masukkan nama anggota terlebih dahulu');
      return;
    }
    state.members.push({
      id: 'm_' + Date.now(),
      name,
      amount: 15000
    });
    input.value = '';
    renderMembers();
    refreshSummaryAndPreview();
    showToast(`${name} ditambahkan`);
  });

  // Clear all member amounts to 0
  document.getElementById('btnClearAllPaid').addEventListener('click', () => {
    state.members.forEach((m) => {
      m.amount = 0;
    });
    renderMembers();
    refreshSummaryAndPreview();
    showToast('Semua nominal iuran di-reset ke Rp 0');
  });

  // Add Expense button
  document.getElementById('btnAddExpense').addEventListener('click', () => {
    state.expenses.push({
      id: 'e_' + Date.now(),
      name: '',
      amount: 0
    });
    renderExpenses();
    refreshSummaryAndPreview();
  });

  // Quick Expense Presets
  document.querySelectorAll('.chip-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const amount = Number(btn.dataset.amount) || 0;
      state.expenses.push({
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        name,
        amount
      });
      renderExpenses();
      refreshSummaryAndPreview();
      showToast(`Ditambahkan: ${name}`);
    });
  });

  // Apply Final Balance to Prev Balance (Rollover to next session)
  document.getElementById('btnApplyFinalToPrev').addEventListener('click', () => {
    const { finalBalance } = computeTotals();
    state.prevBalance = finalBalance;
    state.sessionDate = getTodayISO();
    state.reportDate = getTodayISO();
    state.members.forEach((m) => {
      m.amount = 0;
    });
    elPrevBalance.value = formatNumberID(state.prevBalance);
    elSessionDate.value = state.sessionDate;
    elReportDate.value = state.reportDate;
    renderMembers();
    refreshSummaryAndPreview();
    showToast('Saldo akhir dijadikan Saldo Awal sesi baru!');
  });

  // Reset / Sesi Baru option
  document.getElementById('btnResetSession').addEventListener('click', () => {
    const def = getDefaultState();
    state = def;
    elClubName.value = state.clubName;
    elPrevBalance.value = formatNumberID(state.prevBalance);
    elSessionDate.value = state.sessionDate;
    elReportDate.value = state.reportDate;
    elClosingNote.value = state.closingNote;
    renderMembers();
    renderExpenses();
    refreshSummaryAndPreview();
    showToast('Data dikembalikan ke contoh awal');
  });

  // Copy Report
  const handleCopy = async () => {
    const report = generateWhatsAppReport();
    try {
      await navigator.clipboard.writeText(report);
      showToast('✅ Laporan berhasil disalin! Siap tempel di WA');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ Laporan berhasil disalin!');
    }
  };

  document.getElementById('btnCopyReport').addEventListener('click', handleCopy);
  document.getElementById('btnCopyTop').addEventListener('click', handleCopy);

  // Share via Android Native Share Sheet
  document.getElementById('btnShareNative').addEventListener('click', async () => {
    const report = generateWhatsAppReport();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Laporan Keuangan ${state.clubName}`,
          text: report
        });
      } catch (err) {
        // user cancelled share
      }
    } else {
      await handleCopy();
    }
  });

  // Direct Share to WhatsApp Group
  document.getElementById('btnShareWA').addEventListener('click', () => {
    const report = generateWhatsAppReport();
    const encoded = encodeURIComponent(report);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  });
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  });
}

// PIN Authentication Logic
function getActivePin() {
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_BENDAHARA_PIN;
  } catch (e) {
    return DEFAULT_BENDAHARA_PIN;
  }
}

function isDeviceUnlocked() {
  try {
    return (
      localStorage.getItem(AUTH_SESSION_KEY) === 'true' ||
      sessionStorage.getItem(AUTH_SESSION_KEY) === 'true'
    );
  } catch (e) {
    return false;
  }
}

function initPinLock() {
  const lockScreen = document.getElementById('pinLockScreen');
  const pinInput = document.getElementById('pinInput');
  const pinRemember = document.getElementById('pinRemember');
  const pinErrorMsg = document.getElementById('pinErrorMsg');
  const formPinLogin = document.getElementById('formPinLogin');

  const pinChangeModal = document.getElementById('pinChangeModal');
  const formPinChange = document.getElementById('formPinChange');
  const oldPinInput = document.getElementById('oldPinInput');
  const newPinInput = document.getElementById('newPinInput');

  if (isDeviceUnlocked()) {
    lockScreen.hidden = true;
  } else {
    lockScreen.hidden = false;
  }

  formPinLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = pinInput.value.trim();
    if (entered === getActivePin()) {
      pinErrorMsg.hidden = true;
      pinInput.value = '';
      lockScreen.hidden = true;
      try {
        if (pinRemember.checked) {
          localStorage.setItem(AUTH_SESSION_KEY, 'true');
        } else {
          sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        }
      } catch (err) { }
      showToast('🔓 Akses Bendahara dibuka');
    } else {
      pinErrorMsg.hidden = false;
      pinInput.value = '';
      pinInput.focus();
    }
  });

  // Open PIN Settings Modal
  document.getElementById('btnOpenPinModal').addEventListener('click', () => {
    oldPinInput.value = '';
    newPinInput.value = '';
    pinChangeModal.hidden = false;
  });

  document.getElementById('btnCancelChangePin').addEventListener('click', () => {
    pinChangeModal.hidden = true;
  });

  formPinChange.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldVal = oldPinInput.value.trim();
    const newVal = newPinInput.value.trim();

    if (oldVal !== getActivePin()) {
      showToast('❌ PIN saat ini salah!');
      return;
    }
    if (newVal.length < 4) {
      showToast('⚠️ PIN baru minimal 4 karakter');
      return;
    }

    try {
      localStorage.setItem(PIN_STORAGE_KEY, newVal);
    } catch (err) { }
    pinChangeModal.hidden = true;
    showToast('✅ PIN Bendahara berhasil diperbarui!');
  });

  document.getElementById('btnLockNow').addEventListener('click', () => {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch (err) { }
    pinChangeModal.hidden = true;
    lockScreen.hidden = false;
    pinInput.focus();
    showToast('🔒 Aplikasi dikunci');
  });
}

// Initialize app
initPinLock();
initFormFields();
renderMembers();
renderExpenses();
refreshSummaryAndPreview();
