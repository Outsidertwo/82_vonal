// grafika_kezelo.js - VÉGLEGES VÁLTOZAT (Fix Színprioritás + Stabil Kattintás)

let logikai_interfesz; 
let svg_elem_referencia = {}; 
let szinek_adatok = {}; 
let eredeti_szinek_specialis = {}; // Eredeti színek tárolására (gyujtosin/mellekaramkor esetleg)

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
    tarol_eredeti_szineket(); 
    
    logikai_interfesz.start_szimulacio(); 
}

/**
 * Összegyűjti az ÖSSZES szakaszoló (switch) és szegmens (nodes) SVG elemet és beállítja a kattintást.
 */
function init_svg_elemek(kapcsolo_allapotok) {
    
    console.log("SVG elemek keresése...");
    
    // 1. Kapcsolók inicializálása (kattintáskezelővel)
    Object.keys(kapcsolo_allapotok).forEach(kapcsolo_id => {
        const svg_elem = document.getElementById(kapcsolo_id); 

        if (svg_elem) {
            svg_elem_referencia[kapcsolo_id] = svg_elem;
            
            svg_elem.style.cursor = "pointer";
            
            svg_elem.addEventListener('click', (event) => {
                event.stopPropagation();
                logikai_interfesz.kapcsolo_kezeles(kapcsolo_id);
            });
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

    console.log(`SVG elem referenciák gyűjtése kész.`);
}

/**
 * Eltárolja a gyűjtősínek és mellékáramkörök topológiában megadott eredeti színét.
 */
function tarol_eredeti_szineket() {
    const logikai_adatok = logikai_interfesz.get_node_adatok();
    Object.values(logikai_adatok.segments).forEach(segment => {
        if (segment.group === 'gyujtosin' || segment.group === 'mellekaramkor') {
            const elem = svg_elem_referencia[segment.id];
            if (elem) {
                // Megpróbáljuk kiolvasni a stílusból az eredeti színt
                const target = Array.from(elem.querySelectorAll('path, line, circle, rect'))[0] || elem;
                // Az alapértelmezett szín a szinek_adatok[segment.group] legyen
                eredeti_szinek_specialis[segment.id] = target.style.stroke || target.style.fill || szinek_adatok[segment.group] || szinek_adatok.energized;
            }
        }
    });
}


// --- 2. FÁZIS: FRISSÍTÉS (SZÍNEZÉS ÉS FORGATÁS) ---

/**
 * Frissíti az összes SVG elem (szegmens és kapcsoló) megjelenítését.
 */
function frissit_osszes_elem_megjelenitese(frissitett_szegmensek, kapcsolo_allapotok, topologiai_oldal_adatok) {
    
    frissit_szegmens_szinezest(frissitett_szegmensek, topologiai_oldal_adatok);
    
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
 * Színezi a szegmenseket a BFS számítás és a fix topológiai oldal alapján.
 */
function frissit_szegmens_szinezest(frissitett_szegmensek, topologiai_oldal_adatok) {
    
    const unenergized_color = szinek_adatok.kikapcsolt || '#808080'; 
    const default_energized_color = szinek_adatok.zarlat || '#ff0000'; 
    const semleges_color = szinek_adatok.semleges_szin || unenergized_color;
    
    /**
     * Színkulcs generálása a topológia Szinek objektumához (pl. A_bal).
     */
    const get_phase_key = (fazis, oldal) => {
        if (fazis && oldal) {
            return `${fazis}_${oldal}`; 
        }
        return null;
    };
    

    Object.values(frissitett_szegmensek).forEach(segment => {
        const elem = svg_elem_referencia[segment.id]; 
        if (!elem) return;
        
        let color_to_use = unenergized_color;
        let final_segment_state = segment.state;

        // Szakaszoló egyedi kezelése (eredeti kód megtartva)
        if (segment.group === 'szakaszolo' && final_segment_state === 'open') {
             if (!segment.id.startsWith('w_')) {
                 return; 
             }
        }
        
        // 1. Szín meghatározása - CSAK az 'energized' (vagy 'open' w_-nél) state alapján
        if (final_segment_state === 'energized' || final_segment_state === 'open') {
            
            // *** PRIOTITÁS #1: Feeds, Gyűjtősín, Mellékáramkör (Oldalfüggetlen, Fix Szín) ***
            const isAlwaysFixedColor = segment.group === 'feed' || segment.group === 'gyujtosin' || segment.group === 'mellekaramkor';
            
            if (isAlwaysFixedColor) {
                // Csoportszín kulcsot keres (pl. szinek.feed)
                if (szinek_adatok[segment.group]) {
                    color_to_use = szinek_adatok[segment.group];
                } 
                // Ha gyűjtősín/mellékáramkör, és a csoportszín hiányzik, az eredeti színt tartja meg
                else if (segment.group !== 'feed' && eredeti_szinek_specialis[segment.id]) {
                    color_to_use = eredeti_szinek_specialis[segment.id];
                }
                // Végül: alapértelmezett energizált szín
                else {
                    color_to_use = default_energized_color;
                }
            }
            // *** PRIOTITÁS #2: w_szakaszoló (Ha nincs feed/gyujtosin/mellekaramkor) ***
            else if (segment.group === 'szakaszolo' && segment.id.startsWith('w_')) {
                color_to_use = szinek_adatok['w_szakaszolo'] || default_energized_color;
            }
            // *** PRIOTITÁS #3: NORMÁL ELEMEK (Fázis/Oldal szerint) ***
            else {
                const fazis = segment.fazis;
                const oldal = topologiai_oldal_adatok[segment.id]; 
                let phase_key = get_phase_key(fazis, oldal);
            
                // 1. Fázis/Oldal szín (pl. A_bal)
                if (phase_key && szinek_adatok[phase_key]) {
                    color_to_use = szinek_adatok[phase_key];
                }
                // 2. Csoportszín (pl. 'vezeték'), ha fázis/oldal szín nincs
                else if (szinek_adatok[segment.group]) {
                    color_to_use = szinek_adatok[segment.group];
                } 
                // 3. Alapértelmezett energizált szín
                else {
                    color_to_use = default_energized_color;
                }
            }
        }
        
        // Semleges/Kikapcsolt állapot a speciális csoportoknál
        else if (final_segment_state === 'unenergized' && (segment.group === 'gyujtosin' || segment.group === 'mellekaramkor')) {
            color_to_use = semleges_color;
        }
        
        // 2. Színezés alkalmazása
        
        let target_elements = [];
        
        // Elsődlegesen az SVG-csoport alatti közvetlen vizuális elemek
        target_elements.push(...Array.from(elem.querySelectorAll('path, line, circle, rect')));
        
        // Keresés a beágyazott csoportokon belül
        if (elem.tagName.toLowerCase() === 'g') {
            elem.querySelectorAll('g').forEach(inner_g => {
                if (inner_g.id.startsWith('s_') || inner_g.id.startsWith('w_')) { // w_ hozzáadva
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
            
            if (target_elem.tagName.toLowerCase() === 'path' || 
                target_elem.tagName.toLowerCase() === 'line' ||
                target_elem.tagName.toLowerCase() === 'circle' ||
                target_elem.tagName.toLowerCase() === 'rect') {
                    
                target_elem.style.stroke = color_to_use;
                target_elem.style.fill = 'none'; 
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