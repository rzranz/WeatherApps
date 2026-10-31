// frontend/js/main.js

import { fetchWeatherData, fetchCityComparison, searchCitySuggestions } from './api.js';
import {
    getCheckedValues, setButtonLoading, displayError, clearError,
    getCityInput, setCityInput,
    renderCurrentWeather, renderForecast5Day, renderHourlyCards,
    renderSMAChart, renderComparisonChart, renderDSPLab,
    renderRawDataTable, exportTableToCSV
} from './ui.js';
import { initMap, updateMapLocation } from './map.js';

// --- State Aplikasi ---
let currentWeatherData = null;
let currentCityName = 'Bandung';
let compareCities = ['Bandung', 'Jakarta', 'Surabaya'];
const LAST_CITY_KEY = 'weatherAppLastCity';

// --- Seleksi Elemen DOM ---
const fetchButton = document.getElementById('fetch-button');
const cityInputElement = document.getElementById('city-input');
const gpsButton = document.getElementById('btn-gps');
const autocompleteList = document.getElementById('autocomplete-list');
const toggleSma = document.getElementById('toggle-sma');
const toggleEma = document.getElementById('toggle-ema');
const smaWindowSelect = document.getElementById('sma-window-size');
const exportCsvBtn = document.getElementById('export-csv-button');

// Navigasi Tabs
const navDashboard = document.getElementById('nav-dashboard');
const navCompare = document.getElementById('nav-compare');
const navDsp = document.getElementById('nav-dsp');
const navRawData = document.getElementById('nav-raw-data');

const pageDashboard = document.getElementById('page-dashboard');
const pageCompare = document.getElementById('page-compare');
const pageDsp = document.getElementById('page-dsp');
const pageRawData = document.getElementById('page-raw-data');

// Komparasi Elemen
const compareCityInput = document.getElementById('compare-city-input');
const btnAddCompareCity = document.getElementById('btn-add-compare-city');
const compareCityTags = document.getElementById('compare-city-tags');
const btnRunCompare = document.getElementById('btn-run-compare');
const compareParamSelect = document.getElementById('compare-param-select');

// Quick City Pills
const quickCityPills = document.querySelectorAll('.quick-city-pill');

// Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
const docElement = document.documentElement;

// --- Logika Tema (Dark / Light) ---
function setTheme(isDark) {
    docElement.classList.toggle('dark', isDark);
    localStorage.theme = isDark ? 'dark' : 'light';

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = isDark
            ? "fas fa-sun text-amber-400 text-base"
            : "fas fa-moon text-slate-700 text-base";
    }

    // Refresh charts dengan warna tema baru
    if (currentWeatherData?.hourly) {
        renderSMAChart(currentWeatherData.hourly);
    }
}

function initTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && prefersDark);
    setTheme(isDark);
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        setTheme(!docElement.classList.contains('dark'));
    });
}

// --- Navigasi Tab System ---
const navTabs = [
    { btn: navDashboard, page: pageDashboard, id: 'dashboard' },
    { btn: navCompare, page: pageCompare, id: 'compare' },
    { btn: navDsp, page: pageDsp, id: 'dsp' },
    { btn: navRawData, page: pageRawData, id: 'raw-data' }
];

function switchTab(activeId) {
    navTabs.forEach(tab => {
        if (!tab.btn || !tab.page) return;
        const isActive = tab.id === activeId;
        tab.page.classList.toggle('hidden', !isActive);

        if (isActive) {
            tab.btn.className = "px-4 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 text-white shadow-md shadow-cyan-500/25 flex items-center gap-2 transition-all";
        } else {
            tab.btn.className = "px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-all";
        }
    });

    if (activeId === 'compare') {
        runCityComparison();
    }
}

navTabs.forEach(tab => {
    if (tab.btn) {
        tab.btn.addEventListener('click', () => switchTab(tab.id));
    }
});

// --- Inisialisasi Aplikasi Saat Memuat ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Inisialisasi Map dengan callback interaktif saat klik
    initMap((lat, lon) => {
        fetchByCoordinates(lat, lon);
    });

    // Muat kota tersimpan atau default Bandung
    const savedCity = localStorage.getItem(LAST_CITY_KEY) || 'Bandung';
    setCityInput(savedCity);
    handleFetch(savedCity);

    // Render kota komparasi awal
    renderCompareCityTags();
});

// --- Handler Fetch Utama (Berdasarkan Kota) ---
async function handleFetch(cityQuery = null) {
    const city = cityQuery || getCityInput();
    if (!city) {
        displayError("Silakan masukkan nama kota terlebih dahulu.");
        return;
    }

    clearError();
    setButtonLoading(true);

    const smaWindow = parseInt(smaWindowSelect?.value) || 4;
    const hourlyFilters = getCheckedValues('hourly-filters');
    const dailyFilters = getCheckedValues('daily-filters');

    try {
        const weatherData = await fetchWeatherData({
            city,
            hourly: hourlyFilters,
            daily: dailyFilters,
            sma_window: smaWindow
        });

        currentWeatherData = weatherData;
        currentCityName = weatherData.city || city;
        localStorage.setItem(LAST_CITY_KEY, currentCityName);
        setCityInput(currentCityName);

        // 1. Render Dashboard
        renderCurrentWeather(weatherData);
        if (weatherData.hourly) {
            renderHourlyCards(weatherData.hourly);
            renderSMAChart(weatherData.hourly);
            renderDSPLab(weatherData.hourly);
        }
        if (weatherData.daily) {
            renderForecast5Day(weatherData.daily);
        }

        // 2. Render Tabel Data Mentah
        updateRawTable();

        // 3. Update Peta OpenLayers
        if (weatherData.lat && weatherData.lon) {
            const temp = weatherData.current?.temp ?? weatherData.hourly?.temperature_2m?.[0];
            const desc = weatherData.current?.weather_desc ?? weatherData.hourly?.weather_desc?.[0];
            updateMapLocation(weatherData.lat, weatherData.lon, currentCityName, temp, desc);
        }

    } catch (error) {
        displayError(error.message);
    } finally {
        setButtonLoading(false);
    }
}

// --- Handler Fetch Berdasarkan Koordinat GPS / Klik Peta ---
async function fetchByCoordinates(lat, lon) {
    clearError();
    setButtonLoading(true);

    const smaWindow = parseInt(smaWindowSelect?.value) || 4;
    const hourlyFilters = getCheckedValues('hourly-filters');
    const dailyFilters = getCheckedValues('daily-filters');

    try {
        const weatherData = await fetchWeatherData({
            lat,
            lon,
            hourly: hourlyFilters,
            daily: dailyFilters,
            sma_window: smaWindow
        });

        currentWeatherData = weatherData;
        currentCityName = weatherData.city || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        setCityInput(currentCityName);
        localStorage.setItem(LAST_CITY_KEY, currentCityName);

        renderCurrentWeather(weatherData);
        if (weatherData.hourly) {
            renderHourlyCards(weatherData.hourly);
            renderSMAChart(weatherData.hourly);
            renderDSPLab(weatherData.hourly);
        }
        if (weatherData.daily) {
            renderForecast5Day(weatherData.daily);
        }

        updateRawTable();
        const temp = weatherData.current?.temp ?? weatherData.hourly?.temperature_2m?.[0];
        const desc = weatherData.current?.weather_desc ?? weatherData.hourly?.weather_desc?.[0];
        updateMapLocation(lat, lon, currentCityName, temp, desc);

    } catch (error) {
        displayError(error.message);
    } finally {
        setButtonLoading(false);
    }
}

// --- Event Listener Tombol GPS (Lokasi Saya) ---
if (gpsButton) {
    gpsButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            displayError("Browser Anda tidak mendukung geolokasi GPS.");
            return;
        }

        const gpsIcon = document.getElementById('gps-icon');
        if (gpsIcon) {
            gpsIcon.className = "fas fa-circle-notch fa-spin text-sm text-cyan-500";
        }
        gpsButton.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (gpsIcon) {
                    gpsIcon.className = "fas fa-crosshairs text-sm text-slate-500 dark:text-slate-400";
                }
                gpsButton.disabled = false;
                fetchByCoordinates(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                if (gpsIcon) {
                    gpsIcon.className = "fas fa-crosshairs text-sm text-slate-500 dark:text-slate-400";
                }
                gpsButton.disabled = false;
                displayError("Tidak dapat mengakses GPS: " + err.message);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    });
}

// --- Form Submit & Input Events ---
if (fetchButton) {
    fetchButton.addEventListener('click', () => handleFetch());
}

if (cityInputElement) {
    cityInputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            closeAutocomplete();
            handleFetch();
        }
    });

    // Autocomplete Input dengan Debounce
    let debounceTimer = null;
    cityInputElement.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
            closeAutocomplete();
            return;
        }

        debounceTimer = setTimeout(async () => {
            const suggestions = await searchCitySuggestions(query);
            showAutocomplete(suggestions);
        }, 300);
    });
}

function showAutocomplete(suggestions) {
    if (!autocompleteList) return;
    if (!suggestions || suggestions.length === 0) {
        closeAutocomplete();
        return;
    }

    autocompleteList.innerHTML = '';
    suggestions.forEach(item => {
        const li = document.createElement('li');
        li.className = "px-4 py-2.5 hover:bg-cyan-50 dark:hover:bg-slate-800 cursor-pointer text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between";
        li.innerHTML = `
            <div>
                <span class="font-bold">${item.name}</span>
                <span class="text-xs text-slate-400 block">${item.state ? item.state + ', ' : ''}${item.country}</span>
            </div>
            <i class="fas fa-arrow-right text-xs text-slate-400"></i>
        `;
        li.addEventListener('click', () => {
            setCityInput(item.name);
            closeAutocomplete();
            fetchByCoordinates(item.lat, item.lon);
        });
        autocompleteList.appendChild(li);
    });

    autocompleteList.classList.remove('hidden');
}

function closeAutocomplete() {
    if (autocompleteList) {
        autocompleteList.classList.add('hidden');
        autocompleteList.innerHTML = '';
    }
}

document.addEventListener('click', (e) => {
    if (cityInputElement && !cityInputElement.contains(e.target) && autocompleteList && !autocompleteList.contains(e.target)) {
        closeAutocomplete();
    }
});

// Quick City Pills
quickCityPills.forEach(pill => {
    pill.addEventListener('click', () => {
        const city = pill.dataset.city;
        if (city) {
            setCityInput(city);
            handleFetch(city);
        }
    });
});

// --- DSP Toggles & Window Size Change ---
if (toggleSma) {
    toggleSma.addEventListener('change', () => {
        if (currentWeatherData?.hourly) renderSMAChart(currentWeatherData.hourly);
    });
}

if (toggleEma) {
    toggleEma.addEventListener('change', () => {
        if (currentWeatherData?.hourly) renderSMAChart(currentWeatherData.hourly);
    });
}

if (smaWindowSelect) {
    smaWindowSelect.addEventListener('change', () => {
        handleFetch(currentCityName);
    });
}

// Checkbox Filter Data Mentah
['hourly-filters', 'daily-filters'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', () => updateRawTable());
    }
});

function updateRawTable() {
    if (!currentWeatherData) return;
    const hourlyFilters = getCheckedValues('hourly-filters');
    const dailyFilters = getCheckedValues('daily-filters');

    const tableType = document.querySelector('input[name="raw-type"]:checked')?.value || 'hourly';

    if (tableType === 'hourly' && currentWeatherData.hourly) {
        renderRawDataTable(currentWeatherData.hourly, 'hourly', hourlyFilters);
    } else if (tableType === 'daily' && currentWeatherData.daily) {
        renderRawDataTable(currentWeatherData.daily, 'daily', dailyFilters);
    }
}

// Table Type Radio Toggle
document.querySelectorAll('input[name="raw-type"]').forEach(radio => {
    radio.addEventListener('change', updateRawTable);
});

// Export CSV Button
if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
        const timestamp = new Date().toISOString().slice(0, 10);
        exportTableToCSV('raw-data-table', `data-cuaca-${currentCityName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.csv`);
    });
}

// --- Fitur Komparasi Multi-Kota ---
function renderCompareCityTags() {
    if (!compareCityTags) return;
    compareCityTags.innerHTML = '';

    compareCities.forEach((city, index) => {
        const tag = document.createElement('span');
        tag.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700/60";
        tag.innerHTML = `
            <span>${city}</span>
            <button type="button" class="hover:text-red-500 transition-colors ml-1" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;

        tag.querySelector('button').addEventListener('click', () => {
            compareCities.splice(index, 1);
            renderCompareCityTags();
        });

        compareCityTags.appendChild(tag);
    });
}

if (btnAddCompareCity && compareCityInput) {
    const addCity = () => {
        const val = compareCityInput.value.trim();
        if (val && !compareCities.includes(val)) {
            if (compareCities.length >= 5) {
                alert("Maksimal 5 kota untuk perbandingan.");
                return;
            }
            compareCities.push(val);
            renderCompareCityTags();
            compareCityInput.value = '';
        }
    };

    btnAddCompareCity.addEventListener('click', addCity);
    compareCityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCity();
        }
    });
}

if (btnRunCompare) {
    btnRunCompare.addEventListener('click', runCityComparison);
}

if (compareParamSelect) {
    compareParamSelect.addEventListener('change', runCityComparison);
}

async function runCityComparison() {
    if (compareCities.length === 0) return;
    const param = compareParamSelect?.value || 'temperature_2m_max';

    try {
        if (btnRunCompare) btnRunCompare.disabled = true;
        const res = await fetchCityComparison(compareCities, param);
        renderComparisonChart(res, param);
    } catch (err) {
        displayError("Komparasi gagal: " + err.message);
    } finally {
        if (btnRunCompare) btnRunCompare.disabled = false;
    }
}
