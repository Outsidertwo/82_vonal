async function loadSwitchData() {
  try {
    const response = await fetch("82_switch_states.json");
    const data = await response.json();

    // ha a fájlban "switches" kulcs alatt vannak az adatok:
    const switches = data.switches ? data.switches : data;

    console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

    Object.entries(switches).forEach(([id, info]) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.cursor = "pointer";
        element.addEventListener("click", () => toggleSwitch(id, element, info));
      }
    });
  } catch (error) {
    console.error("Betöltési hiba:", error);
  }
}


function updateSwitchVisual(elem, state) {
    // Csak a színt változtatja, a forgatást NEM piszkálja.
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

function toggleSwitch(id, elem, data) {
    data.state = (data.state === "closed") ? "open" : "closed";
    updateSwitchVisual(elem, data.state);
    console.log(`Szakaszoló ${id} → ${data.state}`);
}

loadSwitchData();

