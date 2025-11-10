// grafika_kezelo.js - A szimuláció grafikus megjelenítése (TELJES VERZIÓ)

// A Logika Modul referencia objektuma.
let logikai_interfesz; 
// Az SVG elemek gyors eléréséhez.
let svg_elem_referencia = {}; 
// A Logikai modulból átvett színkódok
let szinek_adatok = {}; 

// --- 1. FÁZIS: INICIALIZÁLÁS ---

function init_minden() {
    vasut_logika.set_grafika_kezleo(window.grafika_kezelo);
    vasut_logika.init_adatok();
}

function init_grafika_kezelo(szcenariok, kapcsolo_allapotok) {
    logikai_interfesz = vasut_logika; 
    
    // Elemek keresése és eseménykezelő hozzárendelése (MINDEN kapcsolóra)
    init_svg_elemek(kapcsolo_allapotok);
    
    logikai_interfesz.start_szimulacio(); 
}


/**
 * Összegyűjti az ÖSSZES szakaszoló (switch) SVG elemet, és hozzájuk csatolja a kattintás eseményt.
 */
function init_svg_elemek(kapcsolo_allapotok) {
    
    console.log("SVG elemek keresése mind a " + Object.keys(kapcsolo_allapotok).length + " kapcsolóra...");
    let talalt_elemek_szama = 0;
    
    Object.keys(kapcsolo_allapotok).forEach(kapcsolo_id => {
        
        const svg_elem = document.getElementById(kapcsolo_id); 

        if (svg_elem) {
            svg_elem_referencia[kapcsolo_id] = svg_elem;
            talalt_elemek_szama++;
            
            // BEVÁLT LOGIKA: Kurzormódosítás és eseménykezelő beállítása
            svg_elem.style.cursor = "pointer";
            
            svg_elem.addEventListener('click', (event) => {
                event.stopPropagation();
                logikai_interfesz.kapcsolo_kezeles(kapcsolo_id);
            });
            
        } else {
            // EZ A LEGFONTOSABB ÜZENET: Ha van ilyen, az ID nem egyezik!
            console.warn(`❌ HIBA: Az SVG-ben NEM található elem ehhez az ID-hez: ${kapcsolo_id}.`);
        }
    });

    console.log(`Összesen ${Object.keys(kapcsolo_allapotok).length} kapcsoló ID-ből, ${talalt_elemek_szama} SVG elem található meg a DOM-ban.`);
}

// --- 2. FÁZIS: FRISSÍTÉS (FORGATÁS) ---

function frissit_osszes_elem_megjelenitese(frissitett_szinek, kapcsolo_allapotok) {
    // ... színezési logika ...
    frissit_kapcsolo_megjelenites(kapcsolo_allapotok);
}

/**
 * Végrehajtja az SVG elem forgatását a középpontja körül. (BEVÁLT FÜGGVÉNY)
 */
function rotateSwitch(elem, angle) {
    const box = elem.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    
    const current = elem.getAttribute("transform") || "";
    const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim();
    
    elem.setAttribute("transform", `${cleaned} rotate(${angle}, ${cx}, ${cy})`);
}


/**
 * Frissíti az összes szakaszoló (switch) vizuális állapotát (nyitott/zárt, forgatás).
 */
function frissit_kapcsolo_megjelenites(kapcsolo_allapotok) {
    Object.keys(kapcsolo_allapotok).forEach(kapcsolo_id => {
        const elem = svg_elem_referencia[kapcsolo_id];
        const allapot = kapcsolo_allapotok[kapcsolo_id];
        
        if (elem) {
            // Zárt (closed) = 0 fok, Nyitott (open) = 30 fok
            rotateSwitch(elem, allapot === "open" ? 30 : 0);
            
            // CSS osztály módosítás
            if (allapot === "open") {
                elem.classList.remove('allapot-closed');
                elem.classList.add('allapot-open');
            } else {
                elem.classList.remove('allapot-open');
                elem.classList.add('allapot-closed');
            }
        }
    });
}

// --- PUBLIKUS INTERFÉSZ ---
window.grafika_kezelo = {
    init_minden: init_minden,
    init_grafika_kezelo: init_grafika_kezelo,
    frissit_osszes_elem_megjelenitese: frissit_osszes_elem_megjelenitese
};