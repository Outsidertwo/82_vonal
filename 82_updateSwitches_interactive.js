// ==============================
// 🔹 FŐ FÜGGVÉNY: adat betöltése
// ==============================
async function loadSwitchData() {
  try {
    // 1️⃣ Beolvassuk a JSON fájlt (82_switch_states.json)
    const response = await fetch("82_switch_states.json");

    // 2️⃣ Átalakítjuk az adatokat JavaScript objektummá
    const data = await response.json();

    // 3️⃣ Ellenőrizzük, hogy a JSON-ban van-e "switch_states" kulcs, ha nincs, közvetlenül használjuk a gyökeret
    const switches = data.switch_states ? data.switch_states : data;

    // 4️⃣ Kiírjuk a konzolra, hány szakaszolót talált
    console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

    // 5️⃣ Végigmegyünk minden szakaszolón
    Object.entries(switches).forEach(([id, info]) => {
      // 🔸 `id` = pl. "s_PT_Ht"
      // 🔸 `info` = pl. { "state": "closed" }

      // 6️⃣ Megkeressük az SVG-ben az adott szakaszolót azonosító alapján
      const element = document.getElementById(id);

      if (element) {
        // 7️⃣ Kézre álljon az egérkurzor → kattinthatónak tűnjön
        element.style.cursor = "pointer";

        // 8️⃣ Beállítjuk a színét az állapotnak megfelelően
        updateSwitchVisual(element, info.state);

        // 9️⃣ Ha a JSON szerint "open", akkor nyitott → el kell forgatni
        if (info.state === "open") rotateSwitch(element, 30);
        else rotateSwitch(element, 0);

        // 🔟 Kattintás esemény hozzáadása → működés váltás
        element.addEventListener("click", () => toggleSwitch(id, element, info));
      } else {
        // 1️⃣1️⃣ Ha nincs meg az SVG-ben, konzolra figyelmeztetés
        console.warn("Hiányzó elem az SVG-ben:", id);
      }
    });
  } catch (error) {
    // 1️⃣2️⃣ Hibakezelés, ha nem található vagy sérült a fájl
    console.error("Betöltési hiba:", error);
  }
}

// ==============================
// 🎨 SZÍN BEÁLLÍTÁS (állapot alapján)
// ==============================
function updateSwitchVisual(elem, state) {
  // 1️⃣ Ha zárt, zöld + sárga kitöltés
  if (state === "closed") {
    elem.style.stroke = "#00FF00"; // körvonal zöld
    elem.style.fill = "#FFD700";   // belső sárga
  }

  // 2️⃣ Ha nyitott, piros + világos piros
  else if (state === "open") {
    elem.style.stroke = "#FF0000"; // körvonal piros
    elem.style.fill = "#FFAAAA";   // halvány piros kitöltés
  }

  // 3️⃣ Ha ismeretlen, szürke és üres kitöltés
  else {
    elem.style.stroke = "#808080";
    elem.style.fill = "none";
  }
  if (state === "open") {
    rotateSwitch(elem, 30); // 30 fokkal elforgatjuk nyitott állapotban
  } else {
    rotateSwitch(elem, 0); // vissza alaphelyzetbe zártnál
  }

}

// ==============================
// 🔁 FORGATÁS KEZELÉSE (helyes, egyetlen verzió)
// ==============================
function rotateSwitch(elem, angle) {
  // 1️⃣ Lekérjük az elem méretét és pozícióját
  const box = elem.getBBox(); // {x, y, width, height}

  // 2️⃣ Kiszámítjuk a középpontját
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // 3️⃣ Eltávolítjuk az előző "rotate(...)"-ot, ha volt
  const current = elem.getAttribute("transform") || "";
  const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim();

  // 4️⃣ Új forgatás a saját középpont körül
  elem.setAttribute("transform", `${cleaned} rotate(${angle}, ${cx}, ${cy})`);
}


// ==============================
// 🖱️ KATTINTÁS → ÁLLAPOTVÁLTÁS
// ==============================
function toggleSwitch(id, elem, info) {
  // 1️⃣ Az állapot átváltása closed ↔ open között
  info.state = (info.state === "closed") ? "open" : "closed";

  // 2️⃣ A színezés frissítése
  updateSwitchVisual(elem, info.state);

  // 3️⃣ A vizuális forgatás frissítése
  if (info.state === "open") {
    rotateSwitch(elem, 30); // nyitás → 30° jobbra
  } else {
    rotateSwitch(elem, 0);  // zárás → vissza 0°-ra
  }

  // 4️⃣ Naplózás a konzolra
  console.log(`Szakaszoló ${id} → ${info.state}`);
}

// ==============================
// 🚀 FÜGGVÉNY FUTTATÁSA INDULÁSKOR
// ==============================
loadSwitchData();
