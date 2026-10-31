// frontend/js/map.js

let map = null;
let view = null;
let markerLayer = null;
let popupOverlay = null;
let clickCallback = null;

/**
 * Inisialisasi peta OpenLayers interaktif
 * @param {Function} [onMapClick] Callback saat user klik titik di peta
 */
export function initMap(onMapClick) {
    if (map) return; // Sudah diinisialisasi
    clickCallback = onMapClick;

    // View default: Bandung / Jawa Barat
    view = new ol.View({
        center: ol.proj.fromLonLat([107.6191, -6.9175]),
        zoom: 11,
        maxZoom: 18,
        minZoom: 3,
    });

    // Layer Peta Dasar (OpenStreetMap)
    const baseLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    // Custom SVG Pin Marker
    const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 24 32">
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#06b6d4" flood-opacity="0.8"/>
            </filter>
        </defs>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#0284c7" filter="url(#glow)"/>
        <circle cx="12" cy="12" r="5" fill="#ffffff"/>
        <circle cx="12" cy="12" r="2.5" fill="#06b6d4"/>
    </svg>`;
    const pinSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPin);

    // Layer untuk Marker
    markerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: pinSrc,
                scale: 1,
            })
        })
    });

    // Overlay Popup
    const popupContainer = document.getElementById('popup');
    const popupCloser = document.getElementById('popup-closer');
    
    if (popupContainer) {
        popupOverlay = new ol.Overlay({
            element: popupContainer,
            autoPan: {
                animation: { duration: 300 }
            },
            offset: [0, -42]
        });

        if (popupCloser) {
            popupCloser.onclick = function () {
                popupOverlay.setPosition(undefined);
                popupCloser.blur();
                return false;
            };
        }
    }

    // Bangun Peta
    map = new ol.Map({
        target: 'map',
        layers: [baseLayer, markerLayer],
        view: view,
        overlays: popupOverlay ? [popupOverlay] : []
    });

    // Event Klik di Peta untuk memilih lokasi baru
    map.on('singleclick', function (evt) {
        const coords = ol.proj.toLonLat(evt.coordinate);
        const lon = parseFloat(coords[0].toFixed(5));
        const lat = parseFloat(coords[1].toFixed(5));
        
        if (typeof clickCallback === 'function') {
            clickCallback(lat, lon);
        }
    });

    // Ubah cursor jadi pointer saat hover
    map.on('pointermove', function (e) {
        if (e.dragging) return;
        const pixel = map.getEventPixel(e.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
}

/**
 * Update lokasi penanda dan gerakkan kamera peta
 * @param {number} lat 
 * @param {number} lon 
 * @param {string} cityName 
 * @param {number} [temp] 
 * @param {string} [weatherDesc] 
 */
export function updateMapLocation(lat, lon, cityName, temp = null, weatherDesc = '') {
    if (!map) initMap();

    const coords = ol.proj.fromLonLat([lon, lat]);
    
    // Animasi terbang halus ke koordinat
    view.animate({
        center: coords,
        zoom: 11,
        duration: 900
    });

    // Bersihkan penanda lama
    markerLayer.getSource().clear();

    // Buat fitur penanda baru
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(coords),
        name: cityName,
        lat: lat,
        lon: lon
    });

    markerLayer.getSource().addFeature(marker);

    // Tampilkan Popup Info
    const popupContent = document.getElementById('popup-content');
    if (popupContent && popupOverlay) {
        const tempText = temp !== null ? `<span class="text-lg font-bold text-cyan-600 dark:text-cyan-400 ml-1">${Math.round(temp)}°C</span>` : '';
        const descText = weatherDesc ? `<p class="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">${weatherDesc}</p>` : '';
        
        popupContent.innerHTML = `
            <div class="flex items-start gap-2">
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-gray-900 dark:text-white">${cityName}</span>
                        ${tempText}
                    </div>
                    ${descText}
                    <div class="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">
                        ${lat.toFixed(4)}°, ${lon.toFixed(4)}°
                    </div>
                </div>
            </div>
        `;
        popupOverlay.setPosition(coords);
    }
}
