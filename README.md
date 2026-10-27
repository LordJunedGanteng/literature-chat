# Literature Chat

Pencari studi literatur ala chatbot. Ketik topik → cari jurnal di OpenAlex / Crossref → hasil otomatis diformat ke kolom **NO · LINK · TAHUN · REFERENSI · RINGKASAN** dan bisa di-download sebagai `.xlsx`.

## Fitur
- Filter langsung dari kalimat: `2015-2025`, `dari 2018`, `5 tahun terakhir`, `open access`, `terbaru`, `paling banyak disitasi`, `pakai crossref`
- Istilah umum bahasa Indonesia diterjemahin otomatis ke Inggris
- Format referensi: APA 7, IEEE, MLA 9, Harvard, Vancouver
- Export: `.xlsx`, CSV, Word, atau copy langsung ke Excel
- Impor file `.xlsx` lama yang punya header LINK / TAHUN / REFERENSI / RINGKASAN
- Riwayat pencarian & tabel tersimpan di browser (localStorage) — tidak dikirim ke server mana pun

## Jalanin lokal
```bash
node serve.js
```
lalu buka http://localhost:5178

Data jurnal dari [OpenAlex](https://openalex.org) dan [Crossref](https://www.crossref.org).
