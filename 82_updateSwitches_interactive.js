// ==============================
// 🔹 FŐ FÜGGVÉNY: adat betöltése
// ==============================
async function loadSwitchData() {
  try {
    // 1️⃣ Beolvassuk a JSON fájlt (82_switch_states.json)
    const response = await fetch("82_switch_states.json");

    // 2️⃣ Átalakítjuk az adatokat JavaScript objektummá
    const data = await response.json();

    // 3️⃣ Ellenőrizzük, hogy a JSON-ban van-e "switch_states" kulcs
    const switches = data.switch_states ? data.switch_states : data;

    // 4️⃣ Kiírjuk a konzolra, hány szakaszolót talált
    console.log("Betöltve:", Object.keys(switches).length, "szakaszoló");

    // 5️⃣ Végigmegyünk minden szakaszolón
    Object.entries(switches).forEach(([id, info]) => {
      // 🔸 `id` = pl. "s_PT_Ht"
      // 🔸 `info` = pl. { "state": "closed" }

      const element = document.getElementById(id); // SVG-beli azonosító alapján keresés

      if (element) {
        // 6️⃣ Az egérkurzor kattinthatónak tűnjön
        element.style.cursor = "pointer";

        // 7️⃣ Beállítjuk a színt az aktuális állapot alapján
        updateSwitchVisual(element, info.state);

        // 8️⃣ Forgatást az állapot szerint
        if (info.state === "open") rotateSwitch(element, 30);
        else rotateSwitch(element, 0);

        // 9️⃣ Kattintás → állapotváltás
        element.addEventListener("click", () => toggleSwitch(id, element, info));
      } else {
        // 1️⃣0️⃣ Ha az SVG-ben nincs meg, konzol figyelmeztetés
        console.warn("Hiányzó elem az SVG-ben:", id);
      }
    });
  } catch (error) {
    // 1️⃣1️⃣ Hibakezelés (pl. fájlhiba)
    console.error("Betöltési hiba:", error);
  }
}

// ==============================
// 🎨 SZÍN BEÁLLÍTÁS (állapot alapján)
// ==============================
function updateSwitchVisual(elem, state) {
  if (state === "closed") {
    // Zárt → zöld + sárga
    elem.style.stroke = "#00FF00";
    elem.style.fill = "#FFD700";
  } else if (state === "open") {
    // Nyitott → piros + halvány piros
    elem.style.stroke = "#FF0000";
    elem.style.fill = "#FFAAAA";
  } else {
    // Ismeretlen → szürke, üres
    elem.style.stroke = "#808080";
    elem.style.fill = "none";
  }

  // A szín után mindig frissítjük a forgatást
  if (state === "open") rotateSwitch(elem, 30);
  else rotateSwitch(elem, 0);
}

// ==============================
// 🔁 FORGATÁS KEZELÉSE
// ==============================
function rotateSwitch(elem, angle) {
  // 1️⃣ Megnézzük, van-e korábbi forgatás
  const current = elem.getAttribute("transform") || "";

  // 2️⃣ Eltávolítjuk az összes korábbi "rotate(...)" kifejezést
  const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim();

  // 3️⃣ Lekérjük az elem méretét és helyét (a saját SVG koordinátarendszerében)
  const box = elem.getBBox();
  const cx = box.x + box.width / 2;  // középpont X
  const cy = box.y + box.height / 2; // középpont Y

  // 4️⃣ Új forgatás beillesztése – mindig friss, nem halmozódik
  elem.setAttribute("transform", `${cleaned} rotate(${angle}, ${cx}, ${cy})`);
}

// ==============================
// 🖱️ KATTINTÁS → ÁLLAPOTVÁLTÁS
// ==============================
function toggleSwitch(id, elem, info) {
  // 1️⃣ Átváltjuk az állapotot
  info.state = (info.state === "closed") ? "open" : "closed";

  // 2️⃣ Szín frissítése
  updateSwitchVisual(elem, info.state);

  // 3️⃣ Naplózás a konzolra
  console.log(`Szakaszoló ${id} → ${info.state}`);
}

// ==============================
// 🚀 INDÍTÁS
// ==============================
loadSwitchData();
