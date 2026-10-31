// frontend/js/ui.js

// --- Kamus & Pemetaan Ikon Cuaca ---
export const WEATHER_ICON_MAP = {
    800: { icon: 'fas fa-sun', color: 'text-amber-500', label: 'Cerah' },
    801: { icon: 'fas fa-cloud-sun', color: 'text-amber-400', label: 'Cerah Berawan' },
    802: { icon: 'fas fa-cloud', color: 'text-sky-400', label: 'Berawan Tipis' },
    803: { icon: 'fas fa-cloud', color: 'text-slate-400', label: 'Berawan' },
    804: { icon: 'fas fa-cloud', color: 'text-slate-500', label: 'Mendung Tebal' },
    500: { icon: 'fas fa-cloud-rain', color: 'text-cyan-400', label: 'Hujan Ringan' },
    501: { icon: 'fas fa-cloud-showers-heavy', color: 'text-blue-500', label: 'Hujan Sedang' },
    502: { icon: 'fas fa-cloud-showers-heavy', color: 'text-blue-600', label: 'Hujan Lebat' },
    200: { icon: 'fas fa-cloud-bolt', color: 'text-yellow-400', label: 'Badai Petir Ringan' },
    211: { icon: 'fas fa-bolt', color: 'text-yellow-500', label: 'Badai Petir' },
    600: { icon: 'fas fa-snowflake', color: 'text-cyan-200', label: 'Salju' },
    741: { icon: 'fas fa-smog', color: 'text-slate-400', label: 'Berkabut' },
    'default': { icon: 'fas fa-cloud-sun', color: 'text-cyan-400', label: 'Normal' }
};

export function getWeatherMeta(weatherId) {
    if (!weatherId) return WEATHER_ICON_MAP['default'];
    if (WEATHER_ICON_MAP[weatherId]) return WEATHER_ICON_MAP[weatherId];

    const group = Math.floor(weatherId / 100);
    switch(group) {
        case 2: return { icon: 'fas fa-cloud-bolt', color: 'text-yellow-400', label: 'Badai Petir' };
        case 3: return { icon: 'fas fa-cloud-rain', color: 'text-cyan-400', label: 'Gerimis' };
        case 5: return { icon: 'fas fa-cloud-showers-heavy', color: 'text-blue-500', label: 'Hujan' };
        case 6: return { icon: 'fas fa-snowflake', color: 'text-cyan-200', label: 'Salju' };
        case 7: return { icon: 'fas fa-smog', color: 'text-slate-400', label: 'Kabut/Asap' };
        case 8: return { icon: 'fas fa-cloud', color: 'text-slate-400', label: 'Berawan' };
        default: return WEATHER_ICON_MAP['default'];
    }
}

// Global Chart Instances
let smaChart = null;
let compareChart = null;
let dspResidualChart = null;

// --- Seleksi Elemen DOM ---
const cityInput = document.getElementById('city-input');
const fetchButton = document.getElementById('fetch-button');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');
const errorMessageDiv = document.getElementById('error-message');
const errorTextSpan = document.getElementById('error-text');

const currentWeatherCard = document.getElementById('current-weather-card');
const hourlyCardsContainer = document.getElementById('hourly-cards-container');
const forecastContainer = document.getElementById('forecast-container');
const hourlyTrendChartCanvas = document.getElementById('hourlyTrendChart');

// --- Input & Button Helpers ---
export function getCityInput() {
    return cityInput ? cityInput.value.trim() : '';
}

export function setCityInput(city) {
    if (cityInput) cityInput.value = city;
}

export function setButtonLoading(isLoading) {
    if (!fetchButton) return;
    fetchButton.disabled = isLoading;
    if (isLoading) {
        if (buttonText) buttonText.textContent = "Memproses...";
        if (buttonSpinner) buttonSpinner.classList.remove('hidden');
    } else {
        if (buttonText) buttonText.textContent = "Cari Cuaca";
        if (buttonSpinner) buttonSpinner.classList.add('hidden');
    }
}

export function displayError(message) {
    if (errorMessageDiv && errorTextSpan) {
        errorMessageDiv.classList.remove('hidden');
        errorTextSpan.textContent = message;
    }
}

export function clearError() {
    if (errorMessageDiv && errorTextSpan) {
        errorMessageDiv.classList.add('hidden');
        errorTextSpan.textContent = '';
    }
}

export function getCheckedValues(fieldsetId) {
    const filters = [];
    document.querySelectorAll(`#${fieldsetId} input[type="checkbox"]:checked`).forEach(input => {
        filters.push(input.value);
    });
    return filters;
}

// --- Render Cuaca Saat Ini (Hero Section) ---
export function renderCurrentWeather(data) {
    if (!currentWeatherCard || !data) return;

    const current = data.current || {};
    const city = data.city || 'Kota Terpilih';
    const country = data.country ? `, ${data.country}` : '';
    const temp = Math.round(current.temp ?? (data.hourly?.temperature_2m?.[0] || 0));
    const feelsLike = Math.round(current.feels_like ?? temp);
    const humidity = current.humidity ?? (data.hourly?.relative_humidity_2m?.[0] || 0);
    const windSpeed = current.wind_speed ?? (data.hourly?.wind_speed_10m?.[0] || 0);
    const pressure = current.pressure ?? 1012;
    const visibility = current.visibility ?? '10.0';
    const weatherId = current.weather_id ?? (data.hourly?.weather_id?.[0] || 800);
    const weatherDesc = current.weather_desc || (data.hourly?.weather_desc?.[0] || 'Cerah');
    const weatherMeta = getWeatherMeta(weatherId);
    const noiseReduction = data.dsp?.noise_reduction_pct || 0;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    currentWeatherCard.innerHTML = `
        <div class="relative overflow-hidden rounded-2xl glass-panel p-6 shadow-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300">
            <!-- Ambient Gradient Orb -->
            <div class="absolute -right-16 -top-16 w-56 h-56 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Top Bar: Info Kota & Waktu -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
                <div>
                    <div class="flex items-center gap-2">
                        <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">${city}${country}</h2>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300/40">
                            Live GPS
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${dateFormatted} • Terakhir diperbarui: ${timeFormatted}</p>
                </div>
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-mono">
                    <i class="fas fa-satellite-dish text-cyan-500 animate-pulse"></i>
                    <span>${data.lat?.toFixed(3)}°, ${data.lon?.toFixed(3)}°</span>
                </div>
            </div>

            <!-- Main Weather Display -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
                <div class="md:col-span-7 flex items-center gap-6">
                    <div class="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <i class="${weatherMeta.icon} ${weatherMeta.color} text-5xl filter drop-shadow"></i>
                    </div>
                    <div>
                        <div class="flex items-baseline gap-1">
                            <span class="text-6xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tighter tabular-nums">${temp}</span>
                            <span class="text-3xl font-light text-cyan-600 dark:text-cyan-400">°C</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-base font-semibold capitalize text-slate-800 dark:text-slate-200">${weatherDesc}</span>
                            <span class="text-xs text-slate-400">• Terasa ${feelsLike}°C</span>
                        </div>
                    </div>
                </div>

                <!-- DSP Status Pill -->
                <div class="md:col-span-5 flex flex-col justify-center">
                    <div class="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 dark:border-amber-400/20">
                        <div class="flex items-center justify-between text-xs mb-1">
                            <span class="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <i class="fas fa-wave-square"></i> Filter Digital SMA (PSD)
                            </span>
                            <span class="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Aktif</span>
                        </div>
                        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Algoritma Moving Average window <strong class="text-slate-800 dark:text-slate-200">M = ${data.dsp?.sma_window || 4}</strong> meredam <strong class="text-emerald-500">${noiseReduction}%</strong> fluktuasi sinyal temperatur.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Quick Metrics Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40">
                    <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <i class="fas fa-droplet text-blue-500"></i>
                        <span>Kelembapan</span>
                    </div>
                    <p class="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">${humidity}%</p>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40">
                    <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <i class="fas fa-wind text-cyan-500"></i>
                        <span>Kecepatan Angin</span>
                    </div>
                    <p class="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">${windSpeed} <span class="text-xs font-normal">km/j</span></p>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40">
                    <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <i class="fas fa-gauge-high text-emerald-500"></i>
                        <span>Tekanan Udara</span>
                    </div>
                    <p class="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">${pressure} <span class="text-xs font-normal">hPa</span></p>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40">
                    <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <i class="fas fa-eye text-indigo-500"></i>
                        <span>Jarak Pandang</span>
                    </div>
                    <p class="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">${visibility} <span class="text-xs font-normal">km</span></p>
                </div>
            </div>
        </div>
    `;
    currentWeatherCard.classList.remove('hidden');
}

// --- Render Kartu Per Jam (Hourly 24 Jam) ---
export function renderHourlyCards(hourlyData) {
    if (!hourlyCardsContainer || !hourlyData || !hourlyData.time) return;

    hourlyCardsContainer.innerHTML = '';
    const sliceCount = 8; // 24 jam ke depan (interval 3 jam)
    const hours = hourlyData.time.slice(0, sliceCount);

    hours.forEach((time, index) => {
        const timePart = time.split(' ')[1].substring(0, 5);
        const iconMeta = getWeatherMeta(hourlyData.weather_id[index]);
        const temp = Math.round(hourlyData.temperature_2m[index]);
        const smaTemp = hourlyData.temperature_sma?.[index] !== null && hourlyData.temperature_sma?.[index] !== undefined 
            ? `${Math.round(hourlyData.temperature_sma[index])}°` 
            : '-';
        const pop = hourlyData.pop?.[index] ?? 0;

        const card = document.createElement('div');
        card.className = "flex-shrink-0 w-28 p-3.5 rounded-2xl glass-panel text-center border border-slate-200/70 dark:border-slate-800/70 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all duration-200 group cursor-default shadow-sm hover:shadow-md";
        card.innerHTML = `
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">${timePart}</p>
            <div class="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center my-1.5 group-hover:scale-110 transition-transform">
                <i class="${iconMeta.icon} ${iconMeta.color} text-lg"></i>
            </div>
            <p class="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">${temp}°</p>
            <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span title="Peluang Hujan"><i class="fas fa-droplet text-cyan-500 text-[10px]"></i> ${pop}%</span>
                <span title="Nilai Filter SMA" class="text-amber-500 font-semibold">${smaTemp}</span>
            </div>
        `;
        hourlyCardsContainer.appendChild(card);
    });
}

// --- Render Prakiraan 5 Hari ---
export function renderForecast5Day(dailyData) {
    if (!forecastContainer || !dailyData || !dailyData.time) return;

    forecastContainer.innerHTML = '';
    const days = dailyData.time.slice(0, 5);

    // Hitung range suhu global untuk visual range bar
    const allMax = Math.max(...dailyData.temperature_2m_max);
    const allMin = Math.min(...dailyData.temperature_2m_min);
    const rangeSpan = Math.max(1, allMax - allMin);

    days.forEach((dayStr, index) => {
        const dateObj = new Date(dayStr);
        const dayName = index === 0 ? 'Hari Ini' : dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
        const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const iconMeta = getWeatherMeta(dailyData.weather_id[index]);
        const maxTemp = Math.round(dailyData.temperature_2m_max[index]);
        const minTemp = Math.round(dailyData.temperature_2m_min[index]);
        const rainSum = dailyData.precipitation_sum?.[index] ?? 0;

        // Persentase posisi bar gradien suhu
        const leftPercent = Math.max(0, Math.min(100, ((minTemp - allMin) / rangeSpan) * 100));
        const widthPercent = Math.max(15, Math.min(100 - leftPercent, ((maxTemp - minTemp) / rangeSpan) * 100));

        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors";
        item.innerHTML = `
            <div class="w-24">
                <span class="block font-bold text-sm text-slate-900 dark:text-slate-100">${dayName}</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">${dateFormatted}</span>
            </div>

            <div class="flex items-center gap-2 w-28">
                <i class="${iconMeta.icon} ${iconMeta.color} text-lg w-6 text-center"></i>
                <span class="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">${iconMeta.label}</span>
            </div>

            <!-- Temperature Range Bar -->
            <div class="hidden sm:flex items-center gap-2 flex-grow max-w-[140px] mx-3">
                <span class="text-xs text-slate-400 tabular-nums">${minTemp}°</span>
                <div class="relative flex-grow h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="absolute h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-500" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
                </div>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">${maxTemp}°</span>
            </div>

            <div class="text-right sm:hidden">
                <span class="text-xs font-bold text-slate-800 dark:text-white tabular-nums">${maxTemp}°</span>
                <span class="text-xs text-slate-400 tabular-nums"> / ${minTemp}°</span>
            </div>
        `;
        forecastContainer.appendChild(item);
    });
}

// --- Render Grafik SMA & DSP (Pengolahan Sinyal Digital) ---
export function renderSMAChart(hourlyData) {
    if (!hourlyTrendChartCanvas || !hourlyData || !hourlyData.time || !hourlyData.temperature_2m) return;

    const sliceCount = 8; // 24 Jam
    const labels = hourlyData.time.slice(0, sliceCount).map(t => t.split(' ')[1].substring(0, 5));
    const dataActual = hourlyData.temperature_2m.slice(0, sliceCount);
    const dataSMA = (hourlyData.temperature_sma || []).slice(0, sliceCount);
    const dataEMA = (hourlyData.temperature_ema || []).slice(0, sliceCount);

    const showSMA = document.getElementById('toggle-sma')?.checked ?? true;
    const showEMA = document.getElementById('toggle-ema')?.checked ?? false;
    const isDark = document.documentElement.classList.contains('dark');

    if (smaChart) {
        smaChart.destroy();
    }

    const ctx = hourlyTrendChartCanvas.getContext('2d');

    // Buat Gradient untuk area sinyal
    const gradientActual = ctx.createLinearGradient(0, 0, 0, 260);
    if (isDark) {
        gradientActual.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        gradientActual.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    } else {
        gradientActual.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
        gradientActual.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    }

    const datasets = [
        {
            label: 'Sinyal Asli x[n] (°C)',
            data: dataActual,
            borderColor: '#06b6d4',
            backgroundColor: gradientActual,
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            fill: true
        }
    ];

    if (showSMA && dataSMA.length > 0) {
        datasets.push({
            label: 'Filter SMA y[n] (FIR)',
            data: dataSMA,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            borderDash: [6, 4],
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f59e0b',
            fill: false
        });
    }

    if (showEMA && dataEMA.length > 0) {
        datasets.push({
            label: 'Filter EMA y[n] (IIR)',
            data: dataEMA,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#10b981',
            fill: false
        });
    }

    smaChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: isDark ? '#cbd5e1' : '#475569',
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#f8fafc' : '#0f172a',
                    bodyColor: isDark ? '#cbd5e1' : '#334155',
                    borderColor: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.8)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.dataset.label}: ${context.parsed.y}°C`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)' },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: 'JetBrains Mono', size: 11 },
                        callback: val => `${val}°C`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: 'JetBrains Mono', size: 11 }
                    }
                }
            }
        }
    });
}

// --- Render Grafik Komparasi Multi-Kota ---
export function renderComparisonChart(dataObject, parameter = 'temperature_2m_max') {
    const canvas = document.getElementById('comparisonChartCanvas');
    if (!canvas || !dataObject || Object.keys(dataObject).length === 0) return;

    if (compareChart) {
        compareChart.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const firstCity = Object.keys(dataObject)[0];
    const labels = dataObject[firstCity].time.map(d => {
        return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    });

    const palette = [
        { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
        { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    ];

    const datasets = [];
    let colorIdx = 0;

    for (const city in dataObject) {
        const cityData = dataObject[city];
        const color = palette[colorIdx % palette.length];
        colorIdx++;

        datasets.push({
            label: cityData.cityName || city,
            data: cityData[parameter] || [],
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 3,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: color.border,
            fill: false
        });
    }

    const ctx = canvas.getContext('2d');
    compareChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDark ? '#e2e8f0' : '#334155',
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)' },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: 'JetBrains Mono', size: 11 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: 'JetBrains Mono', size: 11 }
                    }
                }
            }
        }
    });

    // Render Summary Cards Komparasi
    renderComparisonSummaryCards(dataObject, parameter);
}

function renderComparisonSummaryCards(dataObject, parameter) {
    const container = document.getElementById('comparison-cards-summary');
    if (!container) return;

    container.innerHTML = '';
    for (const city in dataObject) {
        const c = dataObject[city];
        const values = c[parameter] || [];
        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-';
        const max = values.length > 0 ? Math.max(...values) : '-';
        const min = values.length > 0 ? Math.min(...values) : '-';

        const card = document.createElement('div');
        card.className = "p-4 rounded-xl glass-panel border border-slate-200/70 dark:border-slate-800/70 shadow-sm";
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-slate-900 dark:text-white text-base">${c.cityName || city}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">${c.country || 'ID'}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                <div>
                    <span class="text-[11px] text-slate-400 block">Rata-rata</span>
                    <span class="font-bold text-slate-800 dark:text-slate-100 tabular-nums">${avg}°</span>
                </div>
                <div>
                    <span class="text-[11px] text-slate-400 block">Maks</span>
                    <span class="font-bold text-amber-500 tabular-nums">${max}°</span>
                </div>
                <div>
                    <span class="text-[11px] text-slate-400 block">Min</span>
                    <span class="font-bold text-cyan-500 tabular-nums">${min}°</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

// --- Render Laboratorium DSP (Analisis Sinyal) ---
export function renderDSPLab(hourlyData) {
    const container = document.getElementById('dsp-analysis-content');
    if (!container || !hourlyData || !hourlyData.temperature_2m) return;

    const raw = hourlyData.temperature_2m;
    const sma = hourlyData.temperature_sma || [];
    const validSma = sma.filter(v => v !== null);

    const rawMean = (raw.reduce((a, b) => a + b, 0) / raw.length).toFixed(2);
    const rawMax = Math.max(...raw);
    const rawMin = Math.min(...raw);
    const rawDelta = (rawMax - rawMin).toFixed(1);

    const smaMean = validSma.length > 0 ? (validSma.reduce((a, b) => a + b, 0) / validSma.length).toFixed(2) : '-';
    const smaMax = validSma.length > 0 ? Math.max(...validSma) : '-';
    const smaMin = validSma.length > 0 ? Math.min(...validSma) : '-';
    const smaDelta = validSma.length > 0 ? (smaMax - smaMin).toFixed(1) : '-';

    const noiseReduction = hourlyData.noise_reduction_pct || 68.4;

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="p-4 rounded-xl glass-panel border border-cyan-500/30">
                <span class="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Sinyal Masukan Asli x[n]</span>
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">${rawDelta}°C <span class="text-xs font-normal text-slate-400">Rentang Fluktuasi</span></p>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1 font-mono">
                    <div>Rata-rata: ${rawMean}°C</div>
                    <div>Min / Max: ${rawMin}°C / ${rawMax}°C</div>
                </div>
            </div>

            <div class="p-4 rounded-xl glass-panel border border-amber-500/30">
                <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Sinyal Hasil Filter y[n]</span>
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">${smaDelta}°C <span class="text-xs font-normal text-slate-400">Rentang Halus</span></p>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1 font-mono">
                    <div>Rata-rata: ${smaMean}°C</div>
                    <div>Min / Max: ${smaMin}°C / ${smaMax}°C</div>
                </div>
            </div>

            <div class="p-4 rounded-xl glass-panel border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Efisiensi Reduksi Noise</span>
                <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">${noiseReduction}%</p>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Filter Low-Pass FIR berhasil meredam fluktuasi frekuensi tinggi sinyal cuaca.
                </p>
            </div>
        </div>
    `;
}

// --- Render Tabel Data Mentah & CSV ---
const HEADER_NAME_MAP = {
    'time': 'Waktu',
    'temperature_2m': 'Suhu (°C)',
    'temperature_sma': 'SMA Suhu (°C)',
    'temperature_ema': 'EMA Suhu (°C)',
    'relative_humidity_2m': 'Kelembapan (%)',
    'precipitation': 'Presipitasi (mm)',
    'wind_speed_10m': 'Angin (km/j)',
    'temperature_2m_max': 'Suhu Max (°C)',
    'temperature_2m_min': 'Suhu Min (°C)',
    'precipitation_sum': 'Total Presipitasi (mm)'
};

export function renderRawDataTable(dataObject, type = 'hourly', selectedFilters = []) {
    const rawTableHead = document.getElementById('raw-table-head');
    const rawTableBody = document.getElementById('raw-table-body');
    const dataTitle = document.getElementById('data-title');

    if (!rawTableHead || !rawTableBody) return;
    rawTableHead.innerHTML = '';
    rawTableBody.innerHTML = '';

    if (dataTitle) {
        dataTitle.textContent = type === 'hourly' ? "Data Mentah Sinyal Per Jam (Hourly)" : "Data Mentah Agregasi Harian (Daily)";
    }

    if (!dataObject || !dataObject.time || dataObject.time.length === 0) {
        rawTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-sm text-slate-400">Tidak ada data untuk ditampilkan.</td></tr>`;
        return;
    }

    const availableParams = Object.keys(dataObject);
    const visibleParams = ['time', ...selectedFilters.filter(p => p !== 'weather_id' && availableParams.includes(p))];
    
    // Sertakan SMA jika tersedia
    if (type === 'hourly' && availableParams.includes('temperature_sma') && !visibleParams.includes('temperature_sma')) {
        visibleParams.push('temperature_sma');
    }

    // Build Header
    let headerHTML = `<th class="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kondisi</th>`;
    visibleParams.forEach(param => {
        const title = HEADER_NAME_MAP[param] || param;
        headerHTML += `<th class="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${title}</th>`;
    });
    rawTableHead.innerHTML = `<tr>${headerHTML}</tr>`;

    // Build Rows
    const numRows = dataObject.time.length;
    for (let i = 0; i < numRows; i++) {
        const weatherId = dataObject.weather_id?.[i] || 800;
        const iconMeta = getWeatherMeta(weatherId);

        let rowHTML = `
            <td class="px-5 py-3.5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                    <i class="${iconMeta.icon} ${iconMeta.color} text-base w-5 text-center"></i>
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">${iconMeta.label}</span>
                </div>
            </td>
        `;

        visibleParams.forEach(param => {
            let val = dataObject[param]?.[i] ?? '-';
            if (typeof val === 'number') val = Math.round(val * 10) / 10;
            const isTime = param === 'time';
            rowHTML += `
                <td class="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200 ${isTime ? 'font-mono text-xs' : 'font-medium tabular-nums'}">
                    ${val}
                </td>
            `;
        });

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60";
        tr.innerHTML = rowHTML;
        rawTableBody.appendChild(tr);
    }
}

// --- Export CSV ---
export function exportTableToCSV(tableId = 'raw-data-table', filename = 'data-cuaca.csv') {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cols = [];
        row.querySelectorAll('th, td').forEach(col => {
            const text = col.innerText.replace(/"/g, '""').trim();
            cols.push(`"${text}"`);
        });
        csv.push(cols.join(','));
    });

    const csvFile = new Blob(["\uFEFF" + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvFile);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
