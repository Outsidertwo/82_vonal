// grafika_kezelo.js - VÉGLEGES VÁLTOZAT (Kétszínkészlet + Sötét mód)

let logikai_interfesz; 
let svg_elem_referencia = {}; 
let szinek_adatok = {}; 
let eredeti_szinek_specialis = {};

// --- 1. FÁZIS: INICIALIZÁLÁS ---

function init_minden() {
    vasut_logika.set_grafika_kezleo(window.grafika_kezelo);
    vasut_logika.init_adatok();
}

function init_grafika_kezelo(szcenariok, kapcsolo_allapotok) {
    logikai_interfesz = vasut_logika; 
    
    const sotetMod = document.body.classList.contains('sotet-mod');
    _frissit_szinek(sotetMod);
    
    init_svg_elemek(kapcsolo_allapotok);
    tarol_eredeti_szineket(); 
    logikai_interfesz.start_szimulacio(); 
}

function _frissit_szinek(sotet_mod) {
    const topologia_szinek = logikai_interfesz.get_szinek();
    if (sotet_mod && topologia_szinek.szinek_sotet) {
        szinek_adatok = topologia_szinek.szinek_sotet;
    } else if (topologia_szinek.szinek_vilagos) {
        szinek_adatok = topologia_szinek.szinek_vilagos;
    } else {
        szinek_adatok = topologia_szinek;
    }
}

function init_svg_elemek(kapcsolo_allapotok) {
    
    console.log("SVG elemek keresése...");
    
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
    
    const logikai_adatok = logikai_interfesz.get_node_adatok();
    Object.keys(logikai_adatok.segments).forEach(segment_id => {
        if (svg_elem_referencia[segment_id]) return; 
        const svg_elem = document.getElementById(segment_id); 
        if (svg_elem) {
            svg_elem_referencia[segment_id] = svg_elem;
        } 
    });

    console.log("SVG elem referenciák gyűjtése kész.");
}

function tarol_eredeti_szineket() {
    const logikai_adatok = logikai_interfesz.get_node_adatok();
    Object.values(logikai_adatok.segments).forEach(segment => {
        if (segment.group === 'gyujtosin' || segment.group === 'mellekaramkor') {
            const elem = svg_elem_referencia[segment.id];
            if (elem) {
                const target = Array.from(elem.querySelectorAll('path, line, circle, rect'))[0] || elem;
                eredeti_szinek_specialis[segment.id] = target.style.stroke || target.style.fill || szinek_adatok[segment.group] || szinek_adatok.energized;
            }
        }
    });
}

// --- 2. FÁZIS: FRISSÍTÉS ---

function frissit_osszes_elem_megjelenitese(frissitett_szegmensek, kapcsolo_allapotok, topologiai_oldal_adatok) {
    frissit_szegmens_szinezest(frissitett_szegmensek, topologiai_oldal_adatok);
    frissit_kapcsolo_megjelenites(kapcsolo_allapotok);

    if (window.JelzoModul) {
        window.JelzoModul.frissites();
    }
    
    console.log("Grafikus frissítés kész.");
}

function rotateSwitch(elem, angle) {
    const box = elem.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const current = elem.getAttribute("transform") || "";
    const cleaned = current.replace(/rotate\([^)]*\)/g, "").trim(); 
    elem.setAttribute("transform", `${cleaned} rotate(${angle}, ${cx}, ${cy})`);
}

function frissit_szegmens_szinezest(frissitett_szegmensek, topologiai_oldal_adatok) {
    
    const unenergized_color = szinek_adatok.kikapcsolt || '#808080'; 
    const default_energized_color = szinek_adatok.zarlat || '#ff0000'; 
    const semleges_color = szinek_adatok.semleges_szin || unenergized_color;
    
    const get_phase_key = (fazis, oldal) => {
        if (fazis && oldal) return `${fazis}_${oldal}`; 
        return null;
    };

    Object.values(frissitett_szegmensek).forEach(segment => {
        const elem = svg_elem_referencia[segment.id]; 
        if (!elem) return;
        
        let color_to_use = unenergized_color;
        let final_segment_state = segment.state;

        if (segment.group === 'szakaszolo' && final_segment_state === 'open') {
            if (!segment.id.startsWith('w_')) return; 
        }
        
        if (final_segment_state === 'energized' || final_segment_state === 'open') {
            
            const isAlwaysFixedColor = segment.group === 'feed' || segment.group === 'gyujtosin' || segment.group === 'mellekaramkor';
            
            if (isAlwaysFixedColor) {
                if (szinek_adatok[segment.group]) {
                    color_to_use = szinek_adatok[segment.group];
                } else if (segment.group !== 'feed' && eredeti_szinek_specialis[segment.id]) {
                    color_to_use = eredeti_szinek_specialis[segment.id];
                } else {
                    color_to_use = default_energized_color;
                }
            } else if (segment.group === 'szakaszolo' && segment.id.startsWith('w_')) {
                color_to_use = szinek_adatok['w_szakaszolo'] || default_energized_color;
            } else {
                const fazis = segment.fazis;
                const oldal = topologiai_oldal_adatok[segment.id]; 
                let phase_key = get_phase_key(fazis, oldal);
            
                if (phase_key && szinek_adatok[phase_key]) {
                    color_to_use = szinek_adatok[phase_key];
                } else if (szinek_adatok[segment.group]) {
                    color_to_use = szinek_adatok[segment.group];
                } else {
                    color_to_use = default_energized_color;
                }
            }
        } else if (final_segment_state === 'unenergized' && (segment.group === 'gyujtosin' || segment.group === 'mellekaramkor')) {
            color_to_use = semleges_color;
        }
        
        let target_elements = [];
        target_elements.push(...Array.from(elem.querySelectorAll('path, line, circle, rect')));
        
        if (elem.tagName.toLowerCase() === 'g') {
            elem.querySelectorAll('g').forEach(inner_g => {
                if (inner_g.id.startsWith('s_') || inner_g.id.startsWith('w_')) {
                    Array.from(inner_g.querySelectorAll('path, line, circle, rect')).forEach(visual_child => {
                        if (!target_elements.includes(visual_child)) { 
                           target_elements.push(visual_child);
                        }
                    });
                }
            });
        }
        
        if (target_elements.length === 0 && (
            elem.tagName.toLowerCase() === 'path' || 
            elem.tagName.toLowerCase() === 'line' || 
            elem.tagName.toLowerCase() === 'circle' || 
            elem.tagName.toLowerCase() === 'rect' || 
            elem.tagName.toLowerCase() === 'g')) {
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

function frissit_kapcsolo_megjelenites(kapcsolo_allapotok) {
    Object.keys(kapcsolo_allapotok).forEach(kapcsolo_id => {
        const elem = svg_elem_referencia[kapcsolo_id];
        const allapot = kapcsolo_allapotok[kapcsolo_id];

        if (elem) {
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
    frissit_osszes_elem_megjelenitese: frissit_osszes_elem_megjelenitese,
    frissit_szinek: function(sotet_mod) {
        _frissit_szinek(sotet_mod);
        logikai_interfesz.start_szimulacio();
    }
};