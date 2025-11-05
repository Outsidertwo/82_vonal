// ===========================================
// ⚡ SZAKASZOLÓK INTERAKTÍV KEZELÉSE
// ===========================================

// Lokális adatok
let switchData = {};  // szakaszolók állapota

// ===========================================
// 1️⃣ SZAKASZOLÓ ADATOK BETÖLTÉSE
// ===========================================
async function loadSwitchData() {
    try {
        const response = await fetch("82_switch_states.json");
        const data = await response.json();
        const switches = data.switch_states ? data.switch_states : data;
        switchData = switches;

        console.log("✅ Betöltve:", Object.keys(switches).length, "szakaszoló");

        Object.entries(switches).forEach(([id, info]) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn("Hiányzó switch elem az SVG-ben:", id);
                return;
            }

            element.style.cursor = "pointer";
            updateSwitchVisual(id);
            rotateSwitch(element, info.state === "open" ? 30 : 0);

            element.addEventListener("click", () => toggleSwitch(id));
        });

    } catch (e) {
        console.error("❌ Hiba a szakaszolók betöltésekor:", e);
    }
}

// ===========================================
// 2️⃣ SZAKASZOLÓ VIZUÁLIS FRISSÍTÉS
// ===========================================
function updateSwitchVisual(switchId) {
    const info = switchData[switchId];
    const elem = document.getElementById(switchId);
    if (!elem) return;

    const groupId = info.group;
    const groupElem = document.getElementById(groupId);
    if (!groupElem) return;

    // Feed csoportot nem módosítunk
    if (topologyData.feeds && Object.values(topologyData.feeds).some(f => f.group === groupId)) {
        elem.style.stroke = wireColors[switchId] || "#00FF00";
        elem.style.fill = "none";
        return;
    }

    if (info.state === "closed") {
        const color = wireColors[groupId] || "#00FF00";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = "none";
    } else {
        let anyActive = false;
        groupElem.querySelectorAll("*").forEach(child => {
            const id = child.id;
            if (switchData[id] && switchData[id].state === "closed") anyActive = true;
            else if (wireColors[id] && id !== switchId) anyActive = true;
        });

        const color = anyActive ? (wireColors[groupId] || "#808080") : "#000000";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = "none";
    }
}

// ===========================================
// 3️⃣ SZAKASZOLÓ FORGATÁS
// ===========================================
function rotateSwitch(elem, angle) {
    const box = elem.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const current = elem.getAttribute("transform") || "";
    const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim();
    elem.setAttribute("transform", `${cleaned} rotate(${angle}, ${cx}, ${cy})`);
}

// ===========================================
// 4️⃣ KATTINTÁS → ÁLLAPOTVÁLTÁS
// ===========================================
function toggleSwitch(id) {
    const info = switchData[id];
    const elem = document.getElementById(id);

    info.state = (info.state === "closed") ? "open" : "closed";
    updateSwitchVisual(id);
    rotateSwitch(elem, info.state === "open" ? 30 : 0);

    console.log(`🔁 Szakaszoló ${id} → ${info.state}`);
}

// ===========================================
// 5️⃣ INICIALIZÁLÁS
// ===========================================
async function init() {
    await loadTopologyColors();
    applyFeeds();
    applyWireColors();
    await loadSwitchData();
}

init();
