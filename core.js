/* Inti: sumber data (OpenAlex/Crossref), format sitasi, tabel format xlsx, export.
   lalu format otomatis ke kolom LINK / TAHUN / REFERENSI / RINGKASAN. */

const $ = (s) => document.querySelector(s);
const LS = 'litrev.table.v1';

let table = [];          // baris yang masuk tabel

/* ============================ util ============================ */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast(label || 'Tercopy');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast(label || 'Tercopy');
  }
}

function download(filename, mime, data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function saveTable() {
  try { localStorage.setItem(LS, JSON.stringify(table)); } catch (e) {}
  $('#cnt').textContent = table.length;
}

function loadTable() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) table = JSON.parse(raw) || [];
  } catch (e) { table = []; }
  $('#cnt').textContent = table.length;
}

/* ======================= metadata jadi record ======================= */

const keyOf = (r) => String(r.doi || r.title || r.url || r.id).toLowerCase();
const sortKey = (r) => (r.authors[0] && r.authors[0].family) || r.rawRef || r.title || '';

function newId() { return 'r' + Math.random().toString(36).slice(2, 9); }

function reconstructAbstract(inv) {
  if (!inv) return '';
  const pos = [];
  for (const [word, idxs] of Object.entries(inv)) for (const i of idxs) pos[i] = word;
  return pos.filter(Boolean).join(' ');
}

function decodeEntities(t) {
  const el = document.createElement('textarea');
  el.innerHTML = String(t || '');
  return el.value;
}

function cleanTitle(t) {
  return decodeEntities(String(t || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
}

function fromOpenAlex(w) {
  const loc = w.primary_location || {};
  const src = loc.source || {};
  const best = w.best_oa_location || {};
  const bib = w.biblio || {};
  return {
    id: newId(),
    title: cleanTitle(w.title || w.display_name),
    authors: (w.authorships || []).map(a => splitName(a.author && a.author.display_name)),
    year: w.publication_year ? String(w.publication_year) : '',
    container: src.display_name || (w.type === 'preprint' ? 'Preprint' : ''),
    publisher: src.host_organization_name || '',
    volume: bib.volume || '', issue: bib.issue || '',
    pages: bib.first_page ? (bib.last_page && bib.last_page !== bib.first_page ? bib.first_page + '-' + bib.last_page : bib.first_page) : '',
    doi: (w.doi || '').replace(/^https?:\/\/doi\.org\//, ''),
    url: best.pdf_url || loc.pdf_url || best.landing_page_url || loc.landing_page_url || (w.doi || ''),
    type: w.type || '',
    oa: !!(w.open_access && w.open_access.is_oa),
    citedBy: w.cited_by_count || 0,
    abstract: reconstructAbstract(w.abstract_inverted_index),
    summary: ''
  };
}

function fromCrossref(it) {
  const auth = (it.author || []).map(a => ({
    family: a.family || a.name || '', given: a.given || ''
  }));
  const dp = (it.issued && it.issued['date-parts'] && it.issued['date-parts'][0]) || [];
  return {
    id: newId(),
    title: cleanTitle(Array.isArray(it.title) ? it.title[0] : it.title),
    authors: auth,
    year: dp[0] ? String(dp[0]) : '',
    container: decodeEntities((Array.isArray(it['container-title']) ? it['container-title'][0] : it['container-title']) || ''),
    publisher: it.publisher || '',
    volume: it.volume || '', issue: it.issue || '', pages: it.page || '',
    doi: it.DOI || '',
    url: it.URL || (it.DOI ? 'https://doi.org/' + it.DOI : ''),
    type: it.type || '',
    oa: false,
    citedBy: it['is-referenced-by-count'] || 0,
    abstract: decodeEntities(String(it.abstract || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/^\s*Abstract[:.]?\s*/i, '').trim(),
    summary: ''
  };
}

function splitName(full) {
  const s = String(full || '').trim();
  if (!s) return { family: '', given: '' };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: '' };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

/* ======================= format sitasi ======================= */

const initials = (given) => String(given || '').split(/[\s.\-]+/).filter(Boolean)
  .map(w => w[0].toUpperCase() + '.').join(' ');

function authorsAPA(a) {
  if (!a || !a.length) return '';
  const names = a.map(x => x.family + (x.given ? ', ' + initials(x.given) : ''));
  if (names.length === 1) return names[0];
  if (names.length <= 20) return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
  return names.slice(0, 19).join(', ') + ', ... ' + names[names.length - 1];
}
function authorsIEEE(a) {
  if (!a || !a.length) return '';
  const names = a.map(x => (x.given ? initials(x.given) + ' ' : '') + x.family);
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}
function authorsMLA(a) {
  if (!a || !a.length) return '';
  const first = a[0].family + (a[0].given ? ', ' + a[0].given : '');
  if (a.length === 1) return first;
  if (a.length === 2) return first + ', and ' + (a[1].given ? a[1].given + ' ' : '') + a[1].family;
  return first + ', et al';
}
function authorsVancouver(a) {
  if (!a || !a.length) return '';
  const names = a.map(x => x.family + ' ' + String(x.given || '').split(/[\s.\-]+/).filter(Boolean).map(w => w[0].toUpperCase()).join(''));
  return (names.length > 6 ? names.slice(0, 6).join(', ') + ', et al' : names.join(', '));
}
function authorsHarvard(a) {
  if (!a || !a.length) return '';
  const names = a.map(x => x.family + (x.given ? ', ' + initials(x.given).replace(/ /g, '') : ''));
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function doiLink(r) { return r.doi ? 'https://doi.org/' + r.doi : (r.url || ''); }

function citation(r, style) {
  if (r.rawRef && !r.title) return r.rawRef; // entri dari file lama
  const y = r.year || 'n.d.';
  const t = r.title || '(tanpa judul)';
  const c = r.container || r.publisher || '';
  const v = r.volume, i = r.issue, p = r.pages;
  const link = doiLink(r);
  switch (style) {
    case 'ieee': {
      let s = '';
      if (r.authors.length) s += authorsIEEE(r.authors) + ', ';
      s += '"' + t + ',"';
      if (c) s += ' ' + c + ',';
      if (v) s += ' vol. ' + v + ',';
      if (i) s += ' no. ' + i + ',';
      if (p) s += ' pp. ' + p + ',';
      s += ' ' + y + '.';
      if (link) s += ' [Online]. Tersedia: ' + link;
      return s;
    }
    case 'mla': {
      let s = '';
      if (r.authors.length) s += authorsMLA(r.authors) + '. ';
      s += '"' + t + '." ';
      if (c) s += c + ', ';
      if (v) s += 'vol. ' + v + ', ';
      if (i) s += 'no. ' + i + ', ';
      s += y;
      if (p) s += ', pp. ' + p;
      s += '.';
      if (link) s += ' ' + link + '.';
      return s;
    }
    case 'harvard': {
      let s = '';
      if (r.authors.length) s += authorsHarvard(r.authors) + ' ';
      s += '(' + y + ') ';
      s += "'" + t + "'";
      if (c) s += ', ' + c;
      if (v) s += ', ' + v + (i ? '(' + i + ')' : '');
      if (p) s += ', pp. ' + p;
      s += '.';
      if (link) s += ' Tersedia di: ' + link;
      return s;
    }
    case 'vancouver': {
      let s = '';
      if (r.authors.length) s += authorsVancouver(r.authors) + '. ';
      s += t + '. ';
      if (c) s += c + '. ';
      s += y;
      if (v) s += ';' + v + (i ? '(' + i + ')' : '');
      if (p) s += ':' + p;
      s += '.';
      if (link) s += ' doi: ' + (r.doi || link);
      return s;
    }
    default: { // APA 7
      let s = '';
      if (r.authors.length) s += authorsAPA(r.authors) + ' ';
      s += '(' + y + '). ' + t + '.';
      if (c) s += ' ' + c;
      if (v) { s += ', ' + v; if (i) s += '(' + i + ')'; }
      if (p) s += ', ' + p;
      s += '.';
      if (link) s += ' ' + link;
      return s;
    }
  }
}

function inText(r) {
  const a = r.authors || [];
  const y = r.year || 'n.d.';
  if (!a.length) return '(' + (r.container || 'Anon.') + ', ' + y + ')';
  if (a.length === 1) return '(' + a[0].family + ', ' + y + ')';
  if (a.length === 2) return '(' + a[0].family + ' & ' + a[1].family + ', ' + y + ')';
  return '(' + a[0].family + ' et al., ' + y + ')';
}

/* ======================= ringkasan otomatis ======================= */

function sentences(text) {
  return String(text || '').replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z("'\d])/).map(s => s.trim()).filter(s => s.length > 25);
}

function autoSummary(r) {
  const abs = r.abstract || '';
  if (!abs) return '';
  const ss = sentences(abs);
  const pick = ss.length ? ss.slice(0, 3).join(' ') : abs.slice(0, 420);
  return 'Studi ' + inText(r) + ' berjudul "' + (r.title || '') + '". Inti abstrak: ' + pick;
}

/* ======================= pencarian ======================= */

async function searchOpenAlex(q, opts, pg, broad) {
  const filters = [];
  // default: cocokkan di judul+abstrak (presisi); "broad" = ikut full text, dipakai kalau hasilnya 0
  if (!broad) filters.push('title_and_abstract.search:' + encodeURIComponent(q.replace(/[,:|]/g, ' ')));
  if (opts.y1) filters.push('from_publication_date:' + opts.y1 + '-01-01');
  if (opts.y2) filters.push('to_publication_date:' + opts.y2 + '-12-31');
  if (opts.oaOnly) filters.push('is_oa:true');
  if (opts.artOnly) filters.push('type:article');
  const sort = opts.sort === 'cited' ? 'cited_by_count:desc'
    : opts.sort === 'newest' ? 'publication_date:desc' : 'relevance_score:desc';
  const url = 'https://api.openalex.org/works?per-page=25&page=' + pg + '&sort=' + sort
    + (broad ? '&search=' + encodeURIComponent(q) : '')
    + (filters.length ? '&filter=' + filters.join(',') : '')
    + (opts.apiKey ? '&api_key=' + encodeURIComponent(opts.apiKey) : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('OpenAlex error ' + res.status + (res.status === 429 ? ' (kuota gratis harian habis)' : ''));
  const j = await res.json();
  const total = (j.meta && j.meta.count) || 0;
  if (!total && !broad) return searchOpenAlex(q, opts, pg, true);
  return { total, items: (j.results || []).map(fromOpenAlex), broad: !!broad };
}

async function searchCrossref(q, opts, pg) {
  const filters = [];
  if (opts.y1) filters.push('from-pub-date:' + opts.y1 + '-01-01');
  if (opts.y2) filters.push('until-pub-date:' + opts.y2 + '-12-31');
  if (opts.artOnly) filters.push('type:journal-article');
  if (opts.oaOnly) filters.push('has-full-text:true');
  // Crossref kalau diurutkan by sitasi/tanggal jadi ga relevan, jadi ambil yang paling relevan lalu urutkan di sini
  const url = 'https://api.crossref.org/works?query.bibliographic=' + encodeURIComponent(q)
    + '&rows=25&offset=' + ((pg - 1) * 25) + '&sort=relevance'
    + (filters.length ? '&filter=' + filters.join(',') : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Crossref error ' + res.status);
  const j = await res.json();
  const m = j.message || {};
  const items = (m.items || []).map(fromCrossref);
  if (opts.sort === 'cited') items.sort((a, b) => b.citedBy - a.citedBy);
  if (opts.sort === 'newest') items.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
  return { total: m['total-results'] || 0, items };
}

/* ======================= tabel format xlsx ======================= */

const COLS = ['NO', 'LINK', 'TAHUN', 'REFERENSI', 'RINGKASAN'];

function sortedTable() {
  const mode = $('#sortTable').value;
  const rows = table.slice();
  if (mode === 'az') rows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  if (mode === 'year') rows.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
  return rows;
}

function tableRows() {
  const style = $('#style').value;
  return sortedTable().map((r, i) => ({
    rec: r,
    no: i + 1,
    link: r.url || doiLink(r),
    year: r.year || '',
    ref: citation(r, style),
    sum: r.summary || ''
  }));
}

function renderTable() {
  const rows = tableRows();
  const wrap = $('#tableWrap');
  if (!rows.length) {
    wrap.innerHTML = '<div class="empty"><h3>Tabel masih kosong</h3>'
      + '<p class="muted">Tanya topik di <b>Chat</b>, lalu klik “+ Tabel” di kartu jurnal.</p></div>';
  } else {
    wrap.innerHTML = '<table><thead><tr>'
      + COLS.map(c => '<th>' + c + '</th>').join('') + '<th></th></tr></thead><tbody>'
      + rows.map(row => '<tr>'
        + '<td class="num">' + row.no + '</td>'
        + '<td><a href="' + esc(row.link) + '" target="_blank" rel="noopener" style="word-break:break-all">'
          + esc(row.link.length > 48 ? row.link.slice(0, 48) + '…' : row.link) + '</a></td>'
        + '<td>' + esc(row.year) + '</td>'
        + '<td class="cellref">' + esc(row.ref) + '</td>'
        + '<td class="cellsum"><div class="trunc3" data-edit="' + row.rec.id + '" style="cursor:text">'
          + (row.sum ? esc(row.sum) : '<span class="muted">— klik untuk tulis ringkasan —</span>') + '</div></td>'
        + '<td><button class="btn sm danger" data-del="' + row.rec.id + '" title="Hapus baris">×</button></td>'
        + '</tr>').join('')
      + '</tbody></table>';
  }

  const withSum = table.filter(r => r.summary).length;
  const years = table.map(r => parseInt(r.year)).filter(Boolean);
  $('#tStats').innerHTML = [
    ['Entri', table.length],
    ['Ada ringkasan', withSum + '/' + table.length],
    ['Open access', table.filter(r => r.oa).length],
    ['Rentang tahun', years.length ? Math.min(...years) + '–' + Math.max(...years) : '—'],
    ['Total sitasi', table.reduce((s, r) => s + (r.citedBy || 0), 0)]
  ].map(([k, v]) => '<div class="stat"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>').join('');

  const style = $('#style').value;
  const numbered = (style === 'ieee' || style === 'vancouver');
  const biblio = sortedTable().slice();
  if (!numbered) biblio.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  $('#biblio').className = 'biblio' + (numbered ? ' numbered' : '');
  $('#biblio').innerHTML = biblio.length
    ? '<ol>' + biblio.map(r => '<li>' + esc(citation(r, style)) + '</li>').join('') + '</ol>'
    : '<p class="muted">Belum ada entri.</p>';
}

function addToTable(rec) {
  const key = keyOf(rec);
  if (table.some(r => keyOf(r) === key)) return false;
  table.push(JSON.parse(JSON.stringify(rec)));
  return true;
}

/* ======================= export ======================= */

function exportMatrix() {
  const rows = tableRows();
  return [COLS].concat(rows.map(r => [String(r.no), r.link, r.year, r.ref, r.sum]));
}

function toCSV(matrix) {
  return '﻿' + matrix.map(row => row.map(c => {
    const s = String(c == null ? '' : c);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
}

function toTSV(matrix) {
  return matrix.map(row => row.map(c => String(c == null ? '' : c)
    .replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t')).join('\n');
}

function toDoc(matrix) {
  const head = matrix[0], body = matrix.slice(1);
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
    + 'xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">'
    + '<style>body{font-family:Calibri,sans-serif;font-size:10pt}'
    + 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px;vertical-align:top;text-align:left}'
    + 'th{background:#eee}</style></head><body>'
    + '<h2>Literature Review Database</h2><table><tr>'
    + head.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>'
    + body.map(r => '<tr>' + r.map(c => '<td>' + esc(c).replace(/\n/g, '<br>') + '</td>').join('') + '</tr>').join('')
    + '</table></body></html>';
}

/* --- penulis .xlsx asli (zip stored + SpreadsheetML minimal) --- */

function crc32(bytes) {
  if (!crc32.t) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    crc32.t = t;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crc32.t[(crc ^ bytes[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipStore(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = new Uint8Array(30 + name.length);
    const d = new DataView(lh.buffer);
    d.setUint32(0, 0x04034b50, true);
    d.setUint16(4, 20, true); d.setUint16(6, 0, true); d.setUint16(8, 0, true);
    d.setUint16(10, 0, true); d.setUint16(12, 0x2821, true);
    d.setUint32(14, crc, true); d.setUint32(18, data.length, true); d.setUint32(22, data.length, true);
    d.setUint16(26, name.length, true); d.setUint16(28, 0, true);
    lh.set(name, 30);
    parts.push(lh, data);

    const ch = new Uint8Array(46 + name.length);
    const c = new DataView(ch.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true);
    c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x2821, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true);
    c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true);
    c.setUint32(42, offset, true);
    ch.set(name, 46);
    central.push(ch);
    offset += lh.length + data.length;
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const eocd = new Uint8Array(22);
  const e = new DataView(eocd.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(4, 0, true); e.setUint16(6, 0, true);
  e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  e.setUint16(20, 0, true);
  return new Blob([...parts, ...central, eocd], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function colLetter(n) { // 1 -> A
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1 - m) / 26; }
  return s;
}

function xmlText(s) {
  return String(s == null ? '' : s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildXlsx(matrix, sheetName) {
  const rowsXml = matrix.map((row, ri) => {
    const cells = row.map((val, ci) => {
      const ref = colLetter(ci + 1) + (ri + 1);
      const s = String(val == null ? '' : val);
      const isNum = ri > 0 && /^-?\d+(\.\d+)?$/.test(s) && s.length < 12;
      const styleAttr = ri === 0 ? ' s="1"' : ' s="2"';
      if (isNum) return '<c r="' + ref + '"' + styleAttr + '><v>' + s + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + styleAttr + '><is><t xml:space="preserve">' + xmlText(s) + '</t></is></c>';
    }).join('');
    return '<row r="' + (ri + 1) + '">' + cells + '</row>';
  }).join('');

  const widths = '<cols>'
    + '<col min="1" max="1" width="6" customWidth="1"/>'
    + '<col min="2" max="2" width="46" customWidth="1"/>'
    + '<col min="3" max="3" width="9" customWidth="1"/>'
    + '<col min="4" max="4" width="64" customWidth="1"/>'
    + '<col min="5" max="5" width="80" customWidth="1"/>'
    + '</cols>';

  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetPr><outlinePr/></sheetPr>'
    + widths
    + '<sheetData>' + rowsXml + '</sheetData></worksheet>';

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
    + '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill>'
    + '<fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFEFEFEF"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="3">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets><sheet name="' + xmlText(sheetName || 'Sheet1') + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>' },
    { name: 'xl/styles.xml', data: styles },
    { name: 'xl/worksheets/sheet1.xml', data: sheet }
  ];
  return zipStore(files);
}

/* ======================= modal edit ringkasan ======================= */

function editSummary(id) {
  const rec = table.find(r => r.id === id);
  if (!rec) return;
  const root = $('#modalRoot');
  root.innerHTML = '<div class="backdrop"><div class="modal">'
    + '<h2>Ringkasan</h2>'
    + '<p class="muted" style="margin-top:-8px">' + esc(rec.title || '') + '</p>'
    + '<div class="fld"><label class="fl">RINGKASAN (kolom E)</label>'
    + '<textarea id="mSum" style="min-height:170px">' + esc(rec.summary || '') + '</textarea></div>'
    + (rec.abstract ? '<div class="fld"><label class="fl">Abstrak asli (referensi)</label>'
        + '<div class="muted" style="max-height:140px;overflow:auto;font-size:13px">' + esc(rec.abstract) + '</div></div>' : '')
    + '<div class="modal-acts">'
      + (rec.abstract ? '<button class="btn" id="mAuto">Isi ulang dari abstrak</button>' : '')
      + '<button class="btn" id="mCancel">Batal</button>'
      + '<button class="btn primary" id="mSave">Simpan</button>'
    + '</div></div></div>';
  const close = () => { root.innerHTML = ''; };
  $('#mCancel').onclick = close;
  root.querySelector('.backdrop').onclick = (e) => { if (e.target.classList.contains('backdrop')) close(); };
  if ($('#mAuto')) $('#mAuto').onclick = () => { $('#mSum').value = autoSummary(rec); };
  $('#mSave').onclick = () => {
    rec.summary = $('#mSum').value.trim();
    saveTable(); renderTable(); close();
  };
  $('#mSum').focus();
}

