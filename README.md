# PressLedger — Sistem Akuntansi Ekuitas Percetakan

Sistem untuk mencatat setoran modal dan prive para pemilik, transaksi laba/rugi usaha percetakan, serta menyusun laporan perubahan ekuitas per periode.

## Struktur

```text
frontend/
  index.html
  style.css
  js/
    main.js
backend/
  database.sql
  app.js
```

`frontend/js/main.js` menjalankan logika aplikasi di browser. `backend/app.js` menjalankan server lokal untuk menyajikan frontend; fungsi keduanya berbeda.

## Menjalankan lokal

Dari root proyek, jalankan:

```powershell
node backend/app.js
```

Buka `http://localhost:3000`. Server menggunakan modul bawaan Node.js dan tidak memerlukan `package.json`.

## Deploy ke GitHub Pages

Repositori ini men-deploy folder `frontend/` secara otomatis ke:

<https://ivanacarmella28-stack.github.io/sistem-ekuitas-ivana/>

Workflow berjalan setiap kali ada perubahan pada branch `main`. Jika Pages belum aktif, buka **Settings → Pages** di GitHub dan pilih **GitHub Actions** sebagai sumber deployment.

## Supabase

Jalankan `backend/database.sql` melalui Supabase SQL Editor untuk membuat tiga entitas: `pemilik`, `transaksi_modal`, dan `periode_laporan`. Konfigurasi proyek dan publishable key Supabase diatur di bagian atas `frontend/js/main.js`.

Deployment menggunakan proyek Supabase yang sama dengan konfigurasi aplikasi. Kebijakan SQL saat ini memberi akses anonim untuk membaca, menambah, dan menghapus data; siapa pun yang mengakses aplikasi publik dapat berinteraksi dengan data tersebut. Batasi policy dan aktifkan autentikasi sebelum menggunakan data sungguhan. Jangan pernah menaruh `service_role` key pada frontend.

Tanpa konfigurasi Supabase, aplikasi berjalan menggunakan data demo di `localStorage` pada browser masing-masing.
