// grafika_kezelo.js - TELJES VERZIÓ (NYITOTT SZAKASZOLÓK SZÍNEZÉSÉNEK IGNORÁLÁSA)

// A Logika Modul referencia objektuma.
let logikai_interfesz; 
// Az SVG elemek gyors eléréséhez.
let svg_elem_referencia = {}; 
// A Logikai modulból átvett színkódok
let szinek_adatok = {}; 

// --- 1. FÁZIS: INICIALIZÁLÁS ---

function init_minden() {
    // Beállítjuk a referenciát, majd elindítjuk a logikai adatok betöltését
    vasut_logika.set_grafika_kezleo(window.grafika_kezelo);
    vasut_logika.init_adatok();
}

function init_grafika_kezelo(szcenariok, kapcsolo_allapotok) {
    logikai_interfesz = vasut_logika; 
    szinek_adatok = logikai_interfesz.get_szinek(); 
    
    init_svg_elemek(kapcsolo_allapotok);
    
    logikai_interfesz.start_szimulacio(); 
}


/**
 * Összegyűjti az ÖSSZES szakaszoló (switch) és szegmens (nodes) SVG elemet.
 */
function init_svg_elemek(kapcsolo_allapotok) {
    
    console.log("SVG elemek keresése mind a " + Object.keys(kapcsolo_allapotok).length + " kapcsolóra...");
    let talalt_elemek_szama = 0;
    
    // 1. Kapcsolók inicializálása
    Object.keys(kapcsolo_allapotok).forEach(kapcsolo_id => {
        const svg_elem = document.getElementById(kapcsolo_id); 

        if (svg_elem) {
            svg_elem_referencia[kapcsolo_id] = svg_elem;
            talalt_elemek_szama++;
            
            svg_elem.style.cursor = "pointer";
            
            svg_elem.addEventListener('click', (event) => {
                event.stopPropagation();
                logikai_interfesz.kapcsolo_kezeles(kapcsolo_id);
            });
            
        } else {
            console.warn(`❌ HIBA: Az SVG-ben NEM található kapcsoló elem ehhez az ID-hez: ${kapcsolo_id}.`);
        }
    });
    
    // 2. Szegmensek (vezetékek/sínek) előkészítése
    const logikai_adatok = logikai_interfesz.get_node_adatok();
    Object.keys(logikai_adatok.segments).forEach(segment_id => {
        if (svg_elem_referencia[segment_id]) return; 

        const svg_elem = document.getElementById(segment_id); 
        if (svg_elem) {
            svg_elem_referencia[segment_id] = svg_elem;
        } 
    });

    console.log(`Összesen ${Object.keys(kapcsolo_allapotok).length} kapcsoló ID-ből, ${talalt_elemek_szama} SVG elem található meg a DOM-ban.`);
}

// --- 2. FÁZIS: FRISSÍTÉS (SZÍNEZÉS ÉS FORGATÁS) ---

/**
 * Frissíti az összes SVG elem (szegmens és kapcsoló) megjelenítését.
 */
function frissit_osszes_elem_megjelenitese(frissitett_szegmensek, kapcsolo_allapotok) {
    
    frissit_szegmens_szinezest(frissitett_szegmensek);
    
    frissit_kapcsolo_megjelenites(kapcsolo_allapotok);
    
    console.log("Grafikus frissítés kész.");
}

/**
 * Végrehajtja az SVG elem forgatását a középpontja körül.
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
 * Színezi a szegmenseket a BFS számítás alapján.
 */
function frissit_szegmens_szinezest(frissitett_szegmensek) {
    const unenergized_color = szinek_adatok.unenergized || 'grey';
    const logikai_adatok = logikai_interfesz.get_node_adatok();
    
    const get_phase_key = (fazis, oldal) => {
        if (fazis && oldal) {
            return oldal === 'kozep' ? `${fazis}_kozep` : `${fazis}_${oldal}`;
        }
        return null;
    };
    
    const feed_data = {};
    logikai_adatok.feeds.forEach(feed => {
        feed_data[feed.node] = { 
            phase: feed.phase, 
            oldal: feed.oldal 
        };
    });

    Object.values(frissitett_szegmensek).forEach(segment => {
        const elem = svg_elem_referencia[segment.id]; 
        if (!elem) return;
        
        let color_to_use = unenergized_color;
        let final_segment_state = segment.state;

        // ----------------------------------------------------------------------------------
        // *** JAVÍTÁS ***: TELJESEN KIHAGYJUK A NYITOTT SZAKASZOLÓK EGYEDI FELDOLGOZÁSÁT
        // Hagyjuk, hogy a színezés a szülő $w\_ID$ csoporton keresztül érvényesüljön.
        // Ha a state 'open' (nyitott szakaszoló), akkor nem állítunk be energizált színt.
        if (segment.group === 'szakaszolo' && final_segment_state === 'open') {
             // Mivel nem 'energized', a color_to_use 'unenergized_color' marad,
             // DE NEM ENNEK a szegmensnek a gyermekei lesznek színeve. 
             // Csak a 'w_' csoportokon keresztül engedjük a színezést!
             
             // Két esetet kell kezelni:
             // 1. Ha az elem ID $w\_ID$, akkor ez a szülő csoport.
             // 2. Ha az elem ID $s\_ID$ és nyitott, hagyjuk ki, hogy ne írja felül a szülőt!
             if (!segment.id.startsWith('w_')) {
                 return; // Átugorjuk a nyitott szakaszoló szegmenst.
             }
        }
        // ----------------------------------------------------------------------------------
        
        // 1. Szín meghatározása - CSAK az 'energized' state alapján
        if (final_segment_state === 'energized') {
            
            let phase_key = null;
            
            // Elsőbbség: BFS által beállított fázis/oldal infó (a terjedésből)
            phase_key = get_phase_key(segment.fazis, segment.oldal);
            
            // Másodikbbség: Feed pontok adatai (ha maga a feed pont)
            if (!phase_key && feed_data[segment.id]) {
                 const data = feed_data[segment.id];
                 phase_key = get_phase_key(data.phase, data.oldal);
            }
            
            // Szín meghatározása: fázis alapú vagy csoport alapú
            if (phase_key && szinek_adatok[phase_key]) {
                color_to_use = szinek_adatok[phase_key];
            }
            else if (szinek_adatok[segment.group]) {
                color_to_use = szinek_adatok[segment.group];
            } 
            else {
                color_to_use = szinek_adatok.energized || 'red';
            }
        }
            
        // 2. Színezés alkalmazása (a te csoportszínezési logikádnak megfelelően)
        
        let target_elements = [];
        
        // Elsődlegesen az SVG-csoport alatti közvetlen vizuális elemek
        target_elements.push(...Array.from(elem.querySelectorAll('path, line, circle, rect')));
        
        // Keresés a w_ID csoporton belül lévő s_ID csoportokon belül (Ez szükséges a beágyazott szakaszolókhoz)
        if (elem.tagName.toLowerCase() === 'g') {
            elem.querySelectorAll('g').forEach(inner_g => {
                if (inner_g.id.startsWith('s_')) {
                    Array.from(inner_g.querySelectorAll('path, line, circle, rect')).forEach(visual_child => {
                        if (!target_elements.includes(visual_child)) { 
                           target_elements.push(visual_child);
                        }
                    });
                }
            });
        }
        
        // Ha az elem maga a színezendő path/line/stb., azt is vegyük fel a listába.
        if (target_elements.length === 0 && (elem.tagName.toLowerCase() === 'path' || elem.tagName.toLowerCase() === 'line' || elem.tagName.toLowerCase() === 'circle' || elem.tagName.toLowerCase() === 'rect' || elem.tagName.toLowerCase() === 'g')) {
            target_elements.push(elem);
        }
        
        target_elements.forEach(target_elem => {
            
            // Csak a ténylegesen rajzolt elemeket színezzük
            if (target_elem.tagName.toLowerCase() === 'path' || 
                target_elem.tagName.toLowerCase() === 'line' ||
                target_elem.tagName.toLowerCase() === 'circle' ||
                target_elem.tagName.toLowerCase() === 'rect') {
                    
                // A stroke beállítása
                target_elem.style.stroke = color_to_use;
                
                // A fill beállítása (szakaszolóknál kitöltés, vonalaknál 'none')
                if (segment.group === 'szakaszolo') { 
                    target_elem.style.fill = color_to_use;
                } else {
                    target_elem.style.fill = 'none';
                }
            }
        });
    });
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
            
            // A CSS osztályok beállítása maradt
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