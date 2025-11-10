/*
* =========================================================================================
* GRAFIKA_KEZELO.JS - A Működtető Mechanizmus (a "VÉGREHAJTÓ")
* =========================================================================================
*
* Csak vizuális feladatok: SVG manipuláció (színezés a stroke-on keresztül), 
* DOM események kezelése (kattintás, lista választás).
*/

// --- GLOBÁLIS GRAFIKAI TÁROLÓK ---

let svg_referencia_map = {}; // Gyűjtemény az SVG elemekhez (gyors elérés)
let logikai_interfesz;       // A vasut_logika.js publikus interfésze


// --- 1. FÁZIS: INICIALIZÁLÁS ---

/**
 * A Grafika Modul inicializálása (a Logika Modul hívja meg).
 */
function init_grafika_kezleo(szcenariok, kapcsolo_allapotok) {
    
    // Lekérjük a Logika Modul publikus metódusait a globális objektumból
    logikai_interfesz = vasut_logika; 
    
    // Visszaadjuk a saját publikus interfészünket a Logika Modulnak a visszahívásokhoz
    logikai_interfesz.set_grafika_kezleo(window.grafika_kezelo); 

    // Az SVG elemek összegyűjtése és eseményfigyelők csatolása
    init_svg_elemek(kapcsolo_allapotok);
    
    // A szcenárió választó (dropdown) felépítése
    epiti_szcenario_valaszto(szcenariok);
}

/**
 * Inicializálja az SVG referenciákat és a kapcsoló kattintási eseményeket.
 */
function init_svg_elemek(kapcsolo_allapotok) {
    
    // Minden JSON-ban szereplő ID-t megpróbálunk leképezni egy SVG elemre
    const node_ids = Object.keys(logikai_interfesz.get_kapcsolo_allapotok()).concat(
        Object.keys(logikai_interfesz.get_node_adatok())
    );

    node_ids.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            svg_referencia_map[id] = elem;
            
            // Ha azonosító kapcsoló ('s_...'), csatoljuk az eseményfigyelőt
            if (id.startsWith('s_')) {
                elem.addEventListener('click', () => {
                    // Kattintás esetén azonnal átadjuk az ID-t a Logika Modulnak
                    logikai_interfesz.kapcsolo_kezeles(id); 
                });
            }
        }
    });
}


// --- 2. FÁZIS: VIZUÁLIS FRISSÍTÉS ---

/**
 * Fő vizuális frissítő rutin (visszahívás a Logika Modultól).
 * @param {Array} feszultseg_lista - Feszültség alatt álló node-ok teljes listája.
 */
function frissit_osszes_elem_megjelenitese(feszultseg_lista) {
    
    const szinek_paletta = logikai_interfesz.get_szinek();
    const kikapcsolt_szin = szinek_paletta.kikapcsolt;

    // A feszültség alatt álló ID-k listája a gyors lookup-hoz
    const feszultseg_alatt_ids = new Set(feszultseg_lista.map(n => n.id));
    
    // 1. RESET/PASSZÍV SZÍNEZÉS: Mindenkit feketére állítunk (kikapcsolt szín)
    Object.keys(svg_referencia_map).forEach(id => {
        // Csak a szakaszokat (w_...) reseteljük
        if (id.startsWith('w_') && !feszultseg_alatt_ids.has(id)) {
            beallit_elem_szin(id, kikapcsolt_szin);
        }
    });

    // 2. AKTÍV SZÍNEZÉS: Feszültség alatt álló szakaszok
    feszultseg_lista.forEach(node => {
        const aktiv_szin = node.aktiv_szin;
        // Beállítja a szakasz és a hozzá tartozó SVG elemek (pl. kapcsoló) színét
        beallit_elem_szin(node.id, aktiv_szin);
    });
}

/**
 * Alrutin az SVG elem STROKE színének beállítására.
 * FIGYELEM: Csak a STROKE-ot használjuk!
 */
function beallit_elem_szin(id, szin_kod) {
    const elem = svg_referencia_map[id];
    if (elem) {
        // Keresünk minden vonal elemet (line, polyline, path) a G csoportban
        const vonal_elemek = elem.querySelectorAll('line, polyline, path');
        
        if (vonal_elemek.length > 0) {
            // Ha vannak belső vonalak (ez a legpontosabb)
            vonal_elemek.forEach(line => {
                 line.style.stroke = szin_kod;
            });
        } else {
            // Ha maga a G csoport a színezendő elem (kevésbé pontos)
            elem.style.stroke = szin_kod;
        }
        
        // Mivel a kapcsoló (s_...) vizuálisan a szakasz (w_...) része, a színezés ezzel egyidejűleg történik.
        // A stroke állítása a szakasz-csoporton beállítja a kapcsoló színét is, 
        // ha a kapcsoló nem bír egyedi színfelülírással.
    }
}


// --- 3. FÁZIS: SZCENÁRIÓ KEZELŐ ÉS KAPCSOLÓ JELZÉS ---

/**
 * Dinamikusan felépíti a HTML Szcenárió választó listát.
 */
function epiti_szcenario_valaszto(szcenariok) {
    const valaszto = document.getElementById('szcenario-valaszto');
    if (!valaszto) return;
    
    valaszto.innerHTML = '<option value="">Válassz szcenáriót...</option>';
    
    // Feltöltés a szcenárió adatokkal (kulcs/érték pár)
    for (const [id, _] of Object.entries(szcenariok)) {
        const opcio = document.createElement('option');
        opcio.value = id;
        opcio.textContent = id.replace(/_/g, ' ').toUpperCase(); // Szépíti a kiírást
        valaszto.appendChild(opcio);
    }
    
    // Eseményfigyelő a választóra
    valaszto.addEventListener('change', (e) => {
        const kivalasztott_id = e.target.value;
        if (kivalasztott_id) {
            // Átadja a Logika Modulnak a szcenárió alkalmazására vonatkozó kérést
            logikai_interfesz.alkalmaz_szcenario(kivalasztott_id);
        }
    });
}

/**
 * Frissíti a kapcsolók vizuális állását (nyitott: forgatás / zárt: alapállás).
 */
function frissit_kapcsolo_megjelenites(kapcsolo_allapotok) {
    
    // Végigmegyünk az összes kapcsoló logikai állapotán
    for (const [id, allapot] of Object.entries(kapcsolo_allapotok)) {
        const elem = svg_referencia_map[id];
        if (elem) {
            // A CSS osztály (kapcsolo-nyitva) végzi a tényleges forgatást
            if (allapot === 'open') {
                elem.classList.add('kapcsolo-nyitva');
            } else {
                elem.classList.remove('kapcsolo-nyitva');
            }
        }
    }
}


// --- PUBLIKUS INTERFÉSZ A LOGIKA MODUL FELÉ ---
window.grafika_kezelo = {
    init_grafika_kezleo: init_grafika_kezleo,
    frissit_osszes_elem_megjelenitese: frissit_osszes_elem_megjelenitese,
    frissit_kapcsolo_megjelenites: frissit_kapcsolo_megjelenites
};