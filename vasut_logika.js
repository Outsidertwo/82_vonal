// vasut_logika.js - FÁZIS TERJESZTÉS, FIX OLDAL ALAPJÁN TÖRTÉNŐ SZÍNEZÉS

// --- GLOBÁLIS LOGIKAI TÁROLÓK ---
let Logikai_Adatmodell_Graf = {}; 
let Kapcsolo_Allapotok = {};     
let Szinek = {};                
let Szcenariok = {};            
let Grafika_Kezelo_Referencia;  
let Topologiai_Oldal_Adatok = {};
let Szcenario_Adatok = [];
let Szcenario_Lepesszamlalok = {};
let Eredeti_Kapcsolo_Allapotok = {};

// --- SEGÉDFÜGGVÉNYEK ---

async function betolt_json(fajl_nev) {
    const response = await fetch(fajl_nev);
    if (!response.ok) {
        throw new Error(`Hiba a fájl betöltésekor: ${fajl_nev}, státusz: ${response.status}`);
    }
    return response.json();
}

function set_grafika_kezleo(grafika_kezleo_objektum) {
    Grafika_Kezelo_Referencia = grafika_kezleo_objektum;
}

// --- 1. FÁZIS: INICIALIZÁLÁS ---

async function init_adatok() { 
    try {
        const topologia_json = await betolt_json('82_topologia.json');
        
        epitesi_kapcsolasi_graf(topologia_json);
        
        // Mindkét színkészlet eltárolása
        Szinek = {
            szinek_vilagos: topologia_json.szinek_vilagos || {},
            szinek_sotet:   topologia_json.szinek_sotet || {}
        };

        // Eredeti kapcsolóállapotok mentése reset-hez
        Eredeti_Kapcsolo_Allapotok = {};
        Object.keys(Kapcsolo_Allapotok).forEach(id => {
            Eredeti_Kapcsolo_Allapotok[id] = Kapcsolo_Allapotok[id];
        });

        // Szcenáriók betöltése
        const szcenario_json = await betolt_json('szcenariok.json');
        Szcenario_Adatok = szcenario_json;
        Szcenario_Adatok.forEach(sc => {
            Szcenario_Lepesszamlalok[sc.id] = 0;
        });
        
        if (Grafika_Kezelo_Referencia) {
            Grafika_Kezelo_Referencia.init_grafika_kezelo(Szcenariok, Kapcsolo_Allapotok); 
        }
        
    } catch (hiba) {
        console.error("KRITIKUS HIBA a szimuláció inicializálásában:", hiba); 
    }
}

function epitesi_kapcsolasi_graf(nyers_json) {
    
    Logikai_Adatmodell_Graf = {
        nodes: {},    
        segments: {}, 
        feeds: nyers_json.feeds || []     
    };
    
    const NodeToSegmentMap = {};

    nyers_json.stations.forEach(station => { 
        
        if (station.nodes) {
            Object.entries(station.nodes).forEach(([id, node_data]) => {
                
                Logikai_Adatmodell_Graf.nodes[id] = { 
                    id: id,
                    connections: node_data.connects || [], 
                    is_feed_point: false, 
                    state: 'unenergized' 
                };

                const segment_id = node_data.element_id || id;
                NodeToSegmentMap[id] = segment_id;
                
                Topologiai_Oldal_Adatok[segment_id] = node_data.oldal || 'bal'; 
                
                Logikai_Adatmodell_Graf.segments[segment_id] = {
                    id: segment_id,
                    ends: [],     
                    group: node_data.type,  
                    state: 'unenergized',               
                    connected_segments: [],
                    fazis: null 
                };
            });
        }
        
        if (station.switches) {
            Object.entries(station.switches).forEach(([id, sw_data]) => {
                Kapcsolo_Allapotok[id] = sw_data.state || "closed";
                
                const from_segment_id = sw_data.from;
                const to_segment_id = sw_data.to;

                Topologiai_Oldal_Adatok[id] = sw_data.oldal || Topologiai_Oldal_Adatok[from_segment_id] || 'bal'; 
                
                Logikai_Adatmodell_Graf.segments[id] = {
                    id: id,
                    ends: [from_segment_id, to_segment_id], 
                    group: sw_data.type, 
                    state: sw_data.state,
                    connected_segments: [],
                    fazis: null 
                };

                if (Logikai_Adatmodell_Graf.segments[from_segment_id]) {
                    Logikai_Adatmodell_Graf.segments[from_segment_id].connected_segments.push(to_segment_id);
                }
                if (Logikai_Adatmodell_Graf.segments[to_segment_id]) {
                    Logikai_Adatmodell_Graf.segments[to_segment_id].connected_segments.push(from_segment_id);
                }
            });
        }
    });
    
    Logikai_Adatmodell_Graf.feeds.forEach(feed => {
        const node_id = feed.node;
        const segment_id = NodeToSegmentMap[node_id] || node_id; 

        if (Logikai_Adatmodell_Graf.nodes[node_id]) {
            Logikai_Adatmodell_Graf.nodes[node_id].is_feed_point = true;
            Logikai_Adatmodell_Graf.nodes[node_id].state = 'energized';
        }
        
        if (Logikai_Adatmodell_Graf.segments[segment_id]) {
            Logikai_Adatmodell_Graf.segments[segment_id].state = 'energized';
            Logikai_Adatmodell_Graf.segments[segment_id].fazis = feed.phase; 
        } 
        if (segment_id !== node_id && Logikai_Adatmodell_Graf.segments[node_id]) {
             Logikai_Adatmodell_Graf.segments[node_id].state = 'energized';
             Logikai_Adatmodell_Graf.segments[node_id].fazis = feed.phase; 
        }
        
        Topologiai_Oldal_Adatok[segment_id] = feed.oldal || Topologiai_Oldal_Adatok[segment_id];
    }); 
}

// --- 2. FÁZIS: SZÁMÍTÁS ÉS FRISSÍTÉS ---

function start_szimulacio() { 
    futtat_es_frissit();
}

function futtat_es_frissit() {
    const frissitett_szegmensek = szamol_feszultsegi_allapotok();
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(
        frissitett_szegmensek, Kapcsolo_Allapotok, Topologiai_Oldal_Adatok
    );
}

function szamol_feszultsegi_allapotok() {
    
    Object.values(Logikai_Adatmodell_Graf.segments).forEach(segment => {
        if (!Logikai_Adatmodell_Graf.nodes[segment.id]?.is_feed_point) {
            segment.state = 'unenergized';
            segment.fazis = null;
        }
    });

    const queue = []; 
    const visited = new Set(); 
    
    Logikai_Adatmodell_Graf.feeds.forEach(feed => {
        if (Logikai_Adatmodell_Graf.segments[feed.node]) {
            queue.push(feed.node);
            visited.add(feed.node);
        }
    });

    while (queue.length > 0) {
        const current_segment_id = queue.shift(); 
        const current_node = Logikai_Adatmodell_Graf.nodes[current_segment_id];
        const current_segment = Logikai_Adatmodell_Graf.segments[current_segment_id];

        if (!current_node || !current_segment) continue;
        
        const propagation_fazis = current_segment.fazis;
        current_segment.state = 'energized';

        current_node.connections.forEach(kapcsolo_id => {
            
            const kapcsolo = Logikai_Adatmodell_Graf.segments[kapcsolo_id]; 
            if (!kapcsolo || kapcsolo.group !== 'szakaszolo') return;

            if (Kapcsolo_Allapotok[kapcsolo_id] === "closed") {
                kapcsolo.state = 'energized'; 
                kapcsolo.fazis = propagation_fazis; 
                
                const next_segment_id = kapcsolo.ends.find(id => id !== current_segment_id);
                
                if (next_segment_id && !visited.has(next_segment_id)) {
                    const next_segment = Logikai_Adatmodell_Graf.segments[next_segment_id];
                    if (next_segment) {
                        next_segment.state = 'energized';
                        next_segment.fazis = propagation_fazis; 
                        visited.add(next_segment_id);
                        queue.push(next_segment_id); 
                    }
                }
            } else if (Kapcsolo_Allapotok[kapcsolo_id] === "open") {
                kapcsolo.state = 'open'; 
                kapcsolo.fazis = propagation_fazis;
            } else {
                kapcsolo.state = 'unenergized';
                kapcsolo.fazis = null;
            }
        });
    }
    
    return Logikai_Adatmodell_Graf.segments;
}

// --- 3. FÁZIS: ÁLLAPOT KEZELÉS ---

function kapcsolo_kezeles(kapcsolo_id) {
    if (Kapcsolo_Allapotok.hasOwnProperty(kapcsolo_id)) {
        const uj_allapot = (Kapcsolo_Allapotok[kapcsolo_id] === "closed") ? "open" : "closed";
        Kapcsolo_Allapotok[kapcsolo_id] = uj_allapot;
        console.log(`LOGIKA: A(z) ${kapcsolo_id} állapota váltva: ${uj_allapot}`);
        futtat_es_frissit();
    }
}

function alkalmaz_szcenario(szcenario_id) {
    const szcenario = Szcenario_Adatok.find(sc => sc.id === szcenario_id);
    if (!szcenario) {
        console.error(`Nem található szcenárió: ${szcenario_id}`);
        return;
    }

    const aktualis_lepes = Szcenario_Lepesszamlalok[szcenario_id];

    if (aktualis_lepes >= szcenario.lepesek.length) {
        console.log(`A(z) "${szcenario.nev}" szcenárió végére ért.`);
        return;
    }

    const lepes = szcenario.lepesek[aktualis_lepes];
    Kapcsolo_Allapotok[lepes.kapcsolo] = lepes.allapot;
    Szcenario_Lepesszamlalok[szcenario_id]++;

    console.log(`[${szcenario.nev}] ${aktualis_lepes + 1}/${szcenario.lepesek.length}: ${lepes.kapcsolo} → ${lepes.allapot}`);

    // Az utolsó lépésnél a jelzőt is bekapcsoljuk
    if (Szcenario_Lepesszamlalok[szcenario_id] >= szcenario.lepesek.length) {
        if (window.JelzoModul && szcenario.jelzo_layer) {
            window.JelzoModul.setAktiv(true);
            // Navigáció jelző gomb szinkronizálása
            if (window.Navigacio) {
                Navigacio.jelzoKijelzesAktiv = true;
                const btnJelzo = document.getElementById('btn-jelzo');
                if (btnJelzo) {
                    btnJelzo.textContent = 'Jelzők: BE';
                    btnJelzo.style.background = 'var(--btn-on-bg, #27ae60)';
                    btnJelzo.style.color = '#ffffff';
                }
            }
        }
    }

    futtat_es_frissit();
}

function reset_kapcsolok() {
    // Kapcsolók visszaállítása
    Object.keys(Eredeti_Kapcsolo_Allapotok).forEach(id => {
        Kapcsolo_Allapotok[id] = Eredeti_Kapcsolo_Allapotok[id];
    });

    // Lépésszámlálók nullázása
    Szcenario_Adatok.forEach(sc => {
        Szcenario_Lepesszamlalok[sc.id] = 0;
    });

    futtat_es_frissit();
    console.log("Reset: minden kapcsoló visszaállt az alapállapotba.");
}

// --- PUBLIKUS INTERFÉSZ ---
window.vasut_logika = {
    init_adatok: init_adatok,
    start_szimulacio: start_szimulacio,
    set_grafika_kezleo: set_grafika_kezleo,
    kapcsolo_kezeles: kapcsolo_kezeles,
    alkalmaz_szcenario: alkalmaz_szcenario,
    reset_kapcsolok: reset_kapcsolok,
    get_node_adatok: () => Logikai_Adatmodell_Graf,
    get_szinek: () => Szinek,
    get_kapcsolo_allapotok: () => Kapcsolo_Allapotok,
    get_szcenariok: () => Szcenario_Adatok,
    get_szcenario_lepesszam: (id) => Szcenario_Lepesszamlalok[id] || 0
};