const SUPABASE_URL = 'https://eylbcafwmrzgbdqzpvtm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_070jInqW0fm4-Cwk5Igjrg__I-oCLYb';
const hasSupabaseConfig = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
const supabaseClient = hasSupabaseConfig && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const storageKey = 'pressledger-equity-demo';
const state = { owners: [], transactions: [], periods: [], selectedPeriod: null };
const transactionNames = { setoran: 'Setoran modal', prive: 'Prive pemilik', laba: 'Laba periode', rugi: 'Rugi periode' };
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDate = value => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
const formatPeriod = value => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`));
let toastTimeout;

function setStatus(message, status) {
  document.querySelector('#connection-status').textContent = message;
  document.querySelector('#connection-dot').className = `connection-dot ${status}`;
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function persistDemo() {
  if (!supabaseClient) localStorage.setItem(storageKey, JSON.stringify(state));
}

function seedDemo() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const data = JSON.parse(saved);
    if (!Array.isArray(data.owners) || !Array.isArray(data.transactions) || !Array.isArray(data.periods)) {
      throw new Error('Data demo lokal tidak valid. Hapus data situs untuk memulai ulang.');
    }
    Object.assign(state, data);
    return;
  }

  const owner1 = 'owner-aditya';
  const owner2 = 'owner-maya';
  const date = today();
  state.owners = [
    { id: owner1, nama: 'Aditya Pranata', created_at: date },
    { id: owner2, nama: 'Maya Lestari', created_at: date },
  ];
  state.transactions = [
    { id: 'demo-1', pemilik_id: owner1, tanggal: date, jenis: 'setoran', jumlah: 75000000, keterangan: 'Modal awal usaha percetakan', no_bukti: 'BM-001', created_at: `${date}T08:00:00` },
    { id: 'demo-2', pemilik_id: owner2, tanggal: date, jenis: 'setoran', jumlah: 50000000, keterangan: 'Modal awal usaha percetakan', no_bukti: 'BM-002', created_at: `${date}T09:00:00` },
    { id: 'demo-3', pemilik_id: owner1, tanggal: date, jenis: 'prive', jumlah: 5000000, keterangan: 'Pengambilan pemilik', no_bukti: 'PV-001', created_at: `${date}T10:00:00` },
    { id: 'demo-4', pemilik_id: null, tanggal: date, jenis: 'laba', jumlah: 18500000, keterangan: 'Laba bersih percetakan', no_bukti: 'LR-001', created_at: `${date}T11:00:00` },
  ];
  state.periods = [{ id: 'period-demo', nama_periode: date.slice(0, 7), modal_awal: 0, created_at: `${date}T12:00:00` }];
  state.selectedPeriod = 'period-demo';
  persistDemo();
}

async function loadSupabaseData() {
  const results = await Promise.all([
    supabaseClient.from('pemilik').select('*').order('nama'),
    supabaseClient.from('transaksi_modal').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
    supabaseClient.from('periode_laporan').select('*').order('nama_periode', { ascending: false }),
  ]);
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  state.owners = results[0].data || [];
  state.transactions = results[1].data || [];
  state.periods = results[2].data || [];
  if (!state.periods.some(period => period.id === state.selectedPeriod)) state.selectedPeriod = state.periods[0]?.id || null;
}

function ownerById(id) {
  return state.owners.find(owner => owner.id === id);
}

function totalsFor(transactions) {
  return transactions.reduce((totals, item) => {
    totals[item.jenis] += Number(item.jumlah);
    return totals;
  }, { setoran: 0, prive: 0, laba: 0, rugi: 0 });
}

function endingEquity(opening, totals) {
  return Number(opening) + totals.setoran - totals.prive + totals.laba - totals.rugi;
}

function ownerEquity(ownerId) {
  return state.transactions.filter(item => item.pemilik_id === ownerId)
    .reduce((total, item) => total + (item.jenis === 'setoran' ? Number(item.jumlah) : item.jenis === 'prive' ? -Number(item.jumlah) : 0), 0);
}

function renderSummary() {
  const totals = totalsFor(state.transactions);
  document.querySelector('#stat-equity').textContent = money(endingEquity(0, totals));
  document.querySelector('#stat-deposit').textContent = money(totals.setoran);
  document.querySelector('#stat-withdrawal').textContent = money(totals.prive);
  document.querySelector('#stat-profit').textContent = money(totals.laba - totals.rugi);
  document.querySelector('#equity-caption').textContent = `${state.transactions.length} mutasi modal tercatat`;

  document.querySelector('#owner-summary').innerHTML = state.owners.length
    ? state.owners.map(owner => `<div class="owner-row"><span class="owner-avatar">${escapeHtml(initials(owner.nama))}</span><div class="owner-description"><strong>${escapeHtml(owner.nama)}</strong><small>Setoran dikurangi prive</small></div><span class="owner-equity">${money(ownerEquity(owner.id))}</span></div>`).join('')
    : '<div class="empty-state">Belum ada data pemilik.</div>';

  const recent = [...state.transactions].sort((a, b) => `${b.tanggal}${b.created_at || ''}`.localeCompare(`${a.tanggal}${a.created_at || ''}`)).slice(0, 4);
  document.querySelector('#recent-transactions').innerHTML = recent.length
    ? recent.map(item => `<div class="recent-row"><span class="transaction-mark ${item.jenis}">${item.jenis === 'prive' || item.jenis === 'rugi' ? '↘' : '↗'}</span><div class="recent-description"><strong>${escapeHtml(item.keterangan || transactionNames[item.jenis])}</strong><small>${escapeHtml(ownerById(item.pemilik_id)?.nama || 'Perusahaan')} · ${formatDate(item.tanggal)}</small></div><span class="recent-amount ${item.jenis}">${['prive', 'rugi'].includes(item.jenis) ? '−' : '+'}${money(item.jumlah)}</span></div>`).join('')
    : '<div class="empty-state">Belum ada transaksi modal.</div>';
}

function renderTransactions() {
  const search = document.querySelector('#transaction-search').value.trim().toLocaleLowerCase('id');
  const type = document.querySelector('#transaction-type-filter').value;
  const month = document.querySelector('#transaction-month-filter').value;
  const rows = [...state.transactions]
    .filter(item => !type || item.jenis === type)
    .filter(item => !month || item.tanggal.startsWith(month))
    .filter(item => !search || [item.keterangan, item.no_bukti, ownerById(item.pemilik_id)?.nama, transactionNames[item.jenis]].some(value => value?.toLocaleLowerCase('id').includes(search)))
    .sort((a, b) => `${b.tanggal}${b.created_at || ''}`.localeCompare(`${a.tanggal}${a.created_at || ''}`));
  document.querySelector('#transaction-rows').innerHTML = rows.map(item => `<tr>
    <td>${formatDate(item.tanggal)}</td><td>${escapeHtml(ownerById(item.pemilik_id)?.nama || 'Perusahaan')}</td>
    <td><span class="type-badge ${item.jenis}">${transactionNames[item.jenis]}</span></td>
    <td>${escapeHtml(item.keterangan || '—')}${item.no_bukti ? `<br><small>${escapeHtml(item.no_bukti)}</small>` : ''}</td>
    <td class="amount-cell ${item.jenis} align-right">${['prive', 'rugi'].includes(item.jenis) ? '−' : '+'}${money(item.jumlah)}</td>
    <td><button class="delete-button" type="button" data-delete="${escapeHtml(item.id)}" aria-label="Hapus transaksi ${escapeHtml(item.keterangan || transactionNames[item.jenis])}">×</button></td></tr>`).join('');
  document.querySelector('#empty-transactions').classList.toggle('hidden', rows.length > 0);
}

function renderOwners() {
  document.querySelector('#owners-grid').innerHTML = state.owners.length
    ? state.owners.map(owner => {
      const deposits = state.transactions.filter(item => item.pemilik_id === owner.id && item.jenis === 'setoran').reduce((sum, item) => sum + Number(item.jumlah), 0);
      return `<article class="owner-card"><div class="owner-card-top"><span class="owner-avatar">${escapeHtml(initials(owner.nama))}</span><div><strong>${escapeHtml(owner.nama)}</strong><small>Pemilik perusahaan</small></div></div><div class="owner-card-total"><small>Saldo modal bersih</small><strong>${money(ownerEquity(owner.id))}</strong></div><small>Akumulasi setoran: ${money(deposits)}</small></article>`;
    }).join('')
    : '<div class="empty-state">Belum ada pemilik. Tambahkan pemilik untuk mencatat setoran dan prive.</div>';
  document.querySelector('#transaction-owner').innerHTML = state.owners.length
    ? state.owners.map(owner => `<option value="${escapeHtml(owner.id)}">${escapeHtml(owner.nama)}</option>`).join('')
    : '<option value="">Tambahkan pemilik terlebih dahulu</option>';
}

function transactionsForPeriod(period) {
  return state.transactions.filter(item => item.tanggal.slice(0, 7) === period.nama_periode);
}

function renderReport() {
  const list = document.querySelector('#period-list');
  list.innerHTML = state.periods.length
    ? state.periods.map(period => `<button class="period-button ${period.id === state.selectedPeriod ? 'active' : ''}" type="button" data-period="${escapeHtml(period.id)}">${escapeHtml(formatPeriod(period.nama_periode))}</button>`).join('')
    : '<div class="empty-state">Belum ada periode laporan.</div>';
  const period = state.periods.find(item => item.id === state.selectedPeriod);
  if (!period) {
    document.querySelector('#report-detail').innerHTML = '<div class="report-placeholder"><span>▤</span><strong>Pilih periode laporan</strong><small>Rincian perubahan ekuitas akan ditampilkan di sini.</small></div>';
    return;
  }
  const totals = totalsFor(transactionsForPeriod(period));
  document.querySelector('#report-detail').innerHTML = `<div class="report-title"><p class="eyebrow">LAPORAN PERUBAHAN EKUITAS</p><h2>${escapeHtml(formatPeriod(period.nama_periode))}</h2></div>
    <table class="report-table"><tbody>
      <tr><td>Modal awal</td><td>${money(period.modal_awal)}</td></tr>
      <tr><td>Setoran modal selama periode</td><td>${money(totals.setoran)}</td></tr>
      <tr class="subtotal"><td>Prive pemilik</td><td>(${money(totals.prive)})</td></tr>
      <tr class="subtotal"><td>Laba periode</td><td>${money(totals.laba)}</td></tr>
      <tr class="subtotal"><td>Rugi periode</td><td>(${money(totals.rugi)})</td></tr>
      <tr class="total"><td>Modal akhir</td><td>${money(endingEquity(period.modal_awal, totals))}</td></tr>
    </tbody></table>`;
}

function render() {
  renderSummary();
  renderTransactions();
  renderOwners();
  renderReport();
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function setOwnerRequirement() {
  const requiresOwner = ['setoran', 'prive'].includes(document.querySelector('#transaction-type').value);
  const select = document.querySelector('#transaction-owner');
  select.required = requiresOwner;
  select.disabled = state.owners.length === 0 || !requiresOwner;
  document.querySelector('#owner-field').classList.toggle('optional', !requiresOwner);
}

async function insertRecord(table, record) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from(table).insert(record).select().single();
    if (error) throw error;
    return data;
  }
  return { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() };
}

async function createTransaction(formData) {
  const kind = formData.get('jenis');
  const record = {
    tanggal: formData.get('tanggal'),
    jenis: kind,
    pemilik_id: ['setoran', 'prive'].includes(kind) ? formData.get('pemilik_id') : null,
    jumlah: Number(formData.get('jumlah')),
    keterangan: formData.get('keterangan').trim() || null,
    no_bukti: formData.get('no_bukti').trim() || null,
  };
  const saved = await insertRecord('transaksi_modal', record);
  if (!supabaseClient) {
    state.transactions.push(saved);
    persistDemo();
  } else await loadSupabaseData();
}

async function createOwner(name) {
  const saved = await insertRecord('pemilik', { nama: name.trim() });
  if (!supabaseClient) {
    state.owners.push(saved);
    persistDemo();
  } else await loadSupabaseData();
}

async function deleteTransaction(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('transaksi_modal').delete().eq('id', id);
    if (error) throw error;
    await loadSupabaseData();
  } else {
    state.transactions = state.transactions.filter(item => item.id !== id);
    persistDemo();
  }
}

async function createPeriod(periodKey, opening) {
  if (state.periods.some(period => period.nama_periode === periodKey)) throw new Error('Periode laporan tersebut sudah ada.');
  const saved = await insertRecord('periode_laporan', { nama_periode: periodKey, modal_awal: opening });
  if (!supabaseClient) {
    state.periods.push(saved);
    state.selectedPeriod = saved.id;
    persistDemo();
  } else {
    await loadSupabaseData();
    state.selectedPeriod = state.periods.find(period => period.nama_periode === periodKey)?.id || null;
  }
}

function openModal(id) {
  const dialog = document.getElementById(id);
  const form = dialog.querySelector('form');
  form.reset();
  const dateField = form.elements.tanggal;
  if (dateField) dateField.value = today();
  const periodField = form.elements.periode;
  if (periodField) periodField.value = today().slice(0, 7);
  dialog.querySelector('.form-error')?.classList.add('hidden');
  if (id === 'transaction-modal') setOwnerRequirement();
  dialog.showModal();
}

function wireEvents() {
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  document.querySelectorAll('[data-open-modal]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.openModal)));
  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelector('#transaction-type').addEventListener('change', setOwnerRequirement);
  ['#transaction-search', '#transaction-type-filter', '#transaction-month-filter'].forEach(selector => {
    document.querySelector(selector).addEventListener('input', renderTransactions);
    document.querySelector(selector).addEventListener('change', renderTransactions);
  });
  document.querySelector('#transaction-rows').addEventListener('click', async event => {
    const button = event.target.closest('[data-delete]');
    if (!button || !confirm('Hapus transaksi modal ini?')) return;
    button.disabled = true;
    try {
      await deleteTransaction(button.dataset.delete);
      render();
      showToast('Transaksi berhasil dihapus.');
    } catch (error) {
      button.disabled = false;
      showToast(`Gagal menghapus transaksi: ${error.message}`);
    }
  });
  document.querySelector('#period-list').addEventListener('click', event => {
    const button = event.target.closest('[data-period]');
    if (!button) return;
    state.selectedPeriod = button.dataset.period;
    renderReport();
    document.querySelectorAll('.period-button').forEach(item => item.classList.toggle('active', item === button));
  });
  document.querySelector('#transaction-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const error = document.querySelector('#transaction-error');
    const submit = form.querySelector('[type="submit"]');
    if (['setoran', 'prive'].includes(form.elements.jenis.value) && !state.owners.length) {
      error.textContent = 'Tambahkan pemilik terlebih dahulu untuk mencatat setoran atau prive.';
      error.classList.remove('hidden');
      return;
    }
    submit.disabled = true;
    try {
      await createTransaction(new FormData(form));
      render();
      form.closest('dialog').close();
      showToast('Transaksi modal berhasil disimpan.');
    } catch (reason) {
      error.textContent = `Gagal menyimpan transaksi: ${reason.message}`;
      error.classList.remove('hidden');
    } finally { submit.disabled = false; }
  });
  document.querySelector('#owner-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const error = document.querySelector('#owner-error');
    try {
      await createOwner(form.elements.nama.value);
      render();
      form.closest('dialog').close();
      showToast('Data pemilik berhasil disimpan.');
    } catch (reason) {
      error.textContent = `Gagal menyimpan pemilik: ${reason.message}`;
      error.classList.remove('hidden');
    }
  });
  document.querySelector('#period-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const error = document.querySelector('#period-error');
    try {
      await createPeriod(form.elements.periode.value, Number(form.elements.modal_awal.value));
      render();
      form.closest('dialog').close();
      showToast('Periode laporan berhasil dibuat.');
    } catch (reason) {
      error.textContent = `Gagal membuat periode: ${reason.message}`;
      error.classList.remove('hidden');
    }
  });
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(item => item.classList.toggle('active', item === link));
  }));
}

async function initialize() {
  wireEvents();
  try {
    if (hasSupabaseConfig && !window.supabase) throw new Error('Pustaka Supabase tidak berhasil dimuat. Periksa koneksi internet.');
    if (supabaseClient) {
      await loadSupabaseData();
      setStatus('Supabase tersambung', 'connected');
    } else {
      seedDemo();
      setStatus('Mode demo lokal', '');
    }
    render();
  } catch (error) {
    setStatus('Koneksi gagal', 'error');
    showToast(`Gagal memuat data: ${error.message}`);
    console.error('Gagal memuat sistem akuntansi ekuitas:', error);
  }
}

initialize();
