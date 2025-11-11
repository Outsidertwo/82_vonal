// vasut_logika.js - TELJES VERZIÓ (STABIL BFS LOGIKÁVAL)

// --- GLOBÁLIS LOGIKAI TÁROLÓK ---
let Logikai_Adatmodell_Graf = {}; 
let Kapcsolo_Allapotok = {};     
let Szinek = {};                
let Szcenariok = {};            
let Grafika_Kezelo_Referencia;  

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
        
        // Alapértelmezett színek beállítása
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
                Logikai_Adatmodell_Graf.segments[segment_id] = {
                    id: segment_id,
                    ends: [],     
                    group: node_data.type,  
                    state: 'unenergized',               
                    connected_segments: [] 
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
                Logikai_Adatmodell_Graf.segments[id] = {
                    id: id,
                    ends: [from_segment_id, to_segment_id], 
                    group: sw_data.type, // 'szakaszolo'
                    state: sw_data.state,
                    connected_segments: []
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
    
    // 3. Tápforrások (Feeds) beállítása
    Logikai_Adatmodell_Graf.feeds.forEach(feed => {
        const feed_node_id = feed.node;
        
        if (Logikai_Adatmodell_Graf.nodes[feed_node_id]) {
            Logikai_Adatmodell_Graf.nodes[feed_node_id].is_feed_point = true;
            Logikai_Adatmodell_Graf.nodes[feed_node_id].state = 'energized';
        }
        
        // Szegmens energizálása és Fázis/Oldal infó elmentése a BFS-hez
        if (Logikai_Adatmodell_Graf.segments[feed_node_id]) {
            Logikai_Adatmodell_Graf.segments[feed_node_id].state = 'energized';
            Logikai_Adatmodell_Graf.segments[feed_node_id].fazis = feed.phase; 
            Logikai_Adatmodell_Graf.segments[feed_node_id].oldal = feed.oldal;
        }
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
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(frissitett_szegmensek, Kapcsolo_Allapotok);
}

/**
 * Feszültség terjedésének számítása BFS (szélességi bejárás) segítségével.
 * Csak zárt kapcsoló (closed) terjeszt ÉS kerül explicit 'energized' állapotba.
 */
function szamol_feszultsegi_allapotok() {
    
    // 1. Inicializálás és feszültségmentesítés
    Object.values(Logikai_Adatmodell_Graf.segments).forEach(segment => {
        // Csak a tápforrásokat hagyjuk meg energizáltnak
        if (!Logikai_Adatmodell_Graf.nodes[segment.id]?.is_feed_point) {
            segment.state = 'unenergized';
            segment.fazis = null;
            segment.oldal = null;
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
        
        // Szín/fázis információ átadása a terjedő segmensből
        const propagation_fazis = current_segment.fazis;
        const propagation_oldal = current_segment.oldal;
        
        // Feszültség alá helyezzük a jelenlegi szegmenst (w_ csoport)
        current_segment.state = 'energized';

        // Végigmegyünk a csomóponthoz csatlakozó KAPCSOLÓK ID-in
        current_node.connections.forEach(kapcsolo_id => {
            
            const kapcsolo = Logikai_Adatmodell_Graf.segments[kapcsolo_id]; 
            if (!kapcsolo || kapcsolo.group !== 'szakaszolo') return;

            // 3. Kapcsoló Ellenőrzés
            if (Kapcsolo_Allapotok[kapcsolo_id] === "closed") {
                
                // Ha zárt: KAPCSOLÓ is energizált ÉS TOVÁBBTERJESZT
                kapcsolo.state = 'energized'; 
                
                const next_segment_id = kapcsolo.ends.find(id => id !== current_segment_id);
                
                if (next_segment_id && !visited.has(next_segment_id)) {
                    const next_segment = Logikai_Adatmodell_Graf.segments[next_segment_id];
                    if (next_segment) {
                        next_segment.state = 'energized';
                        next_segment.fazis = propagation_fazis;
                        next_segment.oldal = propagation_oldal;
                        visited.add(next_segment_id);
                        queue.push(next_segment_id); 
                    }
                }
            } else if (Kapcsolo_Allapotok[kapcsolo_id] === "open") {
                // Ha nyitott, nem kap 'energized' state-et. Csak a saját állapotát tartja meg.
                kapcsolo.state = 'open'; 
            } else {
                kapcsolo.state = 'unenergized';
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
    get_szcenario_nevek: () => Szcenariok,
    get_szinek: () => Szinek,
    get_kapcsolo_allapotok: () => Kapcsolo_Allapotok
};