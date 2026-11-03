/* Admin: login password (hash PBKDF2) + saklar maintenance lewat status.json di repo GitHub. */

// Hanya hash yang disimpan di sini; password aslinya tidak ada di repo.
const PW = { salt: 'f7091e5c55031e4ca31d4531cbdc6274', hash: 'cacebd05f03e4ed8ecbeb7b89ba736a23603b95f84f2669ab0e537115c0d8514', iter: 310000 };
const LS_TOKEN = 'litrev.ghToken';
const SS_SESSION = 'litrev.adminSession';
const BYPASS_MS = 12 * 3600 * 1000;

let liveSha = null;
let watchTimer = null;

/* ======================= util ======================= */

const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

async function checkPassword(pw) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(PW.salt), iterations: PW.iter, hash: 'SHA-256' }, key, 256);
  return hex(bits) === PW.hash;
}

function repoSlug() {
  const h = location.hostname;
  if (h.endsWith('.github.io')) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    if (repo && !/\.html?$/.test(repo)) return h.split('.')[0] + '/' + repo;
  }
  return 'LordJunedGanteng/literature-chat';
}

const b64encode = (str) => { let s = ''; for (const b of new TextEncoder().encode(str)) s += String.fromCharCode(b); return btoa(s); };
const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }

function gh(path, opts) {
  const token = getToken();
  return fetch('https://api.github.com' + path, {
    ...(opts || {}),
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...((opts && opts.headers) || {})
    }
  });
}

// datetime-local <-> ISO
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

/* ======================= status ======================= */

// Baca status terbaru: lewat API (langsung dari repo) kalau ada token, kalau tidak dari file di Pages.
async function readLiveStatus() {
  if (getToken()) {
    const r = await gh('/repos/' + repoSlug() + '/contents/status.json?ref=main');
    if (r.ok) { const j = await r.json(); liveSha = j.sha; return JSON.parse(b64decode(j.content)); }
    if (r.status !== 404) throw new Error('GitHub ' + r.status);
  }
  return fetchStatus();
}

function formState() {
  return {
    maintenance: $('#mOn').checked,
    title: $('#mTitle').value.trim() || 'Lagi maintenance sebentar',
    message: $('#mMsg').value.trim(),
    until: fromLocalInput($('#mUntil').value),
    updated: new Date().toISOString()
  };
}

function setLivePill(on, text) {
  const p = $('#livePill');
  p.className = 'pill ' + (on ? 'on' : 'off');
  p.textContent = text || (on ? 'Maintenance aktif' : 'Normal');
}

function fillForm(s) {
  $('#mOn').checked = !!s.maintenance;
  $('#mTitle').value = s.title || 'Lagi maintenance sebentar';
  $('#mMsg').value = s.message || '';
  $('#mUntil').value = toLocalInput(s.until);
  updatePreview();
}

function updatePreview() { fillMaint($('#pv'), formState()); }

async function loadStatus() {
  $('#liveInfo').textContent = 'Memuat status…';
  try {
    const s = await readLiveStatus();
    fillForm(s);
    setLivePill(!!s.maintenance);
    $('#liveInfo').textContent = s.updated
      ? 'Terakhir diubah ' + new Date(s.updated).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Belum pernah diubah dari admin';
  } catch (e) {
    setLivePill(false, 'tidak terbaca');
    $('#liveInfo').textContent = 'Gagal baca status: ' + e.message;
  }
}

async function saveStatus() {
  if (!getToken()) { toast('Sambungin token GitHub dulu (panel kanan bawah)'); $('#tok').focus(); return; }
  const data = formState();
  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    // ambil sha terbaru biar ga bentrok
    const g = await gh('/repos/' + repoSlug() + '/contents/status.json?ref=main');
    if (g.ok) liveSha = (await g.json()).sha;
    else if (g.status === 404) liveSha = null;
    else throw new Error('GitHub ' + g.status);

    const r = await gh('/repos/' + repoSlug() + '/contents/status.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: data.maintenance ? 'Maintenance: aktif' : 'Maintenance: nonaktif',
        content: b64encode(JSON.stringify(data, null, 2) + '\n'),
        branch: 'main',
        ...(liveSha ? { sha: liveSha } : {})
      })
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((r.status === 401 || r.status === 403) ? 'token ditolak — cek izin Contents: Read and write' : (j.message || 'GitHub ' + r.status));
    }
    const j = await r.json();
    liveSha = j.content && j.content.sha;
    const link = j.commit && j.commit.html_url;
    $('#saveNote').innerHTML = 'Tersimpan' + (link ? ' (<a href="' + esc(link) + '" target="_blank" rel="noopener">lihat commit</a>)' : '')
      + '. Nunggu GitHub Pages build ulang… <span id="watchState"></span>';
    setLivePill(data.maintenance, 'nunggu build…');
    $('#liveInfo').textContent = 'Terakhir diubah barusan';
    toast(data.maintenance ? 'Maintenance diaktifkan' : 'Maintenance dimatikan');
    watchPages(data);
  } catch (e) {
    toast('Gagal simpan: ' + e.message);
    $('#saveNote').textContent = 'Gagal simpan: ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan & terapkan';
  }
}

// cek file status.json di Pages sampai sama dengan yang barusan disimpan
function watchPages(data) {
  clearInterval(watchTimer);
  let n = 0;
  watchTimer = setInterval(async () => {
    n++;
    try {
      const s = await fetchStatus();
      if (s.updated === data.updated) {
        clearInterval(watchTimer);
        setLivePill(!!s.maintenance);
        const w = document.getElementById('watchState');
        if (w) w.textContent = '✓ Udah berlaku di web.';
        return;
      }
    } catch (e) {}
    if (n >= 24) {
      clearInterval(watchTimer);
      const w = document.getElementById('watchState');
      if (w) w.textContent = 'Masih nunggu — cek lagi beberapa menit lagi.';
    }
  }, 10000);
}

/* ======================= token ======================= */

async function renderToken() {
  const has = !!getToken();
  $('#tokSetup').hidden = has;
  $('#tokActions').hidden = !has;
  if (!has) { $('#tokState').innerHTML = '<span class="pill on">Belum tersambung</span>'; return; }
  $('#tokState').innerHTML = '<span class="spin-txt muted">Ngecek token…</span>';
  try {
    const r = await gh('/repos/' + repoSlug());
    if (!r.ok) throw new Error(r.status === 401 ? 'token ga valid / kedaluwarsa' : r.status === 404 ? 'token ga punya akses ke repo ' + repoSlug() : 'GitHub ' + r.status);
    const j = await r.json();
    const canWrite = j.permissions && j.permissions.push;
    $('#tokState').innerHTML = canWrite
      ? '<span class="pill off">Tersambung</span><span class="muted">bisa ubah ' + esc(j.full_name) + '</span>'
      : '<span class="pill on">Cuma bisa baca</span><span class="muted">tambahin izin Contents: Read and write</span>';
  } catch (e) {
    $('#tokState').innerHTML = '<span class="pill on">Bermasalah</span><span class="muted">' + esc(e.message) + '</span>';
  }
}

/* ======================= login & init ======================= */

function showDash() {
  $('#login').hidden = true;
  $('#dash').hidden = false;
  $('#repoName').textContent = repoSlug().split('/')[1];
  $('#pvUrl').textContent = location.host + location.pathname.replace(/admin\.html$/, '');
  renderToken();
  loadStatus();
}

document.addEventListener('DOMContentLoaded', () => {
  let fails = 0;

  try {
    if (sessionStorage.getItem(SS_SESSION) === '1') { showDash(); }
  } catch (e) {}

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn');
    btn.disabled = true; btn.textContent = 'Ngecek…'; $('#loginErr').textContent = '';
    let ok = false;
    try { ok = await checkPassword($('#pw').value); } catch (err) { $('#loginErr').textContent = 'Browser ini ga dukung login aman (butuh https).'; }
    if (ok) {
      try {
        sessionStorage.setItem(SS_SESSION, '1');
        localStorage.setItem(ADMIN_BYPASS, String(Date.now() + BYPASS_MS));
      } catch (err) {}
      $('#pw').value = '';
      showDash();
    } else if (!$('#loginErr').textContent) {
      fails++;
      $('#loginErr').textContent = 'Password salah.';
      if (fails >= 5) { // jeda kecil biar ga ditebak beruntun
        btn.textContent = 'Tunggu 30 detik';
        setTimeout(() => { btn.disabled = false; btn.textContent = 'Masuk'; fails = 0; }, 30000);
        return;
      }
    }
    btn.disabled = false; btn.textContent = 'Masuk';
  });

  $('#logoutBtn').onclick = () => {
    try { sessionStorage.removeItem(SS_SESSION); localStorage.removeItem(ADMIN_BYPASS); } catch (e) {}
    location.reload();
  };

  ['mOn', 'mTitle', 'mMsg', 'mUntil'].forEach(id => $('#' + id).addEventListener('input', updatePreview));
  $('#saveBtn').onclick = saveStatus;
  $('#reloadBtn').onclick = loadStatus;

  $('#tokSave').onclick = () => {
    const t = $('#tok').value.trim();
    if (!t) { toast('Tempel tokennya dulu'); return; }
    try { localStorage.setItem(LS_TOKEN, t); } catch (e) {}
    $('#tok').value = '';
    renderToken(); loadStatus();
  };
  $('#tokTest').onclick = renderToken;
  $('#tokDel').onclick = () => {
    if (!confirm('Hapus token GitHub dari browser ini?')) return;
    try { localStorage.removeItem(LS_TOKEN); } catch (e) {}
    renderToken();
  };

  if (!$('#dash').hidden) return;
  $('#pw').focus();
});
