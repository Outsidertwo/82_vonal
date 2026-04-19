// vasut_logika.js - FÁZIS TERJESZTÉS, FIX OLDAL ALAPJÁN TÖRTÉNŐ SZÍNEZÉS

// --- GLOBÁLIS LOGIKAI TÁROLÓK ---
let Logikai_Adatmodell_Graf = {}; 
let Kapcsolo_Allapotok = {};     
let Szinek = {};                
let Szcenariok = {};            
let Grafika_Kezelo_Referencia;  
let Topologiai_Oldal_Adatok = {}; 

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
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(frissitett_szegmensek, Kapcsolo_Allapotok, Topologiai_Oldal_Adatok);
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
    console.warn("Szcenárió alkalmazás ideiglenesen letiltva.");
}

// --- PUBLIKUS INTERFÉSZ ---
window.vasut_logika = {
    init_adatok: init_adatok,
    start_szimulacio: start_szimulacio,
    set_grafika_kezleo: set_grafika_kezleo,
    kapcsolo_kezeles: kapcsolo_kezeles,
    alkalmaz_szcenario: alkalmaz_szcenario, 
    get_node_adatok: () => Logikai_Adatmodell_Graf,
    get_szinek: () => Szinek,
    get_kapcsolo_allapotok: () => Kapcsolo_Allapotok
};