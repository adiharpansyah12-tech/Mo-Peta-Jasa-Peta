// ============================================================
//  Mo-PETA — script.js
//  Logika form pemesanan, lacak pesanan, riwayat, dan real-time
// ============================================================

// ---------- HELPER: Generate ID Pesanan ----------
function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PETA-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ---------- HELPER: Format Tanggal ----------
function formatTanggal(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ---------- HELPER: Status Badge ----------
function statusBadge(status) {
  const map = {
    'Menunggu': '<span class="status-badge menunggu">⏳ Menunggu</span>',
    'Diproses': '<span class="status-badge diproses">⚙️ Sedang Diproses</span>',
    'Selesai':  '<span class="status-badge selesai">✅ Selesai</span>',
    'Ditolak':  '<span class="status-badge ditolak">❌ Ditolak</span>',
  };
  return map[status] || `<span class="status-badge menunggu">${status}</span>`;
}

// ---------- HELPER: Copy to Clipboard ----------
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('ID Pesanan berhasil disalin!');
  }).catch(() => {
    prompt('Salin ID pesanan Anda:', text);
  });
}

// ---------- HELPER: Toast Notifikasi ----------
function showToast(msg) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
      background:#1a6b3c; color:#fff; padding:12px 24px; border-radius:50px;
      font-size:0.9rem; font-weight:600; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.2);
      transition: opacity 0.4s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ============================================================
//  HALAMAN PESAN — Tampilkan/sembunyikan bagian kondisional
// ============================================================

function handleJenisPeta(value) {
  var sectionLokasi = document.getElementById('sectionLokasi');
  var sectionSampel = document.getElementById('sectionSampel');
  var formFooter    = document.getElementById('formFooter');
  if (!sectionLokasi) return;

  if (value === 'Peta Lokasi Penelitian') {
    sectionLokasi.style.display  = 'block';
    sectionSampel.style.display  = 'none';
    formFooter.style.display     = 'flex';
    document.getElementById('subWilayah').style.display = 'none';
    document.getElementById('subTempat').style.display  = 'none';
  } else {
    sectionLokasi.style.display = 'none';
    sectionSampel.style.display = 'block';
    formFooter.style.display    = 'none';
  }
}

function handleJenisLokasi(value) {
  var subWilayah = document.getElementById('subWilayah');
  var subTempat  = document.getElementById('subTempat');
  if (!subWilayah) return;

  if (value === 'Wilayah') {
    subWilayah.style.display = 'block';
    subTempat.style.display  = 'none';
  } else {
    subWilayah.style.display = 'none';
    subTempat.style.display  = 'block';
  }
}

// ---------- SUBMIT FORM ----------
const orderForm = document.getElementById('orderForm');
if (orderForm) {
  orderForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const bahasa    = document.querySelector('input[name="bahasa"]:checked')?.value || '';
    const nama      = document.getElementById('nama').value.trim();
    const nim       = document.getElementById('nim').value.trim();
    const prodi     = document.getElementById('prodi').value.trim();
    const jenisPeta = document.querySelector('input[name="jenisPeta"]:checked')?.value || '';

    let jenisLokasi = '';
    let namaLokasi  = '';

    if (jenisPeta === 'Peta Lokasi Penelitian') {
      jenisLokasi = document.querySelector('input[name="jenisLokasi"]:checked')?.value || '';
      if (jenisLokasi === 'Wilayah') {
        namaLokasi = document.getElementById('namaWilayah').value.trim();
      } else if (jenisLokasi === 'Nama Tempat') {
        namaLokasi = document.getElementById('namaTempat').value.trim();
      }

      if (!jenisLokasi) {
        alert('Mohon pilih Jenis Lokasi terlebih dahulu.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pesanan →';
        return;
      }
      if (!namaLokasi) {
        alert('Mohon isi nama wilayah atau nama institusi/lembaga.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pesanan →';
        return;
      }
    }

    const orderId = generateOrderId();

    const payload = {
      order_id:     orderId,
      bahasa:       bahasa,
      nama:         nama,
      nim:          nim,
      prodi:        prodi,
      jenis_peta:   jenisPeta,
      jenis_lokasi: jenisLokasi,
      nama_lokasi:  namaLokasi,
      status:       'Menunggu',
    };

    try {
      const { error } = await db.from('pesanan').insert([payload]);

      if (error) {
        console.error(error);
        alert('Terjadi kesalahan saat menyimpan pesanan: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pesanan →';
        return;
      }

      document.getElementById('displayOrderId').textContent = orderId;
      document.getElementById('formCard').style.display = 'none';
      document.getElementById('successBox').classList.add('visible');
      window._lastOrderId = orderId;

    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi. Pastikan URL dan API Key Supabase sudah benar di config.js.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim Pesanan →';
    }
  });
}

function copyOrderId() {
  copyText(window._lastOrderId || document.getElementById('displayOrderId').textContent);
}

// ============================================================
//  HALAMAN LACAK — Real-time tracking
// ============================================================

let _realtimeChannel    = null;
let _currentTrackedId   = null;
let _realtimeNimChannel = null;
let _currentTrackedNim  = null;

function renderOrderDetail(data) {
  let lokasiRow = '';
  if (data.jenis_peta === 'Peta Lokasi Penelitian') {
    lokasiRow = `
      <div class="detail-row">
        <span class="label">Jenis Lokasi</span>
        <span class="value">${data.jenis_lokasi || '-'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Nama Lokasi</span>
        <span class="value">${data.nama_lokasi || '-'}</span>
      </div>
    `;
  }

  return `
    <div class="realtime-indicator">🟢 <span>Terhubung — status diperbarui otomatis secara real-time</span></div>
    <div class="order-detail-card" style="margin-top:12px;">
      <div class="detail-row">
        <span class="label">ID Pesanan</span>
        <span class="value" style="font-family:monospace;letter-spacing:1px;color:var(--primary);">${data.order_id}</span>
      </div>
      <div class="detail-row" id="statusRowLacak">
        <span class="label">Status</span>
        <span class="value">${statusBadge(data.status)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Nama</span>
        <span class="value">${data.nama}</span>
      </div>
      <div class="detail-row">
        <span class="label">NIM</span>
        <span class="value">${data.nim}</span>
      </div>
      <div class="detail-row">
        <span class="label">Program Studi</span>
        <span class="value">${data.prodi}</span>
      </div>
      <div class="detail-row">
        <span class="label">Jenis Peta</span>
        <span class="value">${data.jenis_peta}</span>
      </div>
      ${lokasiRow}
      <div class="detail-row">
        <span class="label">Bahasa Peta</span>
        <span class="value">${data.bahasa}</span>
      </div>
      <div class="detail-row">
        <span class="label">Tanggal Pesan</span>
        <span class="value">${formatTanggal(data.created_at)}</span>
      </div>
    </div>
  `;
}

async function lacakPesanan() {
  const inputEl  = document.getElementById('inputOrderId');
  const resultEl = document.getElementById('lacakResult');
  if (!inputEl || !resultEl) return;

  const orderId = inputEl.value.trim().toUpperCase();
  if (!orderId) {
    resultEl.innerHTML = '<div class="alert alert-error">Mohon masukkan ID pesanan.</div>';
    resultEl.classList.add('visible');
    return;
  }

  resultEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Mencari pesanan...</p>';
  resultEl.classList.add('visible');

  // Hentikan channel lama jika ada
  if (_realtimeChannel) {
    db.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }

  try {
    const { data, error } = await db
      .from('pesanan')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !data) {
      resultEl.innerHTML = `<div class="alert alert-error">❌ ID pesanan <strong>${orderId}</strong> tidak ditemukan. Periksa kembali ID Anda.</div>`;
      return;
    }

    _currentTrackedId = orderId;
    resultEl.innerHTML = renderOrderDetail(data);

    // Mulai langganan real-time
    _realtimeChannel = db
      .channel('lacak-realtime-' + orderId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pesanan', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new;
          resultEl.innerHTML = renderOrderDetail(updated);
          showToast('Status pesanan diperbarui: ' + updated.status);
        }
      )
      .subscribe();

  } catch (err) {
    console.error(err);
    resultEl.innerHTML = '<div class="alert alert-error">Terjadi kesalahan koneksi. Periksa pengaturan Supabase di config.js.</div>';
  }
}

// ---------- Riwayat Berdasarkan NIM (dengan real-time) ----------

function renderRiwayatList(data) {
  if (!data || data.length === 0) return null;

  return data.map((item, idx) => `
    <div class="history-item" onclick="toggleHistoryDetail(${idx})">
      <div class="h-top">
        <span class="h-id">${item.order_id}</span>
        ${statusBadge(item.status)}
      </div>
      <div style="font-size:0.85rem;color:var(--text-muted);">${item.jenis_peta} &bull; ${formatTanggal(item.created_at)}</div>
      <div class="history-detail" id="histDetail_${idx}">
        <div class="info-row"><span>Nama</span><span>${item.nama}</span></div>
        <div class="info-row"><span>NIM</span><span>${item.nim}</span></div>
        <div class="info-row"><span>Program Studi</span><span>${item.prodi}</span></div>
        <div class="info-row">
          <span>ID Pesanan</span>
          <span style="font-family:monospace;color:var(--primary);letter-spacing:1px;">${item.order_id}</span>
        </div>
        <button class="copy-id-btn" onclick="event.stopPropagation(); copyText('${item.order_id}')">
          📋 Salin ID Pesanan
        </button>
      </div>
    </div>
  `).join('');
}

async function cariRiwayat() {
  const nimInput  = document.getElementById('inputNim');
  const container = document.getElementById('riwayatContainer');
  if (!nimInput || !container) return;

  const nim = nimInput.value.trim();
  if (!nim) {
    container.innerHTML = '<div class="alert alert-error">Mohon masukkan NIM Anda.</div>';
    return;
  }

  container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">Mencari riwayat pesanan...</p>';

  if (_realtimeNimChannel) {
    db.removeChannel(_realtimeNimChannel);
    _realtimeNimChannel = null;
  }

  try {
    const { data, error } = await db
      .from('pesanan')
      .select('*')
      .eq('nim', nim)
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = '<div class="alert alert-error">Terjadi kesalahan: ' + error.message + '</div>';
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Tidak ditemukan riwayat pesanan untuk NIM <strong>${nim}</strong>.</p>
        </div>
      `;
      return;
    }

    _currentTrackedNim = nim;
    let currentData = [...data];

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="realtime-indicator" style="margin-bottom:12px;">🟢 <span>Riwayat diperbarui otomatis secara real-time</span></div>
      <div class="history-list" id="riwayatList">${renderRiwayatList(currentData)}</div>
    `;
    container.innerHTML = '';
    container.appendChild(wrap);

    // Langganan real-time untuk NIM ini
    _realtimeNimChannel = db
      .channel('riwayat-realtime-' + nim)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pesanan', filter: `nim=eq.${nim}` },
        async () => {
          // Ambil ulang semua data NIM ini
          const { data: fresh } = await db
            .from('pesanan')
            .select('*')
            .eq('nim', nim)
            .order('created_at', { ascending: false });

          if (fresh) {
            currentData = fresh;
            const listEl = document.getElementById('riwayatList');
            if (listEl) listEl.innerHTML = renderRiwayatList(currentData);
            showToast('Riwayat pesanan diperbarui!');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pesanan', filter: `nim=eq.${nim}` },
        async () => {
          const { data: fresh } = await db
            .from('pesanan')
            .select('*')
            .eq('nim', nim)
            .order('created_at', { ascending: false });

          if (fresh) {
            currentData = fresh;
            const listEl = document.getElementById('riwayatList');
            if (listEl) listEl.innerHTML = renderRiwayatList(currentData);
            showToast('Pesanan baru ditambahkan!');
          }
        }
      )
      .subscribe();

  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="alert alert-error">Terjadi kesalahan koneksi. Periksa pengaturan Supabase di config.js.</div>';
  }
}

function toggleHistoryDetail(idx) {
  const el = document.getElementById('histDetail_' + idx);
  if (!el) return;
  el.classList.toggle('open');
}

// Enter key shortcuts
const inputOrderId = document.getElementById('inputOrderId');
if (inputOrderId) {
  inputOrderId.addEventListener('keydown', (e) => { if (e.key === 'Enter') lacakPesanan(); });
}

const inputNim = document.getElementById('inputNim');
if (inputNim) {
  inputNim.addEventListener('keydown', (e) => { if (e.key === 'Enter') cariRiwayat(); });
}

// Hentikan channel saat halaman ditutup
window.addEventListener('beforeunload', () => {
  if (_realtimeChannel) db.removeChannel(_realtimeChannel);
  if (_realtimeNimChannel) db.removeChannel(_realtimeNimChannel);
});

// ============================================================
//  PERLINDUNGAN GALERI — Watermark + Blokir Download
// ============================================================

(function initGalleryProtection() {
  // Hanya jalankan di halaman yang ada galeri
  if (!document.querySelector('.gallery-track')) return;

  // ---------- 1. Blokir klik kanan di seluruh galeri ----------
  document.querySelector('.gallery-track').addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // ---------- 2. Blokir drag gambar ----------
  document.querySelector('.gallery-track').addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  // ---------- 3. Blokir Ctrl+S / Ctrl+U / PrintScreen ----------
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'u' || e.key === 'p')) {
      e.preventDefault();
    }
  });

  // ---------- 4. Gambar watermark ke canvas ----------
  document.querySelectorAll('.map-canvas[data-src]').forEach(canvas => {
    const src = canvas.getAttribute('data-src');
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width  = img.naturalWidth  || 520;
      canvas.height = img.naturalHeight || 360;

      const ctx = canvas.getContext('2d');

      // Gambar foto asli
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Overlay watermark jaring
      drawWatermark(ctx, canvas.width, canvas.height);

      canvas.classList.add('loaded');
    };

    img.onerror = () => {
      // Foto belum ada — biarkan placeholder tetap tampil
    };

    img.src = src;
  });
})();

// ---------- Fungsi Watermark Jaring Mo-PETA ----------
function drawWatermark(ctx, w, h) {
  const text     = '🗺 Mo-PETA';
  const fontSize = Math.max(13, Math.round(w / 18));
  const spacing  = Math.round(fontSize * 5.5);
  const angle    = -35 * (Math.PI / 180);

  ctx.save();

  // Garis jaring diagonal tipis
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth   = 0.8;
  const diagStep  = spacing * 0.85;

  for (let d = -h; d < w + h; d += diagStep) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d - h, h);
    ctx.stroke();
  }
  for (let d = -h; d < w + h; d += diagStep) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + h, h);
    ctx.stroke();
  }

  // Teks "Mo-PETA" diagonal berulang
  ctx.font        = `bold ${fontSize}px 'Segoe UI', sans-serif`;
  ctx.fillStyle   = 'rgba(255, 255, 255, 0.30)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur  = 3;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  const cols = Math.ceil(w / spacing) + 3;
  const rows = Math.ceil(h / spacing) + 3;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * spacing + (row % 2 === 0 ? 0 : spacing / 2);
      const y = row * spacing;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}
