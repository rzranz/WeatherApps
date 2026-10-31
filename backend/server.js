// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY || '57c719ec69c237ecd017fb87ffa174a0';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static frontend files directly
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ==========================================
// ALGORITMA PENGOLAHAN SINYAL DIGITAL (PSD)
// ==========================================

/**
 * Simple Moving Average (SMA) - Filter FIR Low-Pass
 * y[n] = (1/M) * sum_{k=0}^{M-1} x[n-k]
 * @param {number[]} data Sinyal diskrit masukan x[n]
 * @param {number} windowSize Ukuran window filter M
 * @returns {Array<number|null>} Sinyal hasil filter y[n]
 */
function calculateSMA(data, windowSize = 4) {
    if (!Array.isArray(data)) return [];
    const size = Math.max(2, Math.min(windowSize, 8));
    let smaResult = [];
    for (let i = 0; i < data.length; i++) {
        if (i < size - 1) {
            smaResult.push(null); // Titik awal sebelum window penuh
        } else {
            let sum = 0;
            for (let j = 0; j < size; j++) {
                sum += data[i - j];
            }
            smaResult.push(parseFloat((sum / size).toFixed(2)));
        }
    }
    return smaResult;
}

/**
 * Exponential Moving Average (EMA) - Filter IIR
 * @param {number[]} data 
 * @param {number} windowSize 
 * @returns {number[]}
 */
function calculateEMA(data, windowSize = 4) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const k = 2 / (windowSize + 1);
    let emaResult = [];
    let prev = data[0];
    emaResult.push(parseFloat(prev.toFixed(2)));

    for (let i = 1; i < data.length; i++) {
        const current = data[i] * k + prev * (1 - k);
        emaResult.push(parseFloat(current.toFixed(2)));
        prev = current;
    }
    return emaResult;
}

/**
 * Menghitung efisiensi reduksi noise sinyal (DSP Variance Reduction)
 * @param {number[]} rawData 
 * @param {Array<number|null>} smoothedData 
 */
function calculateNoiseReduction(rawData, smoothedData) {
    if (!rawData || !smoothedData || rawData.length < 3) return 0;
    
    // Hitung first difference (kecepatan fluktuasi sinyal)
    let rawDiffs = [];
    let smoothDiffs = [];
    
    for (let i = 1; i < rawData.length; i++) {
        rawDiffs.push(Math.abs(rawData[i] - rawData[i - 1]));
        if (smoothedData[i] !== null && smoothedData[i - 1] !== null) {
            smoothDiffs.push(Math.abs(smoothedData[i] - smoothedData[i - 1]));
        }
    }

    if (rawDiffs.length === 0 || smoothDiffs.length === 0) return 0;
    
    const avgRawDiff = rawDiffs.reduce((a, b) => a + b, 0) / rawDiffs.length;
    const avgSmoothDiff = smoothDiffs.reduce((a, b) => a + b, 0) / smoothDiffs.length;

    if (avgRawDiff === 0) return 0;
    const reduction = ((avgRawDiff - avgSmoothDiff) / avgRawDiff) * 100;
    return parseFloat(Math.max(0, Math.min(reduction, 99.9)).toFixed(1));
}

// ==========================================
// ROUTES & ENDPOINTS
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        appName: 'Aplikasi Prediksi Cuaca & DSP SMA',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`
    });
});

// Autocomplete pencarian kota
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
        return res.json([]);
    }

    try {
        const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query.trim())}&limit=5&appid=${API_KEY}`;
        const response = await axios.get(geoUrl);
        
        const suggestions = (response.data || []).map(item => ({
            name: item.local_names?.id || item.name,
            originalName: item.name,
            country: item.country,
            state: item.state || '',
            lat: item.lat,
            lon: item.lon,
            displayName: `${item.local_names?.id || item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`
        }));

        res.json(suggestions);
    } catch (error) {
        console.error('Search Autocomplete Error:', error.message);
        res.status(500).json({ error: 'Gagal mencari saran kota' });
    }
});

// Endpoint Utama: Data Cuaca & Prediksi
app.post('/api/weather', async (req, res) => {
    let { city, lat, lon, hourly = [], daily = [], sma_window = 4 } = req.body;

    // Normalisasi parameter
    if (!Array.isArray(hourly)) hourly = [];
    if (!Array.isArray(daily)) daily = [];
    const windowSize = parseInt(sma_window) || 4;

    try {
        let locationName = city;
        let countryCode = '';
        let stateName = '';

        // 1. Dapatkan Koordinat jika belum ada
        if ((lat === undefined || lon === undefined) && city) {
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
            const geoResponse = await axios.get(geoUrl);
            if (!geoResponse.data || geoResponse.data.length === 0) {
                return res.status(404).json({ error: `Kota "${city}" tidak ditemukan. Coba ketik nama kota lain.` });
            }
            const found = geoResponse.data[0];
            lat = found.lat;
            lon = found.lon;
            locationName = found.local_names?.id || found.name;
            countryCode = found.country;
            stateName = found.state || '';
        } else if (lat !== undefined && lon !== undefined) {
            // Reverse Geocoding jika koordinat diberikan langsung dari GPS/lokasi user
            try {
                const revGeoUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
                const revResponse = await axios.get(revGeoUrl);
                if (revResponse.data && revResponse.data.length > 0) {
                    const found = revResponse.data[0];
                    locationName = found.local_names?.id || found.name;
                    countryCode = found.country;
                    stateName = found.state || '';
                }
            } catch (revErr) {
                console.warn('Reverse Geocoding warning:', revErr.message);
            }
        } else {
            return res.status(400).json({ error: 'Nama kota atau koordinat GPS (lat, lon) diperlukan.' });
        }

        // 2. Fetch Forecast & Current Weather secara paralel
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;

        const [forecastRes, currentRes] = await Promise.all([
            axios.get(forecastUrl),
            axios.get(currentUrl).catch(() => null)
        ]);

        const list = forecastRes.data.list || [];
        const currentData = currentRes ? currentRes.data : null;

        // 3. Format Response
        const formattedResponse = {
            city: locationName,
            country: countryCode,
            state: stateName,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            current: null,
            hourly: null,
            daily: null,
            dsp: {
                sma_window: windowSize,
                noise_reduction_pct: 0
            }
        };

        // Buat objek cuaca terkini yang presisi
        if (currentData) {
            formattedResponse.current = {
                temp: currentData.main.temp,
                feels_like: currentData.main.feels_like,
                temp_min: currentData.main.temp_min,
                temp_max: currentData.main.temp_max,
                humidity: currentData.main.humidity,
                pressure: currentData.main.pressure,
                wind_speed: parseFloat((currentData.wind.speed * 3.6).toFixed(1)), // konversi ke km/jam
                wind_deg: currentData.wind.deg,
                visibility: currentData.visibility ? (currentData.visibility / 1000).toFixed(1) : null,
                clouds: currentData.clouds?.all ?? 0,
                weather_id: currentData.weather[0].id,
                weather_main: currentData.weather[0].main,
                weather_desc: currentData.weather[0].description,
                sunrise: currentData.sys?.sunrise,
                sunset: currentData.sys?.sunset,
                timestamp: currentData.dt
            };
        } else if (list.length > 0) {
            const first = list[0];
            formattedResponse.current = {
                temp: first.main.temp,
                feels_like: first.main.feels_like,
                temp_min: first.main.temp_min,
                temp_max: first.main.temp_max,
                humidity: first.main.humidity,
                pressure: first.main.pressure,
                wind_speed: parseFloat((first.wind.speed * 3.6).toFixed(1)),
                wind_deg: first.wind.deg,
                visibility: (first.visibility / 1000).toFixed(1),
                clouds: first.clouds?.all ?? 0,
                weather_id: first.weather[0].id,
                weather_main: first.weather[0].main,
                weather_desc: first.weather[0].description,
                timestamp: first.dt
            };
        }

        // 4. Hourly Data Formatting (Data 3 Jam x 40 Poin)
        if (hourly.length > 0 || true) {
            formattedResponse.hourly = {
                time: list.map(h => h.dt_txt),
                weather_id: list.map(h => h.weather[0].id),
                weather_desc: list.map(h => h.weather[0].description),
                weather_main: list.map(h => h.weather[0].main),
                pop: list.map(h => Math.round((h.pop || 0) * 100)) // Probability of precipitation (%)
            };

            const tempArray = list.map(h => parseFloat(h.main.temp.toFixed(1)));
            formattedResponse.hourly['temperature_2m'] = tempArray;

            // Algoritma DSP SMA & EMA
            const smaArray = calculateSMA(tempArray, windowSize);
            const emaArray = calculateEMA(tempArray, windowSize);
            formattedResponse.hourly['temperature_sma'] = smaArray;
            formattedResponse.hourly['temperature_ema'] = emaArray;

            // Hitung Noise Reduction
            formattedResponse.dsp.noise_reduction_pct = calculateNoiseReduction(tempArray, smaArray);

            formattedResponse.hourly['relative_humidity_2m'] = list.map(h => h.main.humidity);
            formattedResponse.hourly['precipitation'] = list.map(h => parseFloat(((h.rain && h.rain['3h']) || 0).toFixed(1)));
            formattedResponse.hourly['wind_speed_10m'] = list.map(h => parseFloat((h.wind.speed * 3.6).toFixed(1)));
            formattedResponse.hourly['pressure'] = list.map(h => h.main.pressure);
        }

        // 5. Daily Forecast Formatting (Ringkasan 5 Hari)
        const dailyData = {};
        list.forEach(item => {
            const day = item.dt_txt.split(' ')[0];
            if (!dailyData[day]) {
                dailyData[day] = {
                    temps: [],
                    rains: [],
                    weather_ids: [],
                    weather_descs: [],
                    winds: [],
                    humidities: []
                };
            }
            dailyData[day].temps.push(item.main.temp_min, item.main.temp_max);
            dailyData[day].rains.push((item.rain && item.rain['3h']) || 0);
            dailyData[day].weather_ids.push(item.weather[0].id);
            dailyData[day].weather_descs.push(item.weather[0].description);
            dailyData[day].winds.push(item.wind.speed * 3.6);
            dailyData[day].humidities.push(item.main.humidity);
        });

        const dayKeys = Object.keys(dailyData);
        formattedResponse.daily = {
            time: dayKeys,
            weather_id: dayKeys.map(d => {
                const ids = dailyData[d].weather_ids;
                // Pilih ID yang paling signifikan (prioritas hujan/badai/salju, lalu siang hari)
                const rainOrStorm = ids.find(id => id < 700);
                return rainOrStorm || ids[Math.floor(ids.length / 2)] || 800;
            }),
            weather_desc: dayKeys.map(d => dailyData[d].weather_descs[Math.floor(dailyData[d].weather_descs.length / 2)] || 'Cerah'),
            temperature_2m_max: dayKeys.map(d => Math.max(...dailyData[d].temps)),
            temperature_2m_min: dayKeys.map(d => Math.min(...dailyData[d].temps)),
            precipitation_sum: dayKeys.map(d => parseFloat(dailyData[d].rains.reduce((a, b) => a + b, 0).toFixed(1))),
            avg_wind_speed: dayKeys.map(d => parseFloat((dailyData[d].winds.reduce((a, b) => a + b, 0) / dailyData[d].winds.length).toFixed(1))),
            avg_humidity: dayKeys.map(d => Math.round(dailyData[d].humidities.reduce((a, b) => a + b, 0) / dailyData[d].humidities.length))
        };

        res.json(formattedResponse);

    } catch (error) {
        console.error("Error Backend /api/weather:", error.response?.data || error.message);
        const status = error.response?.status || 500;
        res.status(status).json({
            error: error.response?.data?.message || error.message || 'Terjadi kesalahan pada server cuaca.'
        });
    }
});

// Endpoint Komparasi Multi-Kota
app.post('/api/compare', async (req, res) => {
    let { cities = ['Bandung', 'Jakarta'], parameter = 'temperature_2m_max' } = req.body;
    
    if (!Array.isArray(cities) || cities.length === 0) {
        return res.status(400).json({ error: 'Daftar kota (cities) harus berupa array non-kosong.' });
    }

    // Batasi maksimal 5 kota agar cepat
    const limitedCities = cities.slice(0, 5);
    const comparisonResults = {};

    try {
        await Promise.all(limitedCities.map(async (cityName) => {
            try {
                // 1. Geocoding
                const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${API_KEY}`;
                const geoRes = await axios.get(geoUrl);
                if (!geoRes.data || geoRes.data.length === 0) return;

                const { lat, lon, name, country } = geoRes.data[0];

                // 2. Fetch Forecast
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;
                const weatherRes = await axios.get(forecastUrl);
                const list = weatherRes.data.list || [];

                // 3. Agregasi Harian
                const dailyData = {};
                list.forEach(item => {
                    const day = item.dt_txt.split(' ')[0];
                    if (!dailyData[day]) {
                        dailyData[day] = { temps: [], rains: [], winds: [], humidities: [] };
                    }
                    dailyData[day].temps.push(item.main.temp_min, item.main.temp_max);
                    dailyData[day].rains.push((item.rain && item.rain['3h']) || 0);
                    dailyData[day].winds.push(item.wind.speed * 3.6);
                    dailyData[day].humidities.push(item.main.humidity);
                });

                const days = Object.keys(dailyData).slice(0, 5);
                
                comparisonResults[name || cityName] = {
                    cityName: name || cityName,
                    country: country,
                    lat: lat,
                    lon: lon,
                    time: days,
                    temperature_2m_max: days.map(d => Math.max(...dailyData[d].temps)),
                    temperature_2m_min: days.map(d => Math.min(...dailyData[d].temps)),
                    temperature_avg: days.map(d => parseFloat((dailyData[d].temps.reduce((a, b) => a + b, 0) / dailyData[d].temps.length).toFixed(1))),
                    precipitation_sum: days.map(d => parseFloat(dailyData[d].rains.reduce((a, b) => a + b, 0).toFixed(1))),
                    wind_speed_avg: days.map(d => parseFloat((dailyData[d].winds.reduce((a, b) => a + b, 0) / dailyData[d].winds.length).toFixed(1))),
                    humidity_avg: days.map(d => Math.round(dailyData[d].humidities.reduce((a, b) => a + b, 0) / dailyData[d].humidities.length))
                };
            } catch (err) {
                console.warn(`Gagal mengambil data untuk ${cityName}:`, err.message);
            }
        }));

        res.json(comparisonResults);
    } catch (error) {
        console.error('Error in /api/compare:', error.message);
        res.status(500).json({ error: 'Gagal memproses perbandingan kota.' });
    }
});

// Fallback route untuk SPA
app.get('/compare', (req, res) => {
    res.sendFile(path.join(frontendPath, 'compare.html'));
});

app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌤️  METEOPULSE - APLIKASI PREDIKSI CUACA & FILTER DSP`);
    console.log(`🚀 Server aktif di : http://localhost:${PORT}`);
    console.log(`📊 Buka di browser : http://localhost:${PORT}`);
    console.log(`📡 Endpoint API    : http://localhost:${PORT}/api/weather`);
    console.log(`📈 Endpoint Compare: http://localhost:${PORT}/api/compare`);
    console.log(`======================================================\n`);
});
