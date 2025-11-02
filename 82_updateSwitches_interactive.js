// ===========================================
// 🎨 TOPOLOGIA ALAPÚ SZÍNEZÉS ÉS SWITCH KEZELÉS
// ===========================================

// 1️⃣ Globális változók a vezetékek és színek kezeléséhez
let wireColors = {}; // minden vezetékhez tartozó szín
let szinTabla = {};  // az A/B/C fázis színtérkép
let switchData = {}; // a szakaszolók állapota és csoportja

// ===========================================
// 🔹 2️⃣ ALAPSZÍNEK BETÖLTÉSE
// ===========================================
async function loadTopologyColors() {
    try {
        const response = await fetch("82_topologia.json"); // topológia betöltése
        const topo = await response.json();

        szinTabla = topo.szinek; // színek táblázat mentése

        // végigmegyünk az összes állomáson és node-on
        Object.values(topo.stations).forEach(station => {
            Object.entries(station.nodes).forEach(([id, node]) => {
                if (node.fazis && node.oldal) {
                    const kulcs = `${node.fazis}_${node.oldal}`;
                    if (szinTabla[kulcs]) wireColors[id] = szinTabla[kulcs]; // fázis alapú szín
                } else if (node.type === "gyujtosin") {
                    wireColors[id] = szinTabla.gyujtosin || "#CC9900"; // gyűjtősín
                }
            });
        });

        console.log("Vezeték színek betöltve:", Object.keys(wireColors).length);

    } catch (e) {
        console.warn("Nem sikerült betölteni a topológiai színeket:", e);
    }
}

// ===========================================
// 🔹 SZÍNEK ALKALMAZÁSA AZ SVG-BEN (vezetékek)
// ===========================================
function applyWireColors() {
    Object.entries(wireColors).forEach(([nodeId, color]) => {
        const elem = document.getElementById(nodeId);
        if (elem) {
            // Csak a stroke-ot állítjuk, a fill-t csak ha kifejezetten kell
            elem.style.stroke = color;
        } else {
            console.warn("Hiányzó vezeték elem az SVG-ben:", nodeId);
        }
    });
}

// ===========================================
// 🔹 SWITCH ADATOK BETÖLTÉSE ÉS INIT
// ===========================================
async function loadSwitchData() {
    try {
        const response = await fetch("82_switch_states.json"); // switch állapotok
        const data = await response.json();
        const switches = data.switch_states ? data.switch_states : data;

        console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

        switchData = switches; // globális tárolás

        // minden switch-et inicializálunk
        Object.entries(switches).forEach(([id, info]) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn("Hiányzó switch elem az SVG-ben:", id);
                return;
            }

            element.style.cursor = "pointer"; // kattinthatóság

            // szín beállítása
            updateSwitchVisual(id);

            // forgatás az állapotnak megfelelően
            rotateSwitch(element, info.state === "open" ? 30 : 0);

            // kattintás esemény
            element.addEventListener("click", () => toggleSwitch(id));
        });

    } catch (error) {
        console.error("Betöltési hiba:", error);
    }
}

// ===========================================
// 🔹 SWITCH SZÍNEZÉS (állapot + csoport + vezetékek)
// ===========================================
function updateSwitchVisual(switchId) {
    const info = switchData[switchId];
    const elem = document.getElementById(switchId);
    if (!elem) return;

    const groupId = info.group;
    const groupElem = document.getElementById(groupId);
    if (!groupElem) return;

    // 🟢 Zárt szakaszoló → a csoport színe (wireColors alapján)
    if (info.state === "closed") {
        let color = wireColors[groupId] || "#00FF00";
        setGroupColor(groupElem, color);
        elem.style.stroke = color;
        elem.style.fill = lightenColor(color, 0.4);

    // ⚫ Nyitott szakaszoló → fekete, ha minden táplálás megszűnt
    } else if (info.state === "open") {
        // ellenőrizni a csoport vezetékét
        let anyActive = false;
        groupElem.querySelectorAll("path, circle, rect, ellipse").forEach(child => {
            const childId = child.id;
            if (wireColors[childId] && childId !== switchId) anyActive = true;
        });

        const color = anyActive ? (wireColors[groupId] || "#808080") : "#000000";
        setGroupColor(groupElem, color);

        elem.style.stroke = color;
        elem.style.fill = "transparent";
    }
}

// ===========================================
// 🔹 Csoport minden elemének színét állítja
// ===========================================
function setGroupColor(groupElem, color) {
    groupElem.querySelectorAll("*").forEach(child => {
        // Csak stroke-t állítunk, ha a child nem fill-es elem
        child.style.stroke = color;
        if (child.tagName !== "path") child.style.fill = color; 
    });
}

// ===========================================
// 🔹 EGYSZERŰ SZÍN FÉNYESÍTŐ FUNKCIÓ
// ===========================================
function lightenColor(hex, percent) {
    let num = parseInt(hex.replace("#", ""), 16),
        r = (num >> 16) + Math.round((255 - (num >> 16)) * percent),
        g = ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent),
        b = (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent);
    return `rgb(${r},${g},${b})`;
}

// ===========================================
// 🔹 SWITCH FORGATÁS
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
// 🔹 KATTINTÁS → ÁLLAPOTVÁLTÁS
// ===========================================
function toggleSwitch(id) {
    const info = switchData[id];
    const elem = document.getElementById(id);
    info.state = (info.state === "closed") ? "open" : "closed"; // váltás

    updateSwitchVisual(id);
    rotateSwitch(elem, info.state === "open" ? 30 : 0);

    console.log(`Szakaszoló ${id} → ${info.state}`);
}

// ===========================================
// 🔹 FŐFÜGGVÉNY: betöltés indítás
// ===========================================
async function init() {
    await loadTopologyColors(); // vezeték színek
    applyWireColors();           // alkalmazzuk SVG-ben
    await loadSwitchData();      // switch-ek
}

init();
