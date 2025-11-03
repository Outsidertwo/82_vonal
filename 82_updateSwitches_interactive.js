// ===========================================
// ⚡ TOPOLOGIA ALAPÚ VEZETÉKSZÍNEZÉS + SZAKASZOLÓ KEZELÉS
//    Feed csoportok statikusak, szakaszolók és csoportok dinamikusak
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
// 2️⃣ FEED PONTOK KEZELÉSE (mindig aktív, statikus szín)
// ===========================================
function applyFeeds() {
    if (!topologyData.feeds) return;

    Object.entries(topologyData.feeds).forEach(([feedName, feed]) => {
        const nodeId = feed.node;
        const phase = feed.phase;
        const colorKey = `${phase}_jobb`; // vagy _bal
        const color = topologyData.szinek[colorKey] || "#FFFF00";

        const elem = document.getElementById(nodeId);
        if (elem) {
            elem.style.stroke = color;
            elem.style.fill = "none";
        }

        // Feed csoport mindig aktív
        const groupElem = document.getElementById(feed.group);
        if (groupElem) {
            setGroupColor(groupElem, color);
        }

        wireColors[nodeId] = color;
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
            elem.style.fill = "none";
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
// 5️⃣ SZAKASZOLÓK ÉS CSOPORTOK ÁLLAPOT SZÁMÍTÁS
// ===========================================
function updateSwitchVisual(switchId) {
    const info = switchData[switchId];
    const elem = document.getElementById(switchId);
    if (!elem) return;

    const groupId = info.group;
    const groupElem = document.getElementById(groupId);
    if (!groupElem) return;

    // Feed csoportokat nem módosítunk
    if (topologyData.feeds && Object.values(topologyData.feeds).some(f => f.group === groupId)) {
        // Feed csoport statikus, szín már beállítva
        elem.style.stroke = wireColors[switchId] || "#00FF00";
        elem.style.fill = "none";
        return;
    }

    // Ha szakaszoló zárt → aktív szín mindkettőn
    if (info.state === "closed") {
        const color = wireColors[groupId] || "#00FF00";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = "none";
    } else {
        // Nyitott szakaszoló → ellenőrizzük a csoport többi aktív elemét
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
// 6️⃣ CSOPORTSZÍN ALKALMAZÁSA
// ===========================================
function setGroupColor(groupElem, color) {
    groupElem.querySelectorAll("*").forEach(child => {
        child.style.stroke = color;
        child.style.fill = "none";
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
    applyFeeds();       // Feed pontok statikus, mindig aktív
    applyWireColors();  // alap színek
    await loadSwitchData();
}

init();
