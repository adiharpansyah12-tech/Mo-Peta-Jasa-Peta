// ============================================================
//  Mo-PETA Admin Panel — Versi Google Sheets
//  Status diperbarui via polling setiap 15 detik
// ============================================================

const ADMIN_PASSWORD = '0delapan5dua'; // Ganti sesuai keinginan Anda

let _currentOrderId = '';
let _adminPollId    = null;
let _allOrders      = [];

// ---- Fungsi bantu: POST ke Apps Script ----
async function postToScript(data) {
  const res = await fetch(SCRIPT_URL, {
    method:   'POST',
    headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
    body:     JSON.stringify(data),
    redirect: 'follow'
  });
  return res.json();
}

// ---- Fungsi bantu: GET dari Apps Script ----
async function getFromScript(params) {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  return res.json();
}

// ============================================================
//  LOGIN / LOGOUT
// ============================================================

function doLogin() {
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === ADMIN_PASSWORD) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'block';
    loadAllPesanan();
    startAdminPolling();
  } else {
    document.getElementById('loginError').style.display = 'block';
    setTimeout(() => { document.getElementById('loginError').style.display = 'none'; }, 3000);
  }
}

document.getElementById('adminPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('adminPassword').value = '';
  if (_adminPollId) { clearInterval(_adminPollId); _adminPollId = null; }
}

// ============================================================
//  LOAD & POLLING DATA
// ============================================================

async function loadAllPesanan() {
  try {
    const result = await getFromScript({ action: 'admin_get' });
    if (result.success) {
      _allOrders = result.data || [];
      updateStats(_allOrders);
      renderTable(_allOrders);
    } else {
      showAdminError('Gagal memuat data: ' + (result.message || ''));
    }
  } catch {
    showAdminError('Tidak dapat menghubungi server. Periksa URL Apps Script.');
  }
}

function startAdminPolling() {
  if (_adminPollId) clearInterval(_adminPollId);
  _adminPollId = setInterval(async () => {
    try {
      const result = await getFromScript({ action: 'admin_get' });
      if (!result.success) return;
      const newOrders = result.data || [];
      if (newOrders.length > _allOrders.length) {
        const diff = newOrders.length - _allOrders.length;
        showAdminToast(`🔔 ${diff} pesanan baru masuk!`);
      }
      _allOrders = newOrders;
      updateStats(_allOrders);
      filterTable();
    } catch {}
  }, 15000);
}

// ============================================================
//  STATISTIK
// ============================================================

function updateStats(orders) {
  document.getElementById('statTotal').textContent    = orders.length;
  document.getElementById('statMenunggu').textContent = orders.filter(o => o.status === 'Menunggu').length;
  document.getElementById('statDiproses').textContent = orders.filter(o => o.status === 'Diproses').length;
  document.getElementById('statSelesai').textContent  = orders.filter(o => o.status === 'Selesai').length;
  document.getElementById('statDitolak').textContent  = orders.filter(o => o.status === 'Ditolak').length;
}

// ============================================================
//  TABEL PESANAN
// ============================================================

function renderTable(orders) {
  const container = document.getElementById('adminTableContainer');
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 0;"><div class="empty-icon">📭</div><p>Belum ada pesanan masuk.</p></div>';
    return;
  }

  const statusColors = { Menunggu:'var(--warning)', Diproses:'var(--primary)', Selesai:'var(--success)', Ditolak:'var(--danger)' };
  const statusIcons  = { Menunggu:'⏳', Diproses:'⚙️', Selesai:'✅', Ditolak:'❌' };

  const rows = orders.map(o => {
    const tgl  = o.created_at ? new Date(o.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
    const nama = (o.nama || '').replace(/'/g, "\\'");
    return `
      <tr>
        <td><span class="order-id-cell">${o.id_pesanan}</span></td>
        <td>${o.nama}</td>
        <td>${o.nim}</td>
        <td>${o.prodi}</td>
        <td>${o.jenis_peta}${o.detail_lokasi ? '<br><small style="color:var(--text-muted)">' + o.detail_lokasi + '</small>' : ''}</td>
        <td><span class="status-badge" style="background:${statusColors[o.status] || 'gray'}">${statusIcons[o.status] || ''} ${o.status}</span></td>
        <td>${tgl}</td>
        <td><button class="btn-ubah-status" onclick="openModal('${o.id_pesanan}','${nama}')">✏️ Ubah</button></td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID Pesanan</th>
          <th>Nama</th>
          <th>NIM</th>
          <th>Prodi</th>
          <th>Jenis Peta</th>
          <th>Status</th>
          <th>Tanggal</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function filterTable() {
  const q      = (document.getElementById('adminSearch')?.value || '').toLowerCase();
  const status = document.getElementById('filterStatus')?.value || '';
  const filtered = _allOrders.filter(o => {
    const matchQ = !q || (o.id_pesanan + o.nama + o.nim + o.prodi).toLowerCase().includes(q);
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });
  renderTable(filtered);
}

// ============================================================
//  MODAL UBAH STATUS
// ============================================================

function openModal(id, nama) {
  _currentOrderId = id;
  document.getElementById('modalOrderId').textContent = id;
  document.getElementById('modalNama').textContent    = nama;
  document.getElementById('modalMsg').innerHTML = '';
  document.getElementById('statusModal').style.display = 'flex';
}

function closeModal(e) {
  if (!e || e.target.id === 'statusModal' || e.target.classList.contains('modal-close')) {
    document.getElementById('statusModal').style.display = 'none';
  }
}

async function setStatus(newStatus) {
  const msgEl = document.getElementById('modalMsg');
  msgEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Menyimpan...</p>';

  try {
    const result = await postToScript({
      action:     'update_status',
      id_pesanan: _currentOrderId,
      status:     newStatus
    });

    if (result.success) {
      msgEl.innerHTML = `<p style="color:var(--success);font-size:0.85rem;">✅ Status diubah ke <strong>${newStatus}</strong></p>`;
      await loadAllPesanan();
      setTimeout(() => {
        document.getElementById('statusModal').style.display = 'none';
      }, 1200);
    } else {
      msgEl.innerHTML = `<p style="color:var(--danger);font-size:0.85rem;">❌ ${result.message || 'Gagal mengubah status'}</p>`;
    }
  } catch {
    msgEl.innerHTML = '<p style="color:var(--danger);font-size:0.85rem;">❌ Gagal menghubungi server.</p>';
  }
}

// ============================================================
//  NOTIFIKASI
// ============================================================

function showAdminToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className   = 'toast-notif';
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 4000);
}

function showToast(msg) { showAdminToast(msg); }

function showAdminError(msg) {
  const container = document.getElementById('adminTableContainer');
  if (container) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 0;"><div class="empty-icon">❌</div><p>${msg}</p></div>`;
  }
}

window.addEventListener('beforeunload', () => {
  if (_adminPollId) clearInterval(_adminPollId);
});
