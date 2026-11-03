# Proxy Groq (Cloudflare Worker)

Biar **semua pengunjung** Literature Chat bisa pakai Asisten AI tanpa punya key Groq sendiri.
Key Groq lo disimpan sebagai *secret* di Cloudflare — tidak pernah masuk repo atau browser pengunjung.

Gratis: Cloudflare Workers free plan + Groq free tier. Kuota Groq gratis dibagi ke semua pengunjung,
jadi kalau rame bisa kena limit (pengunjung dapat pesan "kuota lagi penuh, coba lagi").

## Langkah (±10 menit, sekali saja)

1. **Bikin key Groq** di <https://console.groq.com/keys> → *Create API Key* → copy (`gsk_…`).
2. **Bikin akun Cloudflare** gratis di <https://dash.cloudflare.com/sign-up>.
3. Di dashboard Cloudflare: **Workers & Pages → Create → Create Worker** → kasih nama, mis. `groq-proxy` → **Deploy**.
4. Klik **Edit code**, hapus isinya, tempel seluruh isi [`groq-proxy.js`](groq-proxy.js) → **Deploy**.
5. Buka **Settings → Variables and Secrets**, tambahin:
   - `GROQ_API_KEY` — tipe **Secret** — isi key Groq dari langkah 1
   - `ALLOWED_ORIGINS` — tipe **Text** — `https://lordjunedganteng.github.io`
6. Copy URL Worker lo (mis. `https://groq-proxy.namalo.workers.dev`).
7. Buka **admin.html** → login → bagian **Asisten AI buat semua pengunjung** → tempel URL → **Simpan & terapkan**.

Sekitar 1 menit kemudian, menu **Asisten AI** di web bakal nunjukin status *aktif* buat semua orang.

## Catatan keamanan

- Worker cuma nerima request dari origin di `ALLOWED_ORIGINS`. Ini nyaring pemakaian dari web lain,
  tapi bukan pengaman penuh (orang iseng masih bisa niru header). Kalau kuota lo kebobolan,
  ganti key Groq di Cloudflare — web ga perlu diubah.
- Worker membatasi model (cuma 3 model yang dipakai app) dan `max_tokens` biar kuota ga dihabisin.
- Kalau mau matiin AI buat pengunjung, kosongin URL proxy di admin.
