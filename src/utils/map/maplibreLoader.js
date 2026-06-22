const MAPLIBRE_VERSION = "3.6.2";
const CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const SCRIPT_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;

let loadPromise = null;

export const buildOsmFallbackStyle = () => ({
    version: 8,
    name: "OSM",
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
        osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
        },
    },
    layers: [
        {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 22,
        },
    ],
});

export const loadMapLibreGl = () => {
    if (typeof window !== "undefined" && window.maplibregl?.Map) {
        return Promise.resolve(window.maplibregl);
    }

    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        if (!document.getElementById("maplibre-css")) {
            const link = document.createElement("link");
            link.id = "maplibre-css";
            link.rel = "stylesheet";
            link.href = CSS_URL;
            document.head.appendChild(link);
        }

        const existing = document.getElementById("maplibre-script");
        if (existing) {
            const check = setInterval(() => {
                if (window.maplibregl?.Map) {
                    clearInterval(check);
                    resolve(window.maplibregl);
                }
            }, 50);
            setTimeout(() => {
                clearInterval(check);
                if (window.maplibregl?.Map) resolve(window.maplibregl);
                else {
                    loadPromise = null;
                    reject(new Error("MapLibre GL load timed out"));
                }
            }, 15000);
            return;
        }

        const script = document.createElement("script");
        script.id = "maplibre-script";
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            if (window.maplibregl?.Map) resolve(window.maplibregl);
            else {
                loadPromise = null;
                reject(new Error("MapLibre GL loaded but Map is unavailable"));
            }
        };
        script.onerror = () => {
            loadPromise = null;
            reject(new Error("MapLibre GL script failed to load"));
        };
        document.head.appendChild(script);
    });

    return loadPromise;
};
