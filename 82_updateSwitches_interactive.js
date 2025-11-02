// ===========================================
// 🎨 TOPOLOGIA ALAPÚ SZÍNEZÉS ÉS SWITCH KEZELÉS
// ===========================================

// 1️⃣ Globális változók a vezetékek és színek kezeléséhez
let wireColors = {}; // minden vezetékhez tartozó szín
let szinTabla = {};  // az A/B/C fázis színtérkép

// ===========================================
// 🔹 TOPOLOGIA BETÖLTÉSE ÉS SZÍNEK KIALAKÍTÁSA
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
            elem.style.stroke = color; // körvonal színe
            elem.style.fill = color;   // kitöltés, ha van
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

        // minden switch-et inicializálunk
        Object.entries(switches).forEach(([id, info]) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn("Hiányzó switch elem az SVG-ben:", id);
                return;
            }

            element.style.cursor = "pointer"; // kattinthatóság

            // szín beállítása (zárt → from node színe, nyitott → fekete)
            updateSwitchVisual(element, info.state, info.from);

            // forgatás az állapotnak megfelelően
            rotateSwitch(element, info.state === "open" ? 30 : 0);

            // kattintás esemény
            element.addEventListener("click", () => toggleSwitch(id, element, info));
        });

    } catch (error) {
        console.error("Betöltési hiba:", error);
    }
}

// ===========================================
// 🔹 SWITCH SZÍNEZÉS (állapot + from node)
// ===========================================
function updateSwitchVisual(elem, state, fromNodeId) {
    let color = "#808080"; // alap: szürke
    if (state === "closed") {
        // ha van from node szín, használjuk
        color = wireColors[fromNodeId] || "#00FF00"; 
        elem.style.stroke = color;      // körvonal
        elem.style.fill = lightenColor(color, 0.4); // világosabb kitöltés
    } else if (state === "open") {
        elem.style.stroke = "#000000";  // fekete körvonal nyitott
        elem.style.fill = "transparent"; // átlátszó kitöltés
    } else {
        elem.style.stroke = "#808080";
        elem.style.fill = "none";
    }
}

// ===========================================
// 🔹 EGYSZERŰ SZÍN FÉNYESÍTŐ FUNKCIÓ
// ===========================================
function lightenColor(hex, percent) {
    // hex: pl "#FF8800", percent: 0.3 → 30% világosítás
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
function toggleSwitch(id, elem, info) {
    info.state = (info.state === "closed") ? "open" : "closed"; // váltás

    // frissítés szín + forgatás
    updateSwitchVisual(elem, info.state, info.from);
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
