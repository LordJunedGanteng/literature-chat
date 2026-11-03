/* Asisten AI lewat Groq (gratis, rate-limited).
   Dua jalur: key Groq milik pengguna (disimpan di browser) atau proxy Cloudflare Worker
   milik admin (URL-nya di status.json, key-nya cuma ada di Worker). */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODELS = [
  ['llama-3.3-70b-versatile', 'Llama 3.3 70B — paling bagus bahasa Indonesia'],
  ['llama-3.1-8b-instant', 'Llama 3.1 8B — cepat, kuota harian lebih besar'],
  ['openai/gpt-oss-120b', 'GPT-OSS 120B — penalaran lebih kuat']
];
const AI_FAST = 'llama-3.1-8b-instant';
const LS_AI = { key: 'litrev.groqKey', model: 'litrev.groqModel', auto: 'litrev.aiAuto', rq: 'litrev.rq' };

window.AI_PROXY = window.AI_PROXY || '';

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

function aiConfig() {
  return {
    key: lsGet(LS_AI.key, ''),
    proxy: window.AI_PROXY || '',
    model: lsGet(LS_AI.model, AI_MODELS[0][0]),
    auto: lsGet(LS_AI.auto, '1') !== '0',
    rq: lsGet(LS_AI.rq, '')
  };
}
const aiReady = () => { const c = aiConfig(); return !!(c.key || c.proxy); };
const aiMode = () => { const c = aiConfig(); return c.key ? 'key' : c.proxy ? 'proxy' : ''; };

class AIError extends Error {}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Panggil chat completions. Key sendiri didahulukan; kalau tidak ada, lewat proxy admin.
async function groqChat({ messages, model, json, max_tokens, temperature, onToken, retries = 2 }) {
  const c = aiConfig();
  if (!c.key && !c.proxy) throw new AIError('AI belum aktif');
  const url = c.key ? GROQ_URL : c.proxy;
  const body = {
    model: model || c.model, messages,
    temperature: temperature == null ? 0.3 : temperature,
    max_tokens: max_tokens || 900,
    stream: !!onToken,
    ...(json ? { response_format: { type: 'json_object' } } : {})
  };
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: 'Bearer ' + c.key } : {}) },
      body: JSON.stringify(body)
    });
  } catch (e) { throw new AIError('Ga bisa nyambung ke ' + (c.key ? 'Groq' : 'proxy AI')); }

  if (res.status === 429 && retries > 0) {
    const wait = Math.min(+(res.headers.get('retry-after') || 0) || 8, 30);
    await sleep(wait * 1000);
    return groqChat({ messages, model, json, max_tokens, temperature, onToken, retries: retries - 1 });
  }
  if (!res.ok) {
    let msg = '';
    try { const j = await res.json(); msg = (j.error && (j.error.message || j.error)) || ''; } catch (e) {}
    if (res.status === 401) throw new AIError('Key Groq ga valid / udah dicabut');
    if (res.status === 429) throw new AIError('Kuota gratis Groq lagi penuh, coba lagi sebentar');
    if (res.status === 403) throw new AIError('Proxy AI nolak request (cek ALLOWED_ORIGINS di Worker)');
    throw new AIError('Groq error ' + res.status + (msg ? ': ' + String(msg).slice(0, 140) : ''));
  }

  if (!onToken) {
    const j = await res.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  }

  // streaming SSE
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return full;
      try {
        const d = JSON.parse(data).choices[0].delta.content;
        if (d) { full += d; onToken(full); }
      } catch (e) {}
    }
  }
  return full;
}

function parseJSONLoose(s) {
  try { return JSON.parse(s); } catch (e) {}
  const m = String(s).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

/* ======================= fitur ======================= */

const QUESTION_RE = /\?\s*$|^(apa|apakah|bagaimana|gimana|kenapa|mengapa|jelaskan|jelasin|bandingkan|bandingin|sebutkan|sebutin|siapa|kapan|dimana|di mana|berapa|tolong jelaskan|what|how|why|which|who|explain|compare|summari[sz]e)\b/i;
const isQuestion = (t) => QUESTION_RE.test(String(t).trim());

// Ubah pertanyaan jadi kata kunci pencarian bahasa Inggris (+ tahun kalau disebut).
async function aiExtractQuery(question) {
  const out = await groqChat({
    model: AI_FAST, json: true, max_tokens: 120, temperature: 0,
    messages: [
      { role: 'system', content: 'Ubah pertanyaan riset menjadi kata kunci pencarian jurnal akademik dalam bahasa Inggris (2-6 kata, tanpa kata tanya, tanpa kata seperti "research gap"/"findings"/"study"). Balas HANYA JSON: {"query":"...","year_from":null,"year_to":null}. Isi tahun hanya kalau disebut eksplisit.' },
      { role: 'user', content: question }
    ]
  });
  const j = parseJSONLoose(out);
  if (!j || !j.query) throw new AIError('kata kunci kosong');
  return { query: String(j.query).trim(), y1: j.year_from ? String(j.year_from) : '', y2: j.year_to ? String(j.year_to) : '' };
}

function sourcesBlock(recs) {
  return recs.map((r, i) => '[' + (i + 1) + '] ' + (r.title || '(tanpa judul)')
    + ' — ' + (authorText(r) || 'penulis tidak tercatat') + ' (' + (r.year || 'n.d.') + ')'
    + (r.container ? ', ' + r.container : '')
    + '\nAbstrak: ' + (r.abstract ? r.abstract.slice(0, 900) : '(tidak tersedia)')).join('\n\n');
}

// Jawab pertanyaan / buat gambaran literatur dari jurnal hasil pencarian (streaming).
async function aiAnswer({ text, q, recs, question, onToken }) {
  const sys = 'Kamu asisten riset literatur untuk mahasiswa Indonesia. Jawab dalam Bahasa Indonesia yang jelas. '
    + 'Gunakan HANYA informasi dari daftar jurnal yang diberikan (judul, penulis, tahun, abstrak). '
    + 'Setiap klaim wajib diberi nomor sumber seperti [1] atau [2][5], sesuai nomor di daftar. '
    + 'Jangan mengarang jurnal, penulis, angka, atau temuan yang tidak ada di abstrak. '
    + 'Kalau jurnal yang diberikan tidak cukup untuk menjawab, bilang terus terang dan sarankan kata kunci pencarian lain. '
    + 'Format: paragraf pendek dan/atau poin yang diawali "- ". Pakai **tebal** seperlunya. Maksimal ±250 kata.';
  const task = question
    ? 'Pertanyaan: ' + text
    : 'Topik pencarian: "' + q + '". Buat gambaran singkat literatur ini: tema utama, metode yang dominan, temuan penting, lalu satu baris "Celah penelitian:" berdasarkan apa yang belum dibahas.';
  return groqChat({
    max_tokens: 900, onToken,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: 'Daftar jurnal:\n\n' + sourcesBlock(recs) + '\n\n' + task }
    ]
  });
}

// Isi ringkasan + kolom analisis. Mengembalikan {id: {summary, topicKw, method, finding, relevancy, gap}}.
async function aiAnalyze(recs) {
  const rq = aiConfig().rq;
  const items = recs.map(r => ({
    id: r.id,
    judul: r.title || '',
    referensi: r.title ? '' : (r.rawRef || ''),
    penulis: authorText(r), tahun: r.year || '',
    topik_pencarian: r.query || '',
    abstrak: r.abstract ? r.abstract.slice(0, 1400) : ''
  }));
  const out = await groqChat({
    json: true, max_tokens: 1800, temperature: 0.2,
    messages: [
      { role: 'system', content: 'Kamu membantu mengisi tabel literature review dalam Bahasa Indonesia. '
        + 'Gunakan HANYA judul dan abstrak yang diberikan; jangan mengarang. '
        + 'Kalau abstrak kosong, isi yang bisa disimpulkan dari judul saja dan tulis "Tidak ada abstrak" di kolom yang tidak bisa diisi. '
        + 'Balas HANYA JSON valid dengan bentuk {"items":[{"id":"","ringkasan":"","topik":"","metode":"","temuan_utama":"","relevansi":"","research_gap":""}]}.' },
      { role: 'user', content: 'Topik penelitian user: ' + (rq || '(pakai topik_pencarian tiap jurnal)') + '\n\n'
        + 'Aturan kolom:\n'
        + '- ringkasan: 2-3 kalimat inti studi.\n'
        + '- topik: 3-5 kata kunci dipisah "; ".\n'
        + '- metode: singkat, mis. "Kualitatif — wawancara 17 pekerja kreatif". Tulis "Tidak disebut di abstrak" kalau memang tidak ada.\n'
        + '- temuan_utama: 1-2 kalimat temuan paling penting.\n'
        + '- relevansi: "Tinggi/Sedang/Rendah — alasan singkat" terhadap topik penelitian user.\n'
        + '- research_gap: 1 kalimat. Kalau tidak disebut eksplisit, beri dugaan yang hati-hati dan akhiri dengan "(inferensi AI)".\n\n'
        + 'Jurnal (JSON):\n' + JSON.stringify(items) }
    ]
  });
  const j = parseJSONLoose(out);
  if (!j || !Array.isArray(j.items)) throw new AIError('Format jawaban AI ga kebaca');
  const map = {};
  for (const it of j.items) {
    if (!it || !it.id) continue;
    map[it.id] = {
      summary: it.ringkasan || '', topicKw: it.topik || '', method: it.metode || '',
      finding: it.temuan_utama || '', relevancy: it.relevansi || '', gap: it.research_gap || ''
    };
  }
  return map;
}

// Isi banyak entri tabel per batch, hormati hasil edit manual user.
async function aiFillTable(recs, onProgress) {
  const BATCH = 4;
  let done = 0;
  for (let i = 0; i < recs.length; i += BATCH) {
    const chunk = recs.slice(i, i + BATCH);
    const map = await aiAnalyze(chunk);
    for (const r of chunk) {
      const v = map[r.id];
      if (!v) continue;
      for (const k of Object.keys(v)) if (v[k] && !(r.userEdited && r.userEdited[k])) r[k] = v[k];
      r.ai = true;
    }
    done += chunk.length;
    saveTable();
    if (onProgress) onProgress(done, recs.length);
  }
}

/* ======================= tampilan teks AI ======================= */

// markdown mini: paragraf, poin "- ", **tebal**, dan [n] jadi tautan ke kartu sumber
function mdLite(text, mi) {
  const lines = esc(text).split(/\n/);
  let html = '', inList = false;
  for (let line of lines) {
    line = line.trim();
    const bullet = /^[-*•]\s+/.test(line);
    if (bullet && !inList) { html += '<ul>'; inList = true; }
    if (!bullet && inList) { html += '</ul>'; inList = false; }
    if (!line) continue;
    const body = line.replace(/^[-*•]\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/^#{1,4}\s*/, '')
      .replace(/\[(\d{1,2})\]/g, (m, n) => '<a class="cite" href="#" data-jump="' + mi + ':' + n + '">[' + n + ']</a>');
    html += bullet ? '<li>' + body + '</li>' : '<p>' + body + '</p>';
  }
  if (inList) html += '</ul>';
  return html;
}

/* ======================= pengaturan AI ======================= */

function openAISettings() {
  const c = aiConfig();
  const mode = aiMode();
  const root = $('#modalRoot');
  root.innerHTML = '<div class="backdrop"><div class="modal">'
    + '<h2>Asisten AI (Groq)</h2>'
    + '<p class="muted" style="margin-top:-6px;font-size:14px">AI bantu jawab pertanyaan berdasarkan jurnal yang ketemu, plus isi ringkasan & kolom analisis tabel. Pakai Groq yang gratis (ada batas per menit/hari).</p>'
    + '<div class="aistate">' + (mode === 'key' ? '<span class="pill off">Aktif</span> pakai key Groq lo sendiri'
      : mode === 'proxy' ? '<span class="pill off">Aktif</span> lewat server web ini — ga perlu key'
      : '<span class="pill on">Belum aktif</span> tempel key Groq gratis di bawah') + '</div>'
    + '<div class="fld"><label class="fl" for="aiKey">Groq API key ' + (c.proxy ? '(opsional — biar ga rebutan kuota)' : '') + '</label>'
    + '<input type="password" id="aiKey" placeholder="' + (c.key ? '•••••••• (tersimpan)' : 'gsk_…') + '" autocomplete="off"></div>'
    + '<p class="note" style="margin-top:-4px">Bikin gratis di <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>. Key cuma disimpan di browser ini.</p>'
    + '<div class="fld"><label class="fl" for="aiModel">Model</label><select id="aiModel">'
    + AI_MODELS.map(([v, l]) => '<option value="' + v + '"' + (v === c.model ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></div>'
    + '<div class="fld"><label class="fl" for="aiRq">Topik / pertanyaan penelitian lo (opsional)</label>'
    + '<textarea id="aiRq" style="min-height:60px" placeholder="mis. Kondisi kerja & kesetaraan gender di industri animasi">' + esc(c.rq) + '</textarea></div>'
    + '<p class="note" style="margin-top:-4px">Dipakai AI buat nilai kolom Relevancy.</p>'
    + '<label class="chk"><input type="checkbox" id="aiAuto"' + (c.auto ? ' checked' : '') + '> Jawab otomatis tiap pencarian</label>'
    + '<p class="note">Pertanyaan & abstrak jurnal dikirim ke Groq buat diproses. Jawaban AI bisa salah — selalu cek ke jurnal aslinya.</p>'
    + '<p class="adm-err" id="aiErr" style="margin:8px 0 0"></p>'
    + '<div class="modal-acts">'
      + (c.key ? '<button class="btn danger" id="aiDel" style="margin-right:auto">Hapus key</button>' : '')
      + '<button class="btn" id="aiCancel">Tutup</button>'
      + '<button class="btn primary" id="aiSave">Simpan</button>'
    + '</div></div></div>';
  const close = () => { root.innerHTML = ''; };
  $('#aiCancel').onclick = close;
  root.querySelector('.backdrop').onclick = (e) => { if (e.target.classList.contains('backdrop')) close(); };
  if ($('#aiDel')) $('#aiDel').onclick = () => { lsSet(LS_AI.key, ''); toast('Key Groq dihapus'); close(); refreshAIBadge(); };
  $('#aiSave').onclick = async () => {
    const key = $('#aiKey').value.trim();
    lsSet(LS_AI.model, $('#aiModel').value);
    lsSet(LS_AI.rq, $('#aiRq').value.trim());
    lsSet(LS_AI.auto, $('#aiAuto').checked ? '1' : '0');
    if (key) {
      const btn = $('#aiSave');
      btn.disabled = true; btn.textContent = 'Ngecek key…';
      const prev = lsGet(LS_AI.key, '');
      lsSet(LS_AI.key, key);
      try {
        await groqChat({ model: AI_FAST, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] });
      } catch (e) {
        lsSet(LS_AI.key, prev);
        $('#aiErr').textContent = e.message;
        btn.disabled = false; btn.textContent = 'Simpan';
        return;
      }
    }
    toast(aiReady() ? 'Asisten AI aktif ✦' : 'Pengaturan disimpan');
    close(); refreshAIBadge();
  };
  ($('#aiKey')).focus();
}

function refreshAIBadge() {
  const b = document.querySelector('#aiBadge');
  if (b) { b.textContent = aiReady() ? 'aktif' : 'off'; b.classList.toggle('off', !aiReady()); }
  const t = document.querySelector('#aiFillBtn');
  if (t) t.title = aiReady() ? 'Isi ringkasan & kolom analisis pakai AI' : 'Aktifin Asisten AI dulu';
}
