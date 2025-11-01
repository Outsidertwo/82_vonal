async function loadSwitchData() {
  try {
    const response = await fetch("82_switch_states.json");
    const data = await response.json();

    const switches = data.switch_states ? data.switch_states : data;

    console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

    Object.entries(switches).forEach(([id, info]) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.cursor = "pointer";

        // alapállapot beállítása
        updateSwitchVisual(element, info.state);

        // forgatás induláskor
        if (info.state === "open") rotateSwitch(element, 30);

        element.addEventListener("click", () => toggleSwitch(id, element, info));
      } else {
        console.warn("Hiányzó elem az SVG-ben:", id);
      }
    });
  } catch (error) {
    console.error("Betöltési hiba:", error);
  }
}

function updateSwitchVisual(elem, state) {
  if (state === "closed") {
    elem.style.stroke = "#00FF00";
    elem.style.fill = "#FFD700";
  } else if (state === "open") {
    elem.style.stroke = "#FF0000";
    elem.style.fill = "#FFAAAA";
  } else {
    elem.style.stroke = "#808080";
    elem.style.fill = "none";
  }
}

function rotateSwitch(elem, angle) {
  // Az aktuális transform lekérdezése
  const current = elem.getAttribute("transform") || "";
  // Töröljük az esetleges korábbi forgatást
  const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim();
  // Új forgatás hozzáadása
  elem.setAttribute("transform", `${cleaned} rotate(${angle})`);
}

function toggleSwitch(id, elem, info) {
  info.state = (info.state === "closed") ? "open" : "closed";
  updateSwitchVisual(elem, info.state);

  if (info.state === "open") {
    rotateSwitch(elem, 30);
  } else {
    rotateSwitch(elem, 0);
  }

  console.log(`Szakaszoló ${id} → ${info.state}`);
}

loadSwitchData();
