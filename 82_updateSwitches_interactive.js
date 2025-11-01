async function loadSwitchData() {
    try {
        const response = await fetch('82_switch_states.json');
        const switches = await response.json();
        console.log(`Betöltve: ${Object.keys(switches).length} szakaszoló`);

        for (const [id, data] of Object.entries(switches)) {
            const elem = document.getElementById(id);
            if (!elem) continue;

            elem.style.cursor = "pointer";
            elem.addEventListener('click', () => toggleSwitch(id, elem, data));
            updateSwitchVisual(elem, data.state);
        }
    } catch (err) {
        console.error('Betöltési hiba:', err);
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
