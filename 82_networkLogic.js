// ===========================================
// 🧠 TOPOLOGIA ÉS VEZETÉKSZÍNEK KEZELÉSE
// ===========================================

// 🌍 Globális adatok
let wireColors = {};     // aktív vezetékek színei
let szinTabla = {};      // A/B/C fázis színtérkép
let topologyData = {};   // teljes topológiai JSON

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

        console.log("✅ Topológia és színek betöltve:", Object.keys(wireColors).length);
    } catch (e) {
        console.error("❌ Nem sikerült betölteni a topológiát:", e);
    }
}

// ===========================================
// 2️⃣ FEED PONTOK (mindig aktív, statikus szín)
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

        const groupElem = document.getElementById(feed.group);
        if (groupElem) {
            setGroupColor(groupElem, color);
        }

        wireColors[nodeId] = color;
        console.log(`Feed aktív: ${nodeId} (${phase})`);
    });
}

// ===========================================
// 3️⃣ VEZETÉKEK SZÍNEZÉSE
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
// 4️⃣ CSOPORTSZÍN ALKALMAZÁSA
// ===========================================
function setGroupColor(groupElem, color) {
    groupElem.querySelectorAll("*").forEach(child => {
        child.style.stroke = color;
        child.style.fill = "none";
    });
}
