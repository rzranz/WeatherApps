// 1. Seleksi semua elemen
const inputLokasi = document.getElementById('input-lokasi');
const btnAmbilData = document.getElementById('btn-ambil-data');
const tabelJudul = document.getElementById('tabel-judul'); // <--- ELEMEN BARU
const tabelHead = document.getElementById('tabel-header');
const tabelBody = document.getElementById('tabel-data-body');

// Seleksi Checkbox menggunakan Class
const dailyCheckboxes = document.querySelectorAll('.cb-daily');
const hourlyCheckboxes = document.querySelectorAll('.cb-hourly');

// 2. Tambahkan Event Listener ke Tombol
btnAmbilData.addEventListener('click', ambilDataCuaca);

// 3. Fungsi utama
async function ambilDataCuaca() {
    
    tabelJudul.textContent = "Mengambil data..."; // <--- JUDUL BARU
    tabelHead.innerHTML = ''; // Kosongkan header
    tabelBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    try {
        // --- TAHAP GEOCoding ---
        const kota = inputLokasi.value;
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${kota}&count=1`;
        
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData.results) {
            tabelBody.innerHTML = '<tr><td colspan="4">Error: Lokasi tidak ditemukan.</td></tr>';
            return;
        }
        
        const lokasi = geoData.results[0];
        const latitude = lokasi.latitude;
        const longitude = lokasi.longitude;

        // --- TAHAP MEMBACA CHECKBOX ---
        const dailyParams = Array.from(dailyCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
            
        const hourlyParams = Array.from(hourlyCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (dailyParams.length === 0 && hourlyParams.length === 0) {
             tabelJudul.textContent = "Data";
             tabelBody.innerHTML = '<tr><td colspan="4">Silakan pilih minimal satu parameter cuaca.</td></tr>';
             return;
        }

        // --- TAHAP MERAKIT URL CUACA ---
        let apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto`;
        
        if (dailyParams.length > 0) {
            apiUrl += `&daily=${dailyParams.join(',')}`;
        }
        if (hourlyParams.length > 0) {
            apiUrl += `&hourly=${hourlyParams.join(',')}`;
        }
        
        // --- TAHAP FETCH DATA CUACA ---
        const weatherResponse = await fetch(apiUrl);
        const weatherData = await weatherResponse.json();
        
        // --- TAHAP MENAMPILKAN DATA (LOGIKA DIPERBARUI) ---
        
        // ** INI LOGIKA BARUNYA **
        // Prioritaskan HOURLY jika dicentang
        if (hourlyParams.length > 0) {
            tabelJudul.textContent = "Data Per Jam (Hourly)";
            tampilkanDataDiTabel(weatherData.hourly, hourlyParams);
        
        // Jika hourly tidak dicentang, baru tampilkan DAILY
        } else if (dailyParams.length > 0) {
            tabelJudul.textContent = "Data Harian (7 Hari)";
            tampilkanDataDiTabel(weatherData.daily, dailyParams);
        }

    } catch (error) {
        console.error("Gagal mengambil data:", error);
        tabelJudul.textContent = "Error";
        tabelBody.innerHTML = `<tr><td colspan="4">Error: ${error.message}. Cek koneksi internet atau ekstensi CORS Anda.</td></tr>`;
    }
}


function tampilkanDataDiTabel(data, params) {
    // Kosongkan tabel
    tabelHead.innerHTML = '';
    tabelBody.innerHTML = '';
    
    // --- Buat Header Tabel ---
    const headerRow = document.createElement('tr');
    
    const timeHeader = document.createElement('th');
    timeHeader.textContent = 'time';
    headerRow.appendChild(timeHeader);
    
    params.forEach(paramName => {
        const paramHeader = document.createElement('th');
        paramHeader.textContent = paramName;
        headerRow.appendChild(paramHeader);
    });
    
    tabelHead.appendChild(headerRow);
    
    // --- Buat Body Tabel ---
    const times = data.time;
    
    times.forEach((time, index) => {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.textContent = time;
        row.appendChild(timeCell);
        
        params.forEach(paramName => {
            const valueCell = document.createElement('td');
            valueCell.textContent = data[paramName][index];
            row.appendChild(valueCell);
        });
        
        tabelBody.appendChild(row);
    });
}