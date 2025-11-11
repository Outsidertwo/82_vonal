// vasut_logika.js - FÁZIS TERJESZTÉS, FIX OLDAL ALAPJÁN TÖRTÉNŐ SZÍNEZÉS

// --- GLOBÁLIS LOGIKAI TÁROLÓK ---
let Logikai_Adatmodell_Graf = {}; 
let Kapcsolo_Allapotok = {};     
let Szinek = {};                
let Szcenariok = {};            
let Grafika_Kezelo_Referencia;  
// ÚJ: Eredeti topológiai oldaladatok tárolása
let Topologiai_Oldal_Adatok = {}; 

// --- SEGÉDFÜGGVÉNYEK ---

async function betolt_json(fajl_nev) {
    console.log(`LOGIKA: Megkísérli betölteni a JSON fájlt: ${fajl_nev}`); 
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
        
        Szinek = topologia_json.szinek || {};
        // Kényszerítsük a default szín beállítását, ha hiányzik
        if (!Szinek.energized) Szinek.energized = '#ff0000'; // Vörös
        if (!Szinek.unenergized) Szinek.unenergized = '#808080'; // Szürke
        
        if (Grafika_Kezelo_Referencia) {
            Grafika_Kezelo_Referencia.init_grafika_kezelo(Szcenariok, Kapcsolo_Allapotok); 
        }
        
    } catch (hiba) {
        console.error("KRITIKUS HIBA a szimuláció inicializálásában:", hiba); 
    }
}

// ----------------------------------------------------------------------------------------------------------------------

/**
 * Létrehozza a kapcsolóállapotokat és felépíti a logikai gráfot a JSON-ból.
 */
function epitesi_kapcsolasi_graf(nyers_json) {
    
    // 1. Logikai Gráf inicializálása
    Logikai_Adatmodell_Graf = {
        nodes: {},    
        segments: {}, 
        feeds: nyers_json.feeds || []     
    };
    
    const NodeToSegmentMap = {};

    // 2. Szegmensek, Csomópontok és Kapcsoló Állapotok gyűjtése
    nyers_json.stations.forEach(station => { 
        
        // --- Csomópontok és Szegmensek gyűjtése ---
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
                
                // --- OLDAL ADAT ELMENTÉSE IDE: KIZÁRÓLAG TOPOLÓGIAI CÉLRA ---
                Topologiai_Oldal_Adatok[segment_id] = node_data.oldal || 'bal'; // Azért bal, mert a legtöbb esetben a bal oldal a default.
                
                Logikai_Adatmodell_Graf.segments[segment_id] = {
                    id: segment_id,
                    ends: [],     
                    group: node_data.type,  
                    state: 'unenergized',               
                    connected_segments: [],
                    fazis: null // CSAK FÁZIS, OLDAL NEM
                };
            });
        }
        
        // --- Kapcsoló (Switch) Állapotok Inicializálása és gráfba vitele ---
        if (station.switches) {
            Object.entries(station.switches).forEach(([id, sw_data]) => {
                Kapcsolo_Allapotok[id] = sw_data.state || "closed";
                
                const from_segment_id = sw_data.from;
                const to_segment_id = sw_data.to;

                // Kapcsoló szegmensként
                // A szakaszolóknak is kell az oldal adat, a from-szegmensről öröklik azt
                Topologiai_Oldal_Adatok[id] = Topologiai_Oldal_Adatok[from_segment_id] || 'bal'; 
                
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
    
    // 3. Tápforrások (Feeds) beállítása: CSAK a fazis adat terjed!
    Logikai_Adatmodell_Graf.feeds.forEach(feed => {
        const node_id = feed.node;
        const segment_id = NodeToSegmentMap[node_id] || node_id; 

        if (Logikai_Adatmodell_Graf.nodes[node_id]) {
            Logikai_Adatmodell_Graf.nodes[node_id].is_feed_point = true;
            Logikai_Adatmodell_Graf.nodes[node_id].state = 'energized';
        }
        
        // Szegmens energizálása és FÁZIS infó elmentése a BFS-hez
        if (Logikai_Adatmodell_Graf.segments[segment_id]) {
            Logikai_Adatmodell_Graf.segments[segment_id].state = 'energized';
            Logikai_Adatmodell_Graf.segments[segment_id].fazis = feed.phase; 
        } 
        if (segment_id !== node_id && Logikai_Adatmodell_Graf.segments[node_id]) {
             Logikai_Adatmodell_Graf.segments[node_id].state = 'energized';
             Logikai_Adatmodell_Graf.segments[node_id].fazis = feed.phase; 
        }
        
        // EXTRA FIX: A gyűjtősín (ami a feed) oldalát is a 'kozep'-ről átállítjuk 'bal'-ra (vagy ahogy a feedben megadtad)
        // Mivel törölni akarjuk a kozep oldalt:
        Topologiai_Oldal_Adatok[segment_id] = feed.oldal || Topologiai_Oldal_Adatok[segment_id];

    }); 

    console.log(`GRÁF ÉPÍTÉS KÉSZ: ${Object.keys(Logikai_Adatmodell_Graf.nodes).length} csomópont, ${Object.keys(Logikai_Adatmodell_Graf.segments).length} szegmens inicializálva.`);
}

// ----------------------------------------------------------------------------------------------------------------------

// --- 2. FÁZIS: SZÁMÍTÁS ÉS FRISSÍTÉS ---

function start_szimulacio() { 
    futtat_es_frissit();
}

function futtat_es_frissit() {
    const frissitett_szegmensek = szamol_feszultsegi_allapotok();
    // ÁTADJUK A GRAFIKUSNAK A FIX OLDAL ADATOKAT IS!
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(frissitett_szegmensek, Kapcsolo_Allapotok, Topologiai_Oldal_Adatok);
}

/**
 * Feszültség terjedésének számítása BFS (szélességi bejárás) segítségével.
 */
function szamol_feszultsegi_allapotok() {
    
    // 1. Inicializálás és feszültségmentesítés
    Object.values(Logikai_Adatmodell_Graf.segments).forEach(segment => {
        // Visszaállítjuk a fázis infókat, kivéve a feed pontokat
        if (!Logikai_Adatmodell_Graf.nodes[segment.id]?.is_feed_point) {
            segment.state = 'unenergized';
            segment.fazis = null;
        }
    });

    const queue = []; 
    const visited = new Set(); 
    
    // Kezdőpontok (tápforrásokhoz tartozó szegmens ID-k) feltöltése
    Logikai_Adatmodell_Graf.feeds.forEach(feed => {
        if (Logikai_Adatmodell_Graf.segments[feed.node]) {
            queue.push(feed.node);
            visited.add(feed.node);
        }
    });

    // 2. BFS futtatása
    while (queue.length > 0) {
        const current_segment_id = queue.shift(); 
        const current_node = Logikai_Adatmodell_Graf.nodes[current_segment_id];
        const current_segment = Logikai_Adatmodell_Graf.segments[current_segment_id];

        if (!current_node || !current_segment) continue;
        
        // CSAK a fázis információt terjesztjük!
        const propagation_fazis = current_segment.fazis;
        
        current_segment.state = 'energized';

        current_node.connections.forEach(kapcsolo_id => {
            
            const kapcsolo = Logikai_Adatmodell_Graf.segments[kapcsolo_id]; 
            if (!kapcsolo || kapcsolo.group !== 'szakaszolo') return;

            // 3. Kapcsoló Ellenőrzés
            if (Kapcsolo_Allapotok[kapcsolo_id] === "closed") {
                
                // Ha zárt: KAPCSOLÓ is energizált ÉS TOVÁBBTERJESZT
                kapcsolo.state = 'energized'; 
                kapcsolo.fazis = propagation_fazis; 
                
                const next_segment_id = kapcsolo.ends.find(id => id !== current_segment_id);
                
                if (next_segment_id && !visited.has(next_segment_id)) {
                    const next_segment = Logikai_Adatmodell_Graf.segments[next_segment_id];
                    if (next_segment) {
                        next_segment.state = 'energized';
                        // FÁZIS INFÓ TERJESZTÉSE A KÖVETKEZŐ SZEGMENSBE
                        next_segment.fazis = propagation_fazis; 
                        visited.add(next_segment_id);
                        queue.push(next_segment_id); 
                    }
                }
            } else if (Kapcsolo_Allapotok[kapcsolo_id] === "open") {
                kapcsolo.state = 'open'; 
                kapcsolo.fazis = null; 
            } else {
                kapcsolo.state = 'unenergized';
                kapcsolo.fazis = null;
            }
        });
    }
    
    return Logikai_Adatmodell_Graf.segments;
}

// ----------------------------------------------------------------------------------------------------------------------

// --- 3. FÁZIS: ÁLLAPOT KEZELÉS ---

function kapcsolo_kezeles(kapcsolo_id) {
    if (Kapcsolo_Allapotok.hasOwnProperty(kapcsolo_id)) {
        const uj_allapot = (Kapcsolo_Allapotok[kapcsolo_id] === "closed") ? "open" : "closed";
        Kapcsolo_Allapotok[kapcsolo_id] = uj_allapot;
        
        console.log(`LOGIKA: A(z) ${kapcsolo_id} állapota váltva: ${uj_allapot}`);
        futtat_es_frissit(); // Újraszámolás és frissítés
    }
}

function alkalmaz_szcenario(szcenario_id) {
    console.warn("Szcenárió alkalmazás ideiglenesen letiltva.");
}


// --- PUBLIKUS INTERFÉSZ A KÜLSŐ MODULOK FELÉ ---
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