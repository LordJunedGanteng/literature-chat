/* UI chatbot ala Gemini: pesan -> parsing filter -> cari literatur -> kartu jurnal + riwayat. */

/* ======================= ikon ======================= */

const ICONS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  attach: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  listplus: '<path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  quote: '<path d="M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4"/><path d="M19 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>'
};
const ico = (n) => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
const STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#sg)" d="M12 2C12 7.523 16.477 12 22 12C16.477 12 12 16.477 12 22C12 16.477 7.523 12 2 12C7.523 12 12 7.523 12 2Z"/></svg>';
function paintIcons(root) {
  (root || document).querySelectorAll('i[data-i]').forEach(el => { el.outerHTML = ico(el.dataset.i); });
}

/* ======================= state ======================= */

const LS_CHATS = 'litrev.chats.v1';
const MAX_ALL = 500;   // batas "Muat semua" biar browser & localStorage tetap enteng
let chats = [];        // [{id, title, created, updated, msgs:[]}]
let cur = null;        // chat aktif
let busy = false;
let typing = false;

function loadChats() {
  try { chats = JSON.parse(localStorage.getItem(LS_CHATS) || '[]') || []; } catch (e) { chats = []; }
}
function saveChats() {
  chats.sort((a, b) => b.updated - a.updated);
  chats = chats.slice(0, 40);
  // jaga ukuran localStorage: potong abstrak & jumlah hasil yang disimpan
  const slim = chats.map(c => ({ ...c, msgs: c.msgs.map(m => m.results
    ? { ...m, results: m.results.slice(0, MAX_ALL).map(r => ({ ...r, abstract: (r.abstract || '').slice(0, m.results.length > 75 ? 600 : 1500) })) }
    : m) }));
  try { localStorage.setItem(LS_CHATS, JSON.stringify(slim)); }
  catch (e) { try { localStorage.setItem(LS_CHATS, JSON.stringify(slim.slice(0, 10))); } catch (e2) {} }
}

function startChat() {
  cur = { id: newId(), title: '', created: Date.now(), updated: Date.now(), msgs: [] };
  renderChat(); renderHistory();
  $('#input').focus();
}

function commit() {
  cur.updated = Date.now();
  if (!chats.includes(cur)) chats.unshift(cur);
  saveChats(); renderHistory();
}

/* ======================= parsing pesan ======================= */

const ID_EN = [
  ['pelecehan seksual', 'sexual harassment'], ['kesetaraan gender', 'gender equality'],
  ['kesenjangan gender', 'gender gap'], ['kecerdasan buatan', 'artificial intelligence'],
  ['kesehatan mental', 'mental health'], ['industri kreatif', 'creative industries'],
  ['ekonomi kreatif', 'creative economy'], ['pekerja kreatif', 'creative workers'],
  ['kondisi kerja', 'working conditions'], ['ketidakpastian kerja', 'job insecurity'],
  ['budaya kerja', 'work culture'], ['lingkungan kerja', 'work environment'],
  ['kepuasan kerja', 'job satisfaction'], ['pekerja lepas', 'freelance workers'],
  ['tenaga kerja', 'workforce'], ['media sosial', 'social media'], ['perubahan iklim', 'climate change'],
  ['pendidikan tinggi', 'higher education'], ['sumber daya manusia', 'human resources'],
  ['ketenagakerjaan', 'employment'], ['animasi', 'animation'], ['industri', 'industry'],
  ['pekerja', 'workers'], ['perempuan', 'women'], ['wanita', 'women'], ['keberagaman', 'diversity'],
  ['inklusivitas', 'inclusivity'], ['inklusi', 'inclusion'], ['pendidikan', 'education'],
  ['mahasiswa', 'university students'], ['siswa', 'students'], ['guru', 'teachers'],
  ['kebijakan', 'policy'], ['ekonomi', 'economy'], ['budaya', 'culture'], ['upah', 'wages'],
  ['gaji', 'salary'], ['eksploitasi', 'exploitation'], ['kekerasan', 'violence'],
  ['diskriminasi', 'discrimination'], ['permainan', 'games'], ['seniman', 'artists'], ['seni', 'art'],
  ['desain', 'design'], ['teknologi', 'technology'], ['otomasi', 'automation'], ['kesehatan', 'health'],
  ['keuangan', 'finance'], ['pemasaran', 'marketing'], ['pariwisata', 'tourism'],
  ['keberlanjutan', 'sustainability'], ['lingkungan', 'environment'], ['dampak', 'impact'],
  ['pengaruh', 'effect'], ['strategi', 'strategy'], ['kepemimpinan', 'leadership'],
  ['motivasi', 'motivation'], ['kinerja', 'performance'], ['stres', 'stress'], ['jepang', 'Japan'],
  ['inggris', 'United Kingdom'], ['kreatif', 'creative'], ['anak', 'children'], ['remaja', 'adolescents'],
  ['pandemi', 'pandemic'], ['ketimpangan', 'inequality'], ['kemiskinan', 'poverty'],
  ['pertanian', 'agriculture'], ['pelecehan', 'harassment'], ['eksploitatif', 'exploitative']
].sort((a, b) => b[0].length - a[0].length);
const ID_GLUE = /\b(dan|serta|terhadap|pada|dalam|dengan|di|ke|oleh|bagi|antara)\b/gi;
const FILLER = /\b(tolong|dong|deh|ya|yg|yang|carikan|cariin|cari|carilah|aku|saya|gua|gue|gw|mau|ingin|pengen|butuh|minta|jurnal|jurnal2|artikel|paper|literatur|referensi|tentang|mengenai|soal|terkait|untuk|buat|bidang|sih|nih)\b/gi;

function parseMessage(text) {
  const o = currentDefaults();
  const year = new Date().getFullYear();
  let q = ' ' + text.replace(/[?!]+/g, ' ') + ' ';
  let m;
  const cut = (s) => { q = q.replace(s, ' '); };

  if ((m = q.match(/(\d{4})\s*(?:-|–|—|s\/d|sampai|hingga|to|until)\s*(\d{4})/i))) { o.y1 = m[1]; o.y2 = m[2]; cut(m[0]); }
  if ((m = q.match(/(\d+)\s*tahun\s*(?:terakhir|belakangan)|last\s*(\d+)\s*years/i))) { o.y1 = String(year - +(m[1] || m[2])); o.y2 = ''; cut(m[0]); }
  if ((m = q.match(/\b(?:dari|sejak|setelah|mulai|since|after|from)\s+(?:tahun\s+)?(\d{4})\b/i))) { o.y1 = m[1]; cut(m[0]); }
  if ((m = q.match(/\b(?:sebelum|before|until|sampai)\s+(?:tahun\s+)?(\d{4})\b/i))) { o.y2 = m[1]; cut(m[0]); }
  if ((m = q.match(/\b(?:tahun|year|in)\s+(\d{4})\b/i))) { o.y1 = o.y2 = m[1]; cut(m[0]); }
  if ((m = q.match(/\b(open[\s-]?access|gratis|free access|akses terbuka)\b/i))) { o.oaOnly = true; cut(m[0]); }
  if ((m = q.match(/\b(paling banyak disitasi|banyak disitasi|sitasi terbanyak|paling populer|populer|most cited|top cited|highly cited)\b/i))) { o.sort = 'cited'; cut(m[0]); }
  if ((m = q.match(/\b(terbaru|terkini|paling baru|newest|latest|most recent)\b/i))) { o.sort = 'newest'; cut(m[0]); }
  if ((m = q.match(/\b(?:pakai|pake|via|lewat|dari|from)\s+(crossref|openalex)\b/i))) { o.src = m[1].toLowerCase(); cut(m[0]); }

  q = q.replace(FILLER, ' ').replace(/[,;:.]+/g, ' ').replace(/\s+/g, ' ').trim();

  // terjemahin istilah Indonesia yang umum biar hasilnya lebih banyak
  let translated = null;
  const lower = q.toLowerCase();
  if (ID_EN.some(([id]) => new RegExp('\\b' + id + '\\b', 'i').test(lower))) {
    let t = q;
    for (const [id, en] of ID_EN) t = t.replace(new RegExp('\\b' + id + '\\b', 'gi'), en);
    t = t.replace(ID_GLUE, ' ').replace(/\s+/g, ' ').trim();
    if (t && t.toLowerCase() !== lower) { translated = q; q = t; }
  }
  return { q, opts: o, translated };
}

function currentDefaults() {
  return {
    y1: $('#y1').value.trim(), y2: $('#y2').value.trim(),
    sort: $('#sort').value, src: $('#src').value,
    oaOnly: $('#oaOnly').checked, artOnly: $('#artOnly').checked,
    apiKey: $('#apiKey').value.trim()
  };
}

function filterTags(o, src) {
  const t = [];
  if (o.y1 || o.y2) t.push((o.y1 || '…') + '–' + (o.y2 || 'sekarang'));
  if (o.oaOnly) t.push('open access');
  if (o.sort === 'cited') t.push('paling banyak disitasi');
  if (o.sort === 'newest') t.push('terbaru');
  if (!o.artOnly) t.push('semua tipe');
  if (src) t.push(src === 'crossref' ? 'Crossref' : 'OpenAlex');
  return t;
}

/* ======================= pencarian ======================= */

async function fetchPage(q, opts, page) {
  let src = opts.src;
  try {
    const out = await (src === 'crossref' ? searchCrossref : searchOpenAlex)(q, opts, page);
    return { ...out, src };
  } catch (err) {
    if (src !== 'openalex') throw err;
    const out = await searchCrossref(q, opts, page); // OpenAlex gagal/limit -> Crossref
    return { ...out, src: 'crossref', fellBack: true };
  }
}

const SUGGEST = [
  'precarity animation workers',
  'gender gap VFX industry 2018-2025',
  'generative AI creative work terbaru',
  'pelecehan seksual industri kreatif',
  'freelance animators Japan open access'
];

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  if (!cur) startChat();
  showView('chat');
  cur.msgs.push({ role: 'user', text, t: Date.now() });
  if (!cur.title) cur.title = text;
  commit(); renderChat();

  // perintah singkat
  if (/^(download|unduh|export|ekspor)\b/i.test(text)) {
    if (table.length) { exportXlsx(); botText('Siap — file <b>.xlsx</b> berisi ' + table.length + ' entri lagi di-download.'); }
    else botText('Tabel lo masih kosong. Cari literatur dulu, terus klik <b>+ Tabel</b> di kartunya.');
    return;
  }
  if (/^((buka|lihat|liat)\s+)?tabel$/i.test(text)) { botText('Oke, gua bukain Tabel xlsx.'); showView('tabel'); return; }
  if (/^(help|bantuan|cara pakai|gimana caranya)\??$/i.test(text)) {
    botText('Ketik aja topiknya, contoh: <b>gender gap VFX industry 2018-2025 open access</b>. Tahun, “open access”, “terbaru”, dan “paling banyak disitasi” langsung gua baca sebagai filter. Hasilnya bisa lo masukin ke tabel format xlsx lo.', SUGGEST.slice(0, 3));
    return;
  }
  if (/^(halo|hai|hi|hello|hey|p|pagi|siang|sore|malam)\b[\s!.]*$/i.test(text)) {
    botText('Halo! Mau cari literatur tentang apa?', SUGGEST.slice(0, 4)); return;
  }

  const { q, opts, translated } = parseMessage(text);
  if (!q) { botText('Topiknya apa nih? Contoh: <b>creative labour precarity 2015-2025</b>.', SUGGEST.slice(0, 3)); return; }

  busy = true; typing = true; renderChat(); setBusy(true);
  try {
    const { total, items, src, fellBack } = await fetchPage(q, opts, 1);
    for (const r of items) if (!r.summary) r.summary = autoSummary(r);
    cur.msgs.push({ role: 'bot', kind: 'results', q, opts, translated, total, results: items, page: 1, src, fellBack, t: Date.now() });
  } catch (e) {
    cur.msgs.push({ role: 'bot', kind: 'error', text: e.message, retry: text, t: Date.now() });
  } finally {
    busy = false; typing = false; setBusy(false);
    commit(); renderChat();
  }
}

function botText(html, suggestions) {
  cur.msgs.push({ role: 'bot', kind: 'text', html, sugg: suggestions || null, t: Date.now() });
  commit(); renderChat();
}

async function loadMore(mi) {
  const m = cur.msgs[mi];
  if (!m || busy) return;
  busy = true; setBusy(true);
  const btn = document.querySelector('.more[data-more="' + mi + '"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Memuat…'; }
  try {
    const { items } = await fetchPage(m.q, { ...m.opts, src: m.src }, m.page + 1);
    const seen = new Set(m.results.map(keyOf));
    for (const r of items) if (!seen.has(keyOf(r))) { r.summary = autoSummary(r); m.results.push(r); }
    m.page += 1;
  } catch (e) {
    toast('Gagal memuat: ' + e.message);
  } finally {
    busy = false; setBusy(false); commit(); renderChat(mi);
  }
}

async function loadAll(mi) {
  const m = cur.msgs[mi];
  if (!m || busy) return;
  const want = Math.min(m.total, MAX_ALL);
  busy = true; setBusy(true);
  const btns = document.querySelectorAll('[data-all="' + mi + '"], .more[data-more="' + mi + '"]');
  btns.forEach(b => { b.disabled = true; });
  const label = document.querySelector('.more[data-all="' + mi + '"]');
  try {
    const size = 200; // per halaman maksimal OpenAlex
    const seen = new Set(m.results.map(keyOf));
    for (let pg = 1; (pg - 1) * size < want; pg++) {
      if (label) label.textContent = 'Memuat ' + Math.min(pg * size, want) + ' / ' + want + '…';
      const { items } = await fetchPage(m.q, { ...m.opts, src: m.src, size }, pg);
      for (const r of items) if (!seen.has(keyOf(r))) { seen.add(keyOf(r)); r.summary = autoSummary(r); m.results.push(r); }
      if (items.length < size) break;
    }
    m.results = m.results.slice(0, want);
    m.page = Math.ceil(m.results.length / 25);
  } catch (e) {
    toast('Gagal memuat: ' + e.message);
  } finally {
    busy = false; setBusy(false); commit(); renderChat(mi);
  }
}

function setBusy(on) { $('#sendBtn').disabled = on || !$('#input').value.trim(); }

/* ======================= render chat ======================= */

function cardHTML(r, mi, i) {
  const inT = new Set(table.map(keyOf)).has(keyOf(r));
  const who = r.authors.length
    ? esc(r.authors.slice(0, 3).map(a => (a.given ? a.given + ' ' : '') + a.family).join(', ')) + (r.authors.length > 3 ? ' dkk.' : '')
    : 'penulis tidak tercatat';
  const where = [r.container && '<em>' + esc(r.container) + '</em>', esc(r.year)].filter(Boolean).join(' · ');
  const title = esc(r.title || '(tanpa judul)');
  return '<div class="card">'
    + '<h4><span class="num">' + (i + 1) + '.</span>' + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + title + '</a>' : title) + '</h4>'
    + '<div class="meta">' + who + (where ? ' — ' + where : '') + '</div>'
    + '<div class="row">'
      + (r.oa ? '<span class="tag g">open access</span>' : '')
      + '<span class="tag">' + r.citedBy + ' sitasi</span>'
      + (r.doi ? '<span class="tag">doi:' + esc(r.doi) + '</span>' : '')
    + '</div>'
    + (r.abstract ? '<p class="abs clamp" title="klik buat buka/tutup">' + esc(r.abstract) + '</p>' : '')
    + '<div class="cbtns">'
      + '<button class="pbtn ' + (inT ? 'done' : 'tonal') + '" data-add="' + mi + ':' + i + '"' + (inT ? ' disabled' : '') + '>'
        + ico(inT ? 'check' : 'plus') + (inT ? 'Di tabel' : 'Tabel') + '</button>'
      + '<button class="pbtn" data-cite="' + mi + ':' + i + '" title="Copy referensi lengkap">' + ico('quote') + 'Sitasi</button>'
      + '<button class="pbtn" data-intext="' + mi + ':' + i + '" title="Copy sitasi dalam teks">' + esc(inText(r)) + '</button>'
      + (r.url ? '<a class="pbtn" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ico('external') + 'Buka</a>' : '')
    + '</div></div>';
}

function suggHTML(list) {
  return '<div class="sugg">' + list.map(s => '<button data-say="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>';
}

function botResultsHTML(m, mi) {
  const tags = filterTags(m.opts, m.src).map(t => '<span class="tag">' + esc(t) + '</span>');
  if (m.translated) tags.unshift('<span class="tag g" title="Diterjemahin dari: ' + esc(m.translated) + '">diterjemahin ke Inggris</span>');
  if (m.fellBack) tags.push('<span class="tag w">OpenAlex limit → Crossref</span>');

  if (!m.results.length) {
    return 'Ga nemu jurnal buat <b>“' + esc(m.q) + '”</b>. Coba kata kunci bahasa Inggris, lebih umum, atau longgarin filter tahun.'
      + '<div class="ftags">' + tags.join('') + '</div>' + suggHTML(SUGGEST.slice(0, 3));
  }
  const n = m.results.length;
  const totalTxt = m.total.toLocaleString('id-ID');
  const canMore = n < m.total && n < MAX_ALL;
  let more = '';
  if (canMore) {
    const all = Math.min(m.total, MAX_ALL);
    more = '<div class="morebar">'
      + '<span class="muted">Ditampilkan ' + n + ' dari ' + totalTxt + '</span>'
      + '<button class="pbtn more" data-more="' + mi + '">' + ico('plus') + 'Muat 25 lagi</button>'
      + '<button class="pbtn tonal more" data-all="' + mi + '">' + ico('download') + (all < m.total ? 'Muat ' + all + ' teratas' : 'Muat semua (' + all + ')') + '</button>'
      + '</div>';
  } else if (n < m.total) {
    more = '<div class="morebar"><span class="muted">Ditampilkan ' + n + ' dari ' + totalTxt
      + '. Batas tampilan ' + MAX_ALL + ' — persempit kata kunci atau filter tahun buat sisanya.</span></div>';
  }

  return 'Nemu <b>' + totalTxt + '</b> jurnal buat <b>“' + esc(m.q) + '”</b>. '
    + (n < m.total ? 'Ditampilkan <b>' + n + '</b> teratas (urut ' + (m.opts.sort === 'cited' ? 'sitasi' : m.opts.sort === 'newest' ? 'terbaru' : 'relevansi') + '):' : 'Semua ' + n + ' ditampilkan:')
    + '<div class="ftags">' + tags.join('') + '</div>'
    + '<div class="cards">' + m.results.map((r, i) => cardHTML(r, mi, i)).join('') + '</div>'
    + more
    + '<div class="acts">'
      + '<button class="ib" data-addall="' + mi + '" title="Tambah semua hasil ke tabel">' + ico('listplus') + '</button>'
      + '<button class="ib" data-copyall="' + mi + '" title="Copy semua sitasi">' + ico('copy') + '</button>'
      + '<button class="ib" data-xlsx="' + mi + '" title="Download hasil ini sebagai .xlsx">' + ico('download') + '</button>'
      + '<button class="ib" data-view="tabel" title="Buka tabel">' + ico('table') + '</button>'
    + '</div>';
}

function msgHTML(m, mi) {
  if (m.role === 'user') return '<div class="m user"><div class="ubub">' + esc(m.text) + '</div></div>';
  let inner;
  if (m.kind === 'results') inner = botResultsHTML(m, mi);
  else if (m.kind === 'error') inner = 'Gagal ngambil data: <span style="color:var(--warn)">' + esc(m.text) + '</span>. Cek koneksi atau coba lagi.'
    + '<div class="acts" style="margin-left:0"><button class="pbtn" data-say="' + esc(m.retry) + '">' + ico('refresh') + 'Coba lagi</button></div>';
  else inner = m.html + (m.sugg ? suggHTML(m.sugg) : '');
  return '<div class="m bot">' + STAR + '<div class="txt">' + inner + '</div></div>';
}

function renderChat(focusMsg) {
  const view = $('#view-chat');
  const empty = (!cur || !cur.msgs.length) && !typing;
  view.classList.toggle('empty', empty);
  if (empty) { $('#msgs').innerHTML = ''; return; }

  const sc = $('#scroll');
  const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120;
  let html = cur.msgs.map(msgHTML).join('');
  if (typing) html += '<div class="m bot thinking">' + STAR + '<div class="shimmer"><i></i><i></i><i></i></div></div>';
  $('#msgs').innerHTML = html;
  if (focusMsg == null || atBottom) sc.scrollTop = sc.scrollHeight;
}

/* ======================= riwayat (sidebar) ======================= */

function renderHistory() {
  const box = $('#hlist');
  if (!chats.length) { box.innerHTML = '<div class="hempty">Belum ada riwayat.</div>'; return; }
  box.innerHTML = chats.map(c => '<div class="hitem' + (cur && cur.id === c.id ? ' on' : '') + '">'
    + '<button class="ht" data-chat="' + c.id + '" title="' + esc(c.title || 'Chat baru') + '">' + esc(c.title || 'Chat baru') + '</button>'
    + '<button class="ib sm hdel" data-delchat="' + c.id + '" title="Hapus">' + ico('trash') + '</button>'
    + '</div>').join('');
}

/* ======================= view & aksi ======================= */

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'view-' + v));
  document.querySelectorAll('.side [data-view]').forEach(el => el.classList.toggle('on', el.dataset.view === v));
  if (v === 'tabel') renderTable();
  if (v === 'chat') renderChat();
  closeMobileSide();
}

function closeMobileSide() { $('#app').classList.remove('mopen'); }
const isMobile = () => matchMedia('(max-width: 860px)').matches;

function exportXlsx(rows) {
  const matrix = rows ? matrixFrom(rows) : exportMatrix();
  download('Literature Review ' + new Date().toISOString().slice(0, 10) + '.xlsx', '', buildXlsx(matrix, 'Sheet1'));
}

function matrixFrom(recs) {
  const style = $('#style').value;
  return [COLS].concat(recs.map((r, i) => [String(i + 1), r.url || doiLink(r), r.year || '', citation(r, style), r.summary || '']));
}

function pick(attr) {
  const [mi, i] = attr.split(':').map(Number);
  const m = cur.msgs[mi];
  return m && m.results ? m.results[i] : null;
}

function renderChips() {
  const t = filterTags(currentDefaults(), null);
  $('#chips').innerHTML = t.map(x => '<button type="button" class="tag g" data-openfilter>' + esc(x) + '</button>').join('');
  $('#srcPill').textContent = $('#src').value === 'crossref' ? 'Crossref' : 'OpenAlex';
}

function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const btn = $('#themeBtn');
  btn.querySelector('svg').outerHTML = ico(dark ? 'sun' : 'moon');
  $('#themeLbl').textContent = dark ? 'Tema terang' : 'Tema gelap';
  btn.dataset.next = dark ? 'light' : 'dark';
}

/* ---------- impor xlsx lama (baca zip + XML di browser) ---------- */

async function unzipEntries(buf) {
  const dv = new DataView(buf.buffer);
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('bukan file .xlsx');
  const count = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const dec = new TextDecoder();
  const out = {};
  for (let k = 0; k < count; k++) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (!/^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(name)) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = buf.subarray(start, start + size);
    if (method === 0) out[name] = dec.decode(data);
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out[name] = await new Response(stream).text();
    }
  }
  return out;
}

async function readXlsxRows(file) {
  const files = await unzipEntries(new Uint8Array(await file.arrayBuffer()));
  const parser = new DOMParser();
  const shared = [];
  if (files['xl/sharedStrings.xml']) {
    const d = parser.parseFromString(files['xl/sharedStrings.xml'], 'application/xml');
    for (const si of d.getElementsByTagName('si')) shared.push([...si.getElementsByTagName('t')].map(t => t.textContent).join(''));
  }
  const sheetName = Object.keys(files).filter(n => n.includes('worksheets')).sort()[0];
  if (!sheetName) throw new Error('sheet tidak ditemukan');
  const d = parser.parseFromString(files[sheetName], 'application/xml');
  const rows = [];
  for (const row of d.getElementsByTagName('row')) {
    const cells = [];
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || '';
      const col = ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const t = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0];
      let val = '';
      if (t === 's' && v) val = shared[+v.textContent] || '';
      else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map(x => x.textContent).join('');
      else if (v) val = v.textContent;
      cells[col >= 0 ? col : cells.length] = val;
    }
    rows.push(cells);
  }
  return rows;
}

async function importXlsx(file) {
  try {
    const rows = await readXlsxRows(file);
    const hi = rows.findIndex(r => r && r.some(c => /^(LINK|REFERENSI)$/i.test(String(c || '').trim())));
    if (hi < 0) throw new Error('ga nemu header LINK / REFERENSI');
    const head = rows[hi].map(c => String(c || '').trim().toUpperCase());
    const col = (name) => head.indexOf(name);
    const cL = col('LINK'), cT = col('TAHUN'), cR = col('REFERENSI'), cS = col('RINGKASAN');
    let n = 0;
    for (const r of rows.slice(hi + 1)) {
      if (!r) continue;
      const link = String(r[cL] || '').trim(), ref = String(r[cR] || '').replace(/\s*\n\s*/g, ' ').trim();
      if (!link && !ref) continue;
      const y = String(r[cT] || '').replace(/\.0$/, '').trim();
      const rec = { id: newId(), title: '', authors: [], year: /^\d{4}$/.test(y) ? y : '', container: '', publisher: '',
        volume: '', issue: '', pages: '', doi: '', url: link, type: '', oa: false, citedBy: 0, abstract: '',
        summary: String(r[cS] || '').trim(), rawRef: ref || link };
      if (addToTable(rec)) n++;
    }
    saveTable();
    if (!cur) startChat();
    showView('chat');
    botText('Gua impor <b>' + n + '</b> entri dari <b>' + esc(file.name) + '</b> ke tabel. Hasil pencarian baru bakal nyambung di bawahnya.');
  } catch (e) {
    toast('Gagal impor: ' + e.message);
  }
}

/* ---------- voice input ---------- */

let rec = null;
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Browser ini belum dukung voice input (coba Chrome/Edge)'); return; }
  if (rec) { rec.stop(); return; }
  rec = new SR();
  rec.lang = 'id-ID'; rec.interimResults = true;
  const base = $('#input').value ? $('#input').value + ' ' : '';
  rec.onresult = (e) => {
    $('#input').value = base + [...e.results].map(r => r[0].transcript).join('');
    autosize();
  };
  rec.onerror = (e) => toast('Mic error: ' + e.error);
  rec.onend = () => { rec = null; $('#micBtn').classList.remove('rec'); };
  rec.start();
  $('#micBtn').classList.add('rec');
}

function autosize() {
  const ta = $('#input');
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  setBusy(busy);
}

/* ---------- mode maintenance ---------- */

async function checkMaintenance() {
  let s = null;
  try { s = await fetchStatus(); } catch (e) { /* offline / file belum ada: anggap normal */ }
  const on = !!(s && s.maintenance);
  const admin = isAdminBypass();
  if (on) fillMaint($('#maint'), s);
  $('#maint').hidden = !on || admin;
  $('#adminBar').hidden = !(on && admin);
  document.documentElement.classList.remove('boot');
}

/* ======================= init ======================= */

document.addEventListener('DOMContentLoaded', () => {
  // cek maintenance dulu; kalau status lambat, jangan tahan halaman lebih dari 2,5 detik
  checkMaintenance();
  setTimeout(() => document.documentElement.classList.remove('boot'), 2500);
  setInterval(checkMaintenance, 60000);
  window.addEventListener('focus', checkMaintenance);

  paintIcons();
  loadTable(); loadChats();
  try { $('#apiKey').value = localStorage.getItem('litrev.key') || ''; } catch (e) {}
  let theme = '';
  try { theme = localStorage.getItem('litrev.theme2') || ''; } catch (e) {}
  applyTheme(theme);
  try { if (localStorage.getItem('litrev.side') === 'collapsed') $('#app').classList.add('collapsed'); } catch (e) {}

  $('#heroSugg').innerHTML = SUGGEST.slice(0, 4).map(s => '<button data-say="' + esc(s) + '">' + esc(s) + '</button>').join('');
  cur = null;
  startChat();
  renderChips();

  // sidebar
  $('#menuBtn').onclick = () => {
    if (isMobile()) { closeMobileSide(); return; }
    const app = $('#app');
    app.classList.toggle('collapsed');
    try { localStorage.setItem('litrev.side', app.classList.contains('collapsed') ? 'collapsed' : ''); } catch (e) {}
  };
  $('#menuBtn2').onclick = () => $('#app').classList.add('mopen');
  $('#scrim').onclick = closeMobileSide;
  document.querySelectorAll('.side [data-view]').forEach(b => { b.onclick = () => showView(b.dataset.view); });
  $('#newChatBtn').onclick = () => { startChat(); showView('chat'); };
  $('#themeBtn').onclick = () => {
    const next = $('#themeBtn').dataset.next;
    try { localStorage.setItem('litrev.theme2', next); } catch (e) {}
    applyTheme(next);
  };

  $('#hlist').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delchat]');
    if (del) {
      chats = chats.filter(c => c.id !== del.dataset.delchat);
      saveChats();
      if (cur && cur.id === del.dataset.delchat) startChat(); else renderHistory();
      return;
    }
    const it = e.target.closest('[data-chat]');
    if (it) {
      cur = chats.find(c => c.id === it.dataset.chat);
      renderHistory(); showView('chat');
    }
  });

  // composer
  const ta = $('#input');
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#composer').requestSubmit(); }
  });
  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = ta.value; if (!t.trim() || busy) return;
    ta.value = ''; autosize(); $('#pop').hidden = true;
    send(t);
  });
  $('#micBtn').onclick = toggleMic;

  // filter popover
  const togglePop = (force) => { const p = $('#pop'); p.hidden = force != null ? !force : !p.hidden; };
  $('#filterBtn').onclick = () => togglePop();
  $('#brandBtn').onclick = () => { showView('chat'); togglePop(true); };
  $('#chips').addEventListener('click', (e) => { if (e.target.closest('[data-openfilter]')) togglePop(true); });
  ['y1', 'y2', 'sort', 'src', 'oaOnly', 'artOnly'].forEach(id => $('#' + id).addEventListener('change', renderChips));
  $('#apiKey').addEventListener('change', () => { try { localStorage.setItem('litrev.key', $('#apiKey').value.trim()); } catch (e) {} });
  document.addEventListener('mousedown', (e) => {
    if (!$('#pop').hidden && !e.target.closest('#pop') && !e.target.closest('#filterBtn') && !e.target.closest('#brandBtn') && !e.target.closest('[data-openfilter]')) togglePop(false);
  });

  // impor
  const fileIn = document.createElement('input');
  fileIn.type = 'file'; fileIn.accept = '.xlsx'; fileIn.hidden = true;
  document.body.appendChild(fileIn);
  $('#importBtn').onclick = () => fileIn.click();
  fileIn.onchange = () => { if (fileIn.files[0]) importXlsx(fileIn.files[0]); fileIn.value = ''; };

  // saran di layar awal
  $('#heroSugg').addEventListener('click', (e) => { const b = e.target.closest('[data-say]'); if (b) send(b.dataset.say); });

  // klik di dalam percakapan
  $('#msgs').addEventListener('click', (e) => {
    const el = (s) => e.target.closest(s);
    let b;
    if ((b = el('.abs'))) { b.classList.toggle('clamp'); return; }
    if ((b = el('[data-say]'))) { send(b.dataset.say); return; }
    if ((b = el('[data-add]'))) {
      const r = pick(b.dataset.add);
      if (r && addToTable(r)) { saveTable(); b.outerHTML = '<button class="pbtn done" disabled>' + ico('check') + 'Di tabel</button>'; toast('Masuk tabel (' + table.length + ')'); }
      return;
    }
    if ((b = el('[data-cite]'))) { const r = pick(b.dataset.cite); if (r) copyText(citation(r, $('#style').value), 'Referensi tercopy'); return; }
    if ((b = el('[data-intext]'))) { const r = pick(b.dataset.intext); if (r) copyText(inText(r), 'Sitasi dalam teks tercopy'); return; }
    if ((b = el('[data-all]'))) { loadAll(+b.dataset.all); return; }
    if ((b = el('[data-more]'))) { loadMore(+b.dataset.more); return; }
    if ((b = el('[data-addall]'))) {
      const m = cur.msgs[+b.dataset.addall]; let n = 0;
      for (const r of m.results) if (addToTable(r)) n++;
      saveTable(); renderChat(+b.dataset.addall);
      toast(n ? n + ' jurnal masuk tabel' : 'Semua udah ada di tabel');
      return;
    }
    if ((b = el('[data-copyall]'))) {
      const m = cur.msgs[+b.dataset.copyall], st = $('#style').value;
      copyText(m.results.map(r => citation(r, st)).join('\n\n'), m.results.length + ' referensi tercopy');
      return;
    }
    if ((b = el('[data-xlsx]'))) { exportXlsx(cur.msgs[+b.dataset.xlsx].results); return; }
    if ((b = el('[data-view]'))) { showView(b.dataset.view); return; }
  });

  // tabel
  $('#tableWrap').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { table = table.filter(r => r.id !== del.dataset.del); saveTable(); renderTable(); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) editSummary(ed.dataset.edit);
  });
  $('#style').onchange = renderTable;
  $('#sortTable').onchange = renderTable;
  const needRows = (fn) => () => { if (!table.length) return toast('Tabel masih kosong'); fn(); };
  $('#xlsxBtn').onclick = needRows(() => exportXlsx());
  $('#topXlsx').onclick = needRows(() => exportXlsx());
  $('#csvBtn').onclick = needRows(() => download('literature-review.csv', 'text/csv;charset=utf-8', toCSV(exportMatrix())));
  $('#tsvBtn').onclick = needRows(() => copyText(toTSV(exportMatrix()), 'Tercopy — tinggal paste di Excel'));
  $('#docBtn').onclick = needRows(() => download('literature-review.doc', 'application/msword', toDoc(exportMatrix())));
  $('#copyBiblioBtn').onclick = needRows(() => {
    const st = $('#style').value, numbered = st === 'ieee' || st === 'vancouver';
    const rows = sortedTable();
    if (!numbered) rows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    copyText(rows.map((r, i) => (numbered ? '[' + (i + 1) + '] ' : '') + citation(r, st)).join('\n\n'), 'Daftar pustaka tercopy');
  });
  $('#clearBtn').onclick = () => {
    if (table.length && confirm('Hapus semua ' + table.length + ' entri dari tabel?')) { table = []; saveTable(); renderTable(); }
  };

  ta.focus();
});
