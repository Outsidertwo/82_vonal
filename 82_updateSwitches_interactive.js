// ===========================================
// ⚡ TOPOLOGIA ALAPÚ VEZETÉKSZÍNEZÉS + SZAKASZOLÓ KEZELÉS
// ===========================================

// 🌍 Globális változók
let wireColors = {};     // aktív vezetékek színei
let szinTabla = {};      // A/B/C fázis színtérkép
let switchData = {};     // szakaszolók állapota
let topologyData = {};   // a teljes topológiai JSON

// ===========================================
// 1️⃣ TOPOLOGIA ÉS SZÍNEK BETÖLTÉSE
// ===========================================
async function loadTopologyColors() {
    try {
        const response = await fetch("82_topologia.json");
        const topo = await response.json();
        topologyData = topo;

        szinTabla = topo.szinek;
        // Alapszínek hozzárendelése a vezetékekhez
        Object.values(topo.stations).forEach(station => {
            Object.entries(station.nodes).forEach(([id, node]) => {
                if (node.fazis && node.oldal) {
                    const kulcs = `${node.fazis}_${node.oldal}`;
                    if (szinTabla[kulcs]) wireColors[id] = szinTabla[kulcs];
                } else if (node.type === "gyujtosin") {
                    wireColors[id] = szinTabla.gyujtosin || "#CC9900";
                }
            });
        });

        console.log("Vezeték színek betöltve:", Object.keys(wireColors).length);
    } catch (e) {
        console.error("Nem sikerült betölteni a topológiát:", e);
    }
}

// ===========================================
// 2️⃣ FEED PONTOK KEZELÉSE (mindig feszültség alatt)
// ===========================================
function applyFeeds() {
    if (!topologyData.feeds) return;

    Object.entries(topologyData.feeds).forEach(([feedName, feed]) => {
        const nodeId = feed.node;
        const phase = feed.phase;
        const colorKey = `${phase}_jobb`; // vagy _bal, ha kell
        const color = topologyData.szinek[colorKey] || "#FFFF00";

        const elem = document.getElementById(nodeId);
        if (elem) {
            elem.style.stroke = color;
            elem.style.fill = "none";
        }

        wireColors[nodeId] = color; // feszültség alatt van
        console.log(`Feed aktív: ${nodeId} (${phase})`);
    });
}

// ===========================================
// 3️⃣ VEZETÉKEK SZÍNEZÉSE SVG-BEN
// ===========================================
function applyWireColors() {
    Object.entries(wireColors).forEach(([nodeId, color]) => {
        const elem = document.getElementById(nodeId);
        if (elem) {
            elem.style.stroke = color;
            elem.style.fill = "none"; // csak stroke, nincs kitöltés
        }
    });
}

// ===========================================
// 4️⃣ SZAKASZOLÓ ADATOK BETÖLTÉSE
// ===========================================
async function loadSwitchData() {
    try {
        const response = await fetch("82_switch_states.json");
        const data = await response.json();
        const switches = data.switch_states ? data.switch_states : data;
        switchData = switches;

        console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

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
        console.error("Hiba a szakaszolók betöltésekor:", e);
    }
}

// ===========================================
// 5️⃣ SZAKASZOLÓK SZÍNEZÉSE ÉS CSOPORTSZÍN
// ===========================================
function updateSwitchVisual(switchId) {
    const info = switchData[switchId];
    const elem = document.getElementById(switchId);
    if (!elem) return;

    const groupId = info.group;
    const groupElem = document.getElementById(groupId);
    if (!groupElem) return;

    // Ha zárt → a csoport színét a fázis alapján vesszük
    if (info.state === "closed") {
        let color = wireColors[groupId] || "#00FF00";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = "none";
    } else {
        // Nyitott: ha nincs a csoportban aktív vezeték, legyen fekete
        let anyActive = false;
        groupElem.querySelectorAll("*").forEach(child => {
            const id = child.id;
            if (wireColors[id] && id !== switchId) anyActive = true;
        });

        const color = anyActive ? (wireColors[groupId] || "#808080") : "#000000";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = "none";
    }
}

// ===========================================
// 6️⃣ CSOPORTSZÍN ALKALMAZÁSA
// ===========================================
function setGroupColor(groupElem, color) {
    groupElem.querySelectorAll("*").forEach(child => {
        child.style.stroke = color;
        child.style.fill = "none"; // nem töltünk ki semmit
    });
}

// ===========================================
// 7️⃣ SZAKASZOLÓ FORGATÁS
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
// 8️⃣ KATTINTÁS → ÁLLAPOTVÁLTÁS
// ===========================================
function toggleSwitch(id) {
    const info = switchData[id];
    const elem = document.getElementById(id);

    info.state = (info.state === "closed") ? "open" : "closed";
    updateSwitchVisual(id);
    rotateSwitch(elem, info.state === "open" ? 30 : 0);

    console.log(`Szakaszoló ${id} → ${info.state}`);
}

// ===========================================
// 9️⃣ INICIALIZÁLÁS
// ===========================================
async function init() {
    await loadTopologyColors();
    applyFeeds();       // mindig feszültség alatt lévő pontok
    applyWireColors();  // alap színek
    await loadSwitchData();
}

init();
