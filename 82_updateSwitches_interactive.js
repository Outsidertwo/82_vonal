// === 82-es vonal interaktív szakaszoló kezelő ===
// fájlok: 82_vonal.svg, 82_switch_states.json, 82_topologia.json

let switchStates = {};

async function loadSwitchData() {
  try {
    const [switchResp, topoResp] = await Promise.all([
      fetch("82_switch_states.json"),
      fetch("82_topologia.json")
    ]);

    const switchesData = await switchResp.json();
    const topoData = await topoResp.json();

    switchStates = switchesData.switch_states || switchesData;

    console.log("Betöltve:", Object.keys(switchStates).length, "szakaszoló");

    updateAllSwitches();
  } catch (err) {
    console.error("Betöltési hiba:", err);
  }
}

// szakaszoló megjelenítés frissítése (forgatás + szín)
function updateAllSwitches() {
  Object.entries(switchStates).forEach(([id, info]) => {
    const el = document.getElementById(id);
    if (!el) return;

    const angle = info.base_angle || 0;
    el.setAttribute("transform", `rotate(${angle}, ${info.cx || 0}, ${info.cy || 0})`);

    if (info.state === "closed") {
      el.style.fill = "#FFD700"; // sárga
      el.style.opacity = "1.0";
    } else if (info.state === "open") {
      el.style.fill = "#808080"; // szürke
      el.style.opacity = "0.6";
    } else if (info.state === "fault") {
      el.style.fill = "#FF0000"; // piros
      el.style.opacity = "1.0";
    }

    // interaktív kattintás hozzáadása (egyszer)
    if (!el.dataset.listener) {
      el.addEventListener("click", () => toggleSwitch(id));
      el.style.cursor = "pointer";
      el.dataset.listener = "true";
    }
  });
}

// kattintásra váltás open <-> closed
function toggleSwitch(id) {
  const info = switchStates[id];
  if (!info) return;

  info.state = info.state === "closed" ? "open" : "closed";
  console.log(`Szakaszoló ${id} → ${info.state}`);
  updateAllSwitches();

  // opcionális: módosítás mentése localStorage-be
  localStorage.setItem("switchStates", JSON.stringify(switchStates));
}

// előző állapot visszatöltése böngészőből
function restoreFromLocal() {
  const saved = localStorage.getItem("switchStates");
  if (saved) {
    switchStates = JSON.parse(saved);
    updateAllSwitches();
    console.log("Szakaszoló állapotok visszatöltve a localStorage-ból.");
  }
}

// SVG betöltés után
document.addEventListener("DOMContentLoaded", () => {
  // kis késleltetés az SVG teljes rendereléséhez
  setTimeout(() => {
    loadSwitchData().then(restoreFromLocal);
  }, 500);
});
