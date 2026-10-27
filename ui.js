/* UI chatbot: pesan -> parsing filter -> cari literatur -> kartu jurnal + riwayat. */

/* ======================= ikon ======================= */

const ICONS = {
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  chatq: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><circle cx="12" cy="12" r="3"/><path d="m14.2 14.2 1.8 1.8"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  sheet: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M8 13h2M14 13h2M8 17h2M14 17h2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M12 18v-6m-3 3 3-3 3 3"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  listplus: '<path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  quote: '<path d="M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4"/><path d="M19 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>'
};
const ico = (n) => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
function paintIcons(root) {
  (root || document).querySelectorAll('i[data-i]').forEach(el => { el.outerHTML = ico(el.dataset.i); });
}

/* ======================= state ======================= */

const LS_CHATS = 'litrev.chats.v1';
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
    ? { ...m, results: m.results.slice(0, 75).map(r => ({ ...r, abstract: (r.abstract || '').slice(0, 1500) })) }
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
  cur.msgs.push({ role: 'user', text, t: Date.now() });
  if (!cur.title) cur.title = text;
  commit(); renderChat();

  // perintah singkat
  if (/^(download|unduh|export|ekspor)\b/i.test(text)) {
    if (table.length) { exportXlsx(); botText('Siap — file <b>.xlsx</b> berisi ' + table.length + ' entri lagi di-download.'); }
    else botText('Tabel lo masih kosong. Cari literatur dulu, terus klik <b>+ Tabel</b> di kartunya.');
    return;
  }
  if (/^((buka|lihat|liat)\s+)?tabel$/i.test(text)) { botText('Oke, gua bukain tab Tabel.'); showView('tabel'); return; }
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
    cur.msgs.push({ role: 'bot', kind: 'results', q, opts, translated, total, results: items, page: 1, shown: 5, src, fellBack, t: Date.now() });
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
  const btn = document.querySelector('[data-more="' + mi + '"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; }
  try {
    const { items } = await fetchPage(m.q, { ...m.opts, src: m.src }, m.page + 1);
    const seen = new Set(m.results.map(keyOf));
    for (const r of items) if (!seen.has(keyOf(r))) { r.summary = autoSummary(r); m.results.push(r); }
    m.page += 1;
    m.shown = m.results.length;
  } catch (e) {
    toast('Gagal memuat: ' + e.message);
  } finally {
    busy = false; setBusy(false); commit(); renderChat(mi);
  }
}

function setBusy(on) { $('#sendBtn').disabled = on; }

/* ======================= render chat ======================= */

function cardHTML(r, mi, i) {
  const inT = new Set(table.map(keyOf)).has(keyOf(r));
  const who = r.authors.length
    ? esc(r.authors.slice(0, 3).map(a => (a.given ? a.given + ' ' : '') + a.family).join(', ')) + (r.authors.length > 3 ? ' dkk.' : '')
    : 'penulis tidak tercatat';
  const where = [r.container && '<em>' + esc(r.container) + '</em>', esc(r.year)].filter(Boolean).join(' · ');
  return '<div class="card">'
    + '<div class="n">' + (i + 1) + '</div>'
    + '<h4>' + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title || '(tanpa judul)') + '</a>' : esc(r.title || '(tanpa judul)')) + '</h4>'
    + '<div class="meta">' + who + (where ? ' — ' + where : '') + '</div>'
    + '<div class="row">'
      + (r.oa ? '<span class="tag g">open access</span>' : '')
      + '<span class="tag">' + r.citedBy + ' sitasi</span>'
      + (r.doi ? '<span class="tag">doi:' + esc(r.doi) + '</span>' : '')
    + '</div>'
    + (r.abstract ? '<p class="abs clamp" title="klik buat buka/tutup">' + esc(r.abstract) + '</p>' : '')
    + '<div class="cbtns">'
      + '<button class="pbtn ' + (inT ? 'done' : 'go') + '" data-add="' + mi + ':' + i + '"' + (inT ? ' disabled' : '') + '>'
        + ico(inT ? 'check' : 'plus') + (inT ? 'Di tabel' : 'Tabel') + '</button>'
      + '<button class="pbtn" data-cite="' + mi + ':' + i + '" title="Copy referensi lengkap">' + ico('quote') + 'Sitasi</button>'
      + '<button class="pbtn" data-intext="' + mi + ':' + i + '" title="Copy sitasi dalam teks">' + esc(inText(r)) + '</button>'
      + (r.url ? '<a class="pbtn" href="' + esc(r.url) + '" target="_blank" rel="noopener" style="text-decoration:none">' + ico('external') + 'Buka</a>' : '')
    + '</div></div>';
}

function botResultsHTML(m, mi) {
  const tags = filterTags(m.opts, m.src).map(t => '<span class="tag">' + esc(t) + '</span>');
  if (m.translated) tags.unshift('<span class="tag g" title="Diterjemahin dari: ' + esc(m.translated) + '">diterjemahin ke Inggris</span>');
  if (m.fellBack) tags.push('<span class="tag w">OpenAlex limit → Crossref</span>');

  if (!m.results.length) {
    return '<div class="bub">Ga nemu jurnal buat <b>“' + esc(m.q) + '”</b>. Coba kata kunci bahasa Inggris, lebih umum, atau longgarin filter tahun.'
      + '<div class="fl">' + tags.join('') + '</div>'
      + '<div class="sugg">' + SUGGEST.slice(0, 3).map(s => '<button data-say="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div></div>';
  }
  const shown = Math.min(m.shown || 5, m.results.length);
  let more = '';
  if (shown < m.results.length) more = '<button class="pbtn more" data-show="' + mi + '">Tampilkan ' + (m.results.length - shown) + ' lainnya</button>';
  else if (m.results.length < m.total) more = '<button class="pbtn more" data-more="' + mi + '">' + ico('refresh') + 'Muat 25 lagi</button>';

  return '<div class="bub">Nemu <b>' + m.total.toLocaleString('id-ID') + '</b> jurnal buat <b>“' + esc(m.q) + '”</b>. '
    + (shown < m.results.length ? 'Ini ' + shown + ' teratas:' : 'Ini ' + shown + ' hasilnya:')
    + '<div class="fl">' + tags.join('') + '</div></div>'
    + '<div class="cards">' + m.results.slice(0, shown).map((r, i) => cardHTML(r, mi, i)).join('') + '</div>'
    + more
    + '<div class="acts">'
      + '<button class="ib" data-addall="' + mi + '" title="Tambah semua hasil ke tabel">' + ico('listplus') + '</button>'
      + '<button class="ib" data-copyall="' + mi + '" title="Copy semua sitasi">' + ico('copy') + '</button>'
      + '<button class="ib" data-xlsx="' + mi + '" title="Download hasil ini sebagai .xlsx">' + ico('download') + '</button>'
      + (m.results.length < m.total ? '<button class="ib" data-more="' + mi + '" title="Muat 25 hasil lagi">' + ico('refresh') + '</button>' : '')
      + '<button class="ib" data-view="tabel" title="Buka tabel">' + ico('table') + '</button>'
    + '</div>';
}

function msgHTML(m, mi) {
  if (m.role === 'user') {
    return '<div class="m user"><div class="body"><div class="bub">' + esc(m.text) + '</div></div>'
      + '<div class="ava me">' + ico('user') + '</div></div>';
  }
  let inner = '';
  if (m.kind === 'results') inner = botResultsHTML(m, mi);
  else if (m.kind === 'error') inner = '<div class="bub">Gagal ngambil data: <span style="color:var(--warn)">' + esc(m.text) + '</span>. Cek koneksi atau coba lagi.</div>'
    + '<div class="acts"><button class="pbtn" data-say="' + esc(m.retry) + '">' + ico('refresh') + 'Coba lagi</button></div>';
  else inner = '<div class="bub">' + m.html
    + (m.sugg ? '<div class="sugg">' + m.sugg.map(s => '<button data-say="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' : '')
    + '</div>';
  return '<div class="m bot"><div class="ava"></div><div class="body">' + inner + '</div></div>';
}

function renderChat(focusMsg) {
  const box = $('#msgs');
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let html = '';
  if (!cur || !cur.msgs.length) {
    html = msgHTML({ role: 'bot', kind: 'text',
      html: 'Halo! Gua bantu nyari <b>studi literatur</b>. Ketik topik atau pertanyaan lo — hasilnya langsung bisa dimasukin ke tabel format xlsx lo (LINK, TAHUN, REFERENSI, RINGKASAN).',
      sugg: SUGGEST }, -1);
  } else {
    html = cur.msgs.map(msgHTML).join('');
  }
  if (typing) html += '<div class="m bot"><div class="ava"></div><div class="body"><div class="bub"><span class="dots"><i></i><i></i><i></i></span></div></div></div>';
  box.innerHTML = html;
  if (focusMsg == null || atBottom) box.scrollTop = box.scrollHeight;
}

/* ======================= riwayat ======================= */

function dayGroup(ts) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const diff = Math.floor((d0 - new Date(ts).setHours(0, 0, 0, 0)) / 864e5);
  if (diff <= 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  if (diff < 7) return diff + ' hari lalu';
  if (diff < 14) return 'Minggu lalu';
  return 'Lebih lama';
}

function renderHistory() {
  const box = $('#hlist');
  if (!chats.length) { box.innerHTML = '<div class="hempty">Belum ada riwayat. Pencarian lo bakal muncul di sini.</div>'; return; }
  let html = '', last = '';
  for (const c of chats) {
    const g = dayGroup(c.updated);
    if (g !== last) { html += '<div class="hgroup">' + g + '</div>'; last = g; }
    const n = c.msgs.filter(m => m.kind === 'results').length;
    const time = new Date(c.updated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    html += '<div class="hitem' + (cur && cur.id === c.id ? ' on' : '') + '" data-chat="' + c.id + '" role="button" tabindex="0">'
      + '<span class="hic">' + ico('chatq') + '</span>'
      + '<span class="ht"><div>' + esc(c.title || 'Chat baru') + '</div><small>' + n + ' pencarian · ' + time + '</small></span>'
      + '<button class="hdel" data-delchat="' + c.id + '" title="Hapus">' + ico('x') + '</button>'
      + '</div>';
  }
  box.innerHTML = html;
}

/* ======================= view & aksi ======================= */

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'view-' + v));
  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.closest('.pills') || el.closest('.rail')) el.classList.toggle('on', el.dataset.view === v);
  });
  if (v === 'tabel') renderTable();
  if (v === 'chat') renderChat();
}

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
  if ($('#src').value === 'crossref') t.push('Crossref');
  $('#chips').innerHTML = t.map(x => '<button type="button" class="tag g" data-openfilter>' + esc(x) + '</button>').join('');
}

function setTheme(t) {
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  $('#lightBtn').classList.toggle('on', t === 'light');
  $('#darkBtn').classList.toggle('on', t !== 'light');
  try { localStorage.setItem('litrev.theme', t); } catch (e) {}
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
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

/* ======================= init ======================= */

document.addEventListener('DOMContentLoaded', () => {
  paintIcons();
  loadTable(); loadChats();
  try { $('#apiKey').value = localStorage.getItem('litrev.key') || ''; } catch (e) {}
  let theme = 'dark';
  try { theme = localStorage.getItem('litrev.theme') || 'dark'; } catch (e) {}
  setTheme(theme);

  cur = chats[0] || null;
  if (!cur) startChat(); else { renderChat(); renderHistory(); }
  renderChips();

  // nav
  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (v && !v.closest('.msgs')) { showView(v.dataset.view); return; }
  });
  $('#lightBtn').onclick = () => setTheme('light');
  $('#darkBtn').onclick = () => setTheme('dark');

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
  $('#railFilter').onclick = () => { showView('chat'); togglePop(true); };
  $('#chips').addEventListener('click', (e) => { if (e.target.closest('[data-openfilter]')) togglePop(true); });
  ['y1', 'y2', 'sort', 'src', 'oaOnly', 'artOnly'].forEach(id => $('#' + id).addEventListener('change', renderChips));
  $('#apiKey').addEventListener('change', () => { try { localStorage.setItem('litrev.key', $('#apiKey').value.trim()); } catch (e) {} });
  document.addEventListener('mousedown', (e) => {
    if (!$('#pop').hidden && !e.target.closest('#pop') && !e.target.closest('#filterBtn') && !e.target.closest('#railFilter') && !e.target.closest('[data-openfilter]')) togglePop(false);
  });

  // impor
  const fileIn = document.createElement('input');
  fileIn.type = 'file'; fileIn.accept = '.xlsx'; fileIn.hidden = true;
  document.body.appendChild(fileIn);
  $('#importBtn').onclick = () => fileIn.click();
  fileIn.onchange = () => { if (fileIn.files[0]) importXlsx(fileIn.files[0]); fileIn.value = ''; };

  // chat baru / menu
  const fresh = () => { startChat(); showView('chat'); $('#history').classList.remove('open'); };
  $('#newChatBtn').onclick = fresh; $('#railNew').onclick = fresh; $('#menuBtn').onclick = fresh;
  $('#menuBtn').title = 'Chat baru';

  // riwayat
  $('#hlist').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delchat]');
    if (del) {
      e.stopPropagation();
      chats = chats.filter(c => c.id !== del.dataset.delchat);
      if (cur && cur.id === del.dataset.delchat) cur = chats[0] || null;
      saveChats();
      if (!cur) startChat(); else { renderChat(); renderHistory(); }
      return;
    }
    const it = e.target.closest('[data-chat]');
    if (it) {
      cur = chats.find(c => c.id === it.dataset.chat);
      renderChat(); renderHistory(); showView('chat');
      $('#history').classList.remove('open');
    }
  });
  $('#histBtn').onclick = () => $('#history').classList.toggle('open');
  $('#histClose').onclick = () => $('#history').classList.remove('open');

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
    if ((b = el('[data-show]'))) { const m = cur.msgs[+b.dataset.show]; m.shown = m.results.length; commit(); renderChat(+b.dataset.show); return; }
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
  $('#railXlsx').onclick = needRows(() => exportXlsx());
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
