// frontend/js/api.js

// Tentukan base URL secara cerdas (mendukung port 3000 maupun Live Server port lain)
const IS_SAME_ORIGIN = window.location.origin.includes('localhost:3000') || window.location.origin.includes('127.0.0.1:3000');
const BASE_URL = IS_SAME_ORIGIN ? '' : 'http://localhost:3000';

export const ENDPOINTS = {
    WEATHER: `${BASE_URL}/api/weather`,
    COMPARE: `${BASE_URL}/api/compare`,
    SEARCH: `${BASE_URL}/api/search`,
    HEALTH: `${BASE_URL}/api/health`,
};

/**
 * Fetch data cuaca lengkap + kalkulasi DSP SMA
 * @param {object} params
 * @param {string} [params.city]
 * @param {number} [params.lat]
 * @param {number} [params.lon]
 * @param {string[]} [params.hourly]
 * @param {string[]} [params.daily]
 * @param {number} [params.sma_window]
 * @returns {Promise<object>}
 */
export async function fetchWeatherData({ city, lat, lon, hourly = [], daily = [], sma_window = 4 }) {
    try {
        const payload = {
            hourly,
            daily,
            sma_window
        };
        if (city) payload.city = city;
        if (lat !== undefined && lon !== undefined) {
            payload.lat = lat;
            payload.lon = lon;
        }

        const response = await fetch(ENDPOINTS.WEATHER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: Gagal memuat data cuaca`);
        }

        return await response.json();
    } catch (error) {
        console.error('API weather error:', error);
        throw new Error(error.message || 'Tidak dapat terhubung ke server cuaca.');
    }
}

/**
 * Fetch komparasi multi kota untuk analisis grafik
 * @param {string[]} cities
 * @param {string} parameter
 * @returns {Promise<object>}
 */
export async function fetchCityComparison(cities = ['Bandung', 'Jakarta'], parameter = 'temperature_2m_max') {
    try {
        const response = await fetch(ENDPOINTS.COMPARE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cities, parameter })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: Gagal memuat komparasi`);
        }

        return await response.json();
    } catch (error) {
        console.error('API compare error:', error);
        throw new Error(error.message || 'Tidak dapat memuat komparasi kota.');
    }
}

/**
 * Autocomplete saran kota
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchCitySuggestions(query) {
    if (!query || query.trim().length < 2) return [];
    try {
        const response = await fetch(`${ENDPOINTS.SEARCH}?q=${encodeURIComponent(query.trim())}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.warn('Autocomplete fetch error:', error);
        return [];
    }
}

/**
 * Cek status server backend
 */
export async function checkServerHealth() {
    try {
        const res = await fetch(ENDPOINTS.HEALTH, { method: 'GET' });
        return res.ok;
    } catch {
        return false;
    }
}
