const DEFAULT_CENTER = [21.4225, 39.8262];
const DEFAULT_ZOOM = 17;

const fallbackKiosks = [
    { name: "1", lat: 21.42296, lng: 39.82602 },
    { name: "2", lat: 21.4232, lng: 39.82652 },
    { name: "3", lat: 21.42345, lng: 39.8271 },
    { name: "4", lat: 21.42238, lng: 39.82754 },
    { name: "5", lat: 21.42174, lng: 39.8272 },
    { name: "6", lat: 21.42115, lng: 39.82662 },
    { name: "7", lat: 21.42072, lng: 39.8258 },
    { name: "8", lat: 21.42105, lng: 39.82512 },
    { name: "9", lat: 21.42182, lng: 39.82472 },
    { name: "10", lat: 21.42255, lng: 39.8249 },
    { name: "11", lat: 21.42395, lng: 39.82588 },
    { name: "12", lat: 21.4242, lng: 39.82682 },
    { name: "13", lat: 21.42032, lng: 39.82532 },
    { name: "14", lat: 21.42002, lng: 39.82628 },
    { name: "15", lat: 21.42092, lng: 39.82782 }
];

const map = L.map("map", {
    zoomControl: true
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
const kioskLayer = L.layerGroup().addTo(map);
const reportLayer = L.layerGroup().addTo(map);
const userLayer = L.layerGroup().addTo(map);
let hasFitMap = false;
const urlParams = new URLSearchParams(window.location.search);
const isAppView = urlParams.get("app") === "1";
const focusLat = Number(urlParams.get("lat"));
const focusLng = Number(urlParams.get("lng"));
const focusReportId = urlParams.get("reportId");
const hasFocusPoint = Number.isFinite(focusLat) && Number.isFinite(focusLng);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const kioskIcon = L.divIcon({
    className: "",
    html: '<div class="kiosk-marker"></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const userIcon = L.divIcon({
    className: "",
    html: '<div class="user-marker"></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

if (isAppView) {
    document.body.classList.add("app-view");
} else {
    document.getElementById("backBtn").addEventListener("click", () => {
        window.location.href = "/reportType.html";
    });
}

function kioskLabel(name) {
    return String(name).toLowerCase().startsWith("kiosk") ? String(name) : `kiosk${name}`;
}

function getReportVisual(type = "") {
    const normalizedType = type.toLowerCase();

    if (
        normalizedType.includes("medical") ||
        normalizedType.includes("طبي") ||
        normalizedType.includes("حريق")
    ) {
        return { icon: "+", color: "#e53935", label: "بلاغ طبي" };
    }

    if (
        normalizedType.includes("security") ||
        normalizedType.includes("أمني") ||
        normalizedType.includes("أمن")
    ) {
        return { icon: "!", color: "#0b8f5a", label: "بلاغ أمني" };
    }

    if (
        normalizedType.includes("lost_items") ||
        normalizedType.includes("lost") ||
        normalizedType.includes("مفقودات")
    ) {
        return { icon: "?", color: "#1d75d8", label: "مفقودات" };
    }

    return { icon: "i", color: "#607d8b", label: "بلاغ عام" };
}

function reportPopup(report, visual) {
    const screenNumber = report.screenNumber || report.screen_number || "";
    const hajjName = report.full_name || "غير متوفر";
    const phone = report.phone || "غير متوفر";

    return `
        <div class="report-popup" dir="rtl">
            <strong>${visual.label}</strong>
            <span>${report.description || ""}</span>
            <small>${screenNumber ? `الشاشة: ${screenNumber}` : "موقع البلاغ"}</small>
            <small>الحاج: ${hajjName}</small>
            <small>الجوال: ${phone}</small>
        </div>
    `;
}

function reportIcon(visual) {
    return L.divIcon({
        className: "",
        html: `<div class="report-marker" style="background:${visual.color}">${visual.icon}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
    });
}

function groupReportsByLocation(reports) {
    return reports.reduce((groups, report) => {
        const key = `${report.location.lat.toFixed(6)},${report.location.lng.toFixed(6)}`;

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(report);
        return groups;
    }, {});
}

function spreadReportPoint(report, index, total) {
    if (total <= 1) {
        return [report.location.lat, report.location.lng];
    }

    const angle = (Math.PI * 2 * index) / total;
    const radius = 0.00018 + Math.floor(index / 8) * 0.00008;

    return [
        report.location.lat + Math.sin(angle) * radius,
        report.location.lng + Math.cos(angle) * radius
    ];
}

function renderKiosks(kiosks) {
    const bounds = [];
    kioskLayer.clearLayers();

    kiosks.forEach((kiosk) => {
        if (typeof kiosk.lat !== "number" || typeof kiosk.lng !== "number") {
            return;
        }

        const point = [kiosk.lat, kiosk.lng];
        bounds.push(point);

        L.marker(point, { icon: kioskIcon })
            .addTo(kioskLayer)
            .bindTooltip(kioskLabel(kiosk.name), {
                permanent: true,
                direction: "top",
                offset: [0, -12],
                className: "map-label"
            });
    });

    return bounds;
}

function renderReports(reports) {
    const bounds = [];
    const activeReports = reports.filter(report => (
        report.status !== "resolved" &&
        report.status !== "failed" &&
        typeof report.location?.lat === "number" &&
        typeof report.location?.lng === "number"
    ));
    const reportsByLocation = groupReportsByLocation(activeReports);

    reportLayer.clearLayers();

    Object.values(reportsByLocation).forEach((locationReports) => {
        locationReports.forEach((report, index) => {
            const visual = getReportVisual(report.type);
            const point = spreadReportPoint(report, index, locationReports.length);
            bounds.push(point);

            const marker = L.marker(point, { icon: reportIcon(visual), zIndexOffset: 500 })
                .addTo(reportLayer)
                .bindTooltip(visual.label, {
                    permanent: false,
                    direction: "top",
                    offset: [0, -16],
                    className: "map-label"
                })
                .bindPopup(reportPopup(report, visual));

            if (focusReportId && (report._id === focusReportId || report.id === focusReportId)) {
                setTimeout(() => marker.openPopup(), 300);
            }
        });
    });

    return bounds;
}

function renderUserLocation() {
    if (!navigator.geolocation) {
        addUserMarker(DEFAULT_CENTER);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            addUserMarker([position.coords.latitude, position.coords.longitude]);
        },
        () => addUserMarker(DEFAULT_CENTER),
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
    );
}

function addUserMarker(point) {
    userLayer.clearLayers();

    L.marker(point, { icon: userIcon })
        .addTo(userLayer)
        .bindTooltip("You're Here", {
            permanent: true,
            direction: "right",
            offset: [14, 0],
            className: "map-label"
        });
}

async function loadMapData() {
    try {
        const requests = [fetch("/api/kiosks")];

        if (isAppView) {
            requests.push(fetch("/api/reports"));
        }

        const [kiosksResponse, reportsResponse] = await Promise.all(requests);

        if (!kiosksResponse.ok || (isAppView && !reportsResponse.ok)) {
            throw new Error("Failed to load map data");
        }

        const kiosks = await kiosksResponse.json();
        const reports = isAppView ? await reportsResponse.json() : [];

        const kioskBounds = renderKiosks(kiosks.length >= fallbackKiosks.length ? kiosks : fallbackKiosks);
        const reportBounds = isAppView ? renderReports(reports) : [];
        const bounds = [...kioskBounds, ...reportBounds];

        if (!hasFitMap && hasFocusPoint) {
            map.setView([focusLat, focusLng], 18);
            hasFitMap = true;
        } else if (!hasFitMap && bounds.length > 1) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: DEFAULT_ZOOM });
            hasFitMap = true;
        }
    } catch (error) {
        console.error(error);
        renderKiosks(fallbackKiosks);
    }
}

loadMapData();
renderUserLocation();
setInterval(loadMapData, 5000);
