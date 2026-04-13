// ============================================================
//  Mo-PETA — admin.js
//  Logika panel admin: login, tabel pesanan, ubah status, real-time
// ============================================================

// ⚠️ GANTI KATA SANDI ADMIN DI BAWAH INI
const ADMIN_PASSWORD = '0delapan5dua';

let _allPesanan       = [];
let _adminChannel     = null;
let _selectedOrderId  = null;

// ============================================================
//  LOGIN / LOGOUT
// ============================================================

function doLogin() {
  const pwd = document.getElementById('adminPassword').value;
  const errEl = document.getElementById('loginError');

  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('mopeta_admin', '1');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'block';
    errEl.style.display = 'none';
    loadAllPesanan();
    startAdminRealtime();
  } else {
    errEl.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
  }
}

function doLogout() {
  sessionStorage.removeItem('mopeta_admin');
  if (_adminChannel) db.removeChannel(_adminChannel);
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPassword').value = '';
}

// Cek session saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  if (sessionStorage.getItem('mopeta_admin') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'block';
    loadAllPesanan();
    startAdminRealtime();
  }
});

// ============================================================
//  LOAD DATA & RENDER TABLE
// ============================================================

async function loadAllPesanan() {
  const container = document.getElementById('adminTableContainer');
  container.innerHTML = `<div class="empty-state" style="padding:40px 0;"><div class="empty-icon">⏳</div><p>Memuat data...</p></div>`;

  try {
    const { data, error } = await db
      .from('pesanan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = `<div class="alert alert-error" style="margin:20px;">Gagal memuat data: ${error.message}</div>`;
      return;
    }

    _allPesanan = data || [];
    updateStats(_allPesanan);
    renderTable(_allPesanan);

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-error" style="margin:20px;">Terjadi kesalahan koneksi.</div>`;
  }
}

function updateStats(data) {
  document.getElementById('statTotal').textContent    = data.length;
  document.getElementById('statMenunggu').textContent = data.filter(d => d.status === 'Menunggu').length;
  document.getElementById('statDiproses').textContent = data.filter(d => d.status === 'Diproses').length;
  document.getElementById('statSelesai').textContent  = data.filter(d => d.status === 'Selesai').length;
  document.getElementById('statDitolak').textContent  = data.filter(d => d.status === 'Ditolak').length;
}

function renderTable(data) {
  const container = document.getElementById('adminTableContainer');

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:60px 0;">
        <div class="empty-icon">📭</div>
        <p>Belum ada pesanan yang masuk.</p>
      </div>
    `;
    return;
  }

  const rows = data.map((item, idx) => `
    <tr class="table-row" data-idx="${idx}">
      <td><span class="order-id-cell">${item.order_id}</span></td>
      <td>
        <div class="td-nama">${item.nama}</div>
        <div class="td-sub">${item.nim} &bull; ${item.prodi}</div>
      </td>
      <td>
        <div>${item.jenis_peta}</div>
        ${item.jenis_lokasi ? `<div class="td-sub">${item.jenis_lokasi}${item.nama_lokasi ? ': ' + item.nama_lokasi : ''}</div>` : ''}
      </td>
      <td>${item.bahasa}</td>
      <td>${statusBadge(item.status)}</td>
      <td><div class="td-sub">${formatTanggal(item.created_at)}</div></td>
      <td>
        <button class="btn-ubah-status" onclick="openModal('${item.order_id}', '${item.nama.replace(/'/g, "\\'")}')">
          ✏️ Ubah Status
        </button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID Pesanan</th>
          <th>Pemesan</th>
          <th>Jenis Peta</th>
          <th>Bahasa</th>
          <th>Status</th>
          <th>Tanggal</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ---------- Filter & Search ----------
function filterTable() {
  const query  = document.getElementById('adminSearch').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;

  const filtered = _allPesanan.filter(item => {
    const matchSearch = !query ||
      item.nama.toLowerCase().includes(query) ||
      item.nim.toLowerCase().includes(query) ||
      item.order_id.toLowerCase().includes(query) ||
      (item.prodi || '').toLowerCase().includes(query);

    const matchStatus = !status || item.status === status;

    return matchSearch && matchStatus;
  });

  renderTable(filtered);
}

// ============================================================
//  REAL-TIME ADMIN
// ============================================================

function startAdminRealtime() {
  if (_adminChannel) db.removeChannel(_adminChannel);

  _adminChannel = db
    .channel('admin-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        _allPesanan.unshift(payload.new);
        showToast('📥 Pesanan baru masuk: ' + payload.new.order_id);
      } else if (payload.eventType === 'UPDATE') {
        const idx = _allPesanan.findIndex(p => p.order_id === payload.new.order_id);
        if (idx !== -1) _allPesanan[idx] = payload.new;
        showToast('🔄 Status diperbarui: ' + payload.new.order_id + ' → ' + payload.new.status);
      } else if (payload.eventType === 'DELETE') {
        _allPesanan = _allPesanan.filter(p => p.order_id !== payload.old.order_id);
      }

      updateStats(_allPesanan);
      filterTable();
    })
    .subscribe();
}

// ============================================================
//  MODAL UBAH STATUS
// ============================================================

function openModal(orderId, nama) {
  _selectedOrderId = orderId;
  document.getElementById('modalOrderId').textContent = orderId;
  document.getElementById('modalNama').textContent    = nama;
  document.getElementById('modalMsg').innerHTML       = '';
  document.getElementById('statusModal').classList.add('open');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('statusModal')) return;
  document.getElementById('statusModal').classList.remove('open');
  _selectedOrderId = null;
}

async function setStatus(newStatus) {
  if (!_selectedOrderId) return;

  const msgEl = document.getElementById('modalMsg');
  msgEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.88rem;">Menyimpan...</span>';

  try {
    const { error } = await db
      .from('pesanan')
      .update({ status: newStatus })
      .eq('order_id', _selectedOrderId);

    if (error) {
      msgEl.innerHTML = `<div class="alert alert-error">Gagal menyimpan: ${error.message}</div>`;
      return;
    }

    // Update data lokal
    const idx = _allPesanan.findIndex(p => p.order_id === _selectedOrderId);
    if (idx !== -1) _allPesanan[idx].status = newStatus;

    msgEl.innerHTML = `<div class="alert alert-success">✅ Status berhasil diubah menjadi <strong>${newStatus}</strong>!</div>`;
    updateStats(_allPesanan);
    filterTable();

    setTimeout(() => {
      document.getElementById('statusModal').classList.remove('open');
      _selectedOrderId = null;
    }, 1200);

  } catch (err) {
    console.error(err);
    msgEl.innerHTML = '<div class="alert alert-error">Terjadi kesalahan koneksi.</div>';
  }
}

// Tutup modal dengan ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('statusModal').classList.remove('open');
    _selectedOrderId = null;
  }
});

window.addEventListener('beforeunload', () => {
  if (_adminChannel) db.removeChannel(_adminChannel);
});
