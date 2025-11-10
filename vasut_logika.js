// vasut_logika.js - TELJES VERZIÓ (GRÁF ÉPÍTÉS, BFS SZÁMÍTÁS ÉS KAPCSOLÓ KEZELÉS)

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
        feeds: {}     
    };
    
    // 2. Szegmensek, Csomópontok és Kapcsoló Állapotok gyűjtése
    nyers_json.stations.forEach(station => { 
        
        // --- Csomópontok és Szegmensek gyűjtése EGYÜTT a 'nodes' objektumból ---
        if (station.nodes) {
            Object.entries(station.nodes).forEach(([id, node_data]) => {
                
                // Csomópont bejegyzése (összeköttetések gyűjtése)
                Logikai_Adatmodell_Graf.nodes[id] = { 
                    id: id,
                    connections: node_data.connects || [], 
                    is_feed_point: false, 
                    state: 'unenergized' 
                };

                // SZERKEZET: A nodes bejegyzés maga a színezhető szegmens.
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
                 // Kapcsolók állapota tárolása
                 Kapcsolo_Allapotok[id] = sw_data.state || "closed";
                 
                 const from_segment_id = sw_data.from;
                 const to_segment_id = sw_data.to;

                 // A kapcsolót (szakaszolót) is szegmensként vesszük fel, mivel színezni kell.
                 Logikai_Adatmodell_Graf.segments[id] = {
                     id: id,
                     ends: [from_segment_id, to_segment_id], 
                     group: sw_data.type, // 'szakaszolo'
                     state: sw_data.state,
                     connected_segments: []
                 };

                 // Frissítjük a két szegmens kapcsolatát (a kapcsolókon keresztül)
                 if (Logikai_Adatmodell_Graf.segments[from_segment_id]) {
                    Logikai_Adatmodell_Graf.segments[from_segment_id].connected_segments.push(to_segment_id);
                 }
                 if (Logikai_Adatmodell_Graf.segments[to_segment_id]) {
                    Logikai_Adatmodell_Graf.segments[to_segment_id].connected_segments.push(from_segment_id);
                 }
            });
        }
    });
    
    // 3. Tápforrások azonosítása (Feeds)
    if (nyers_json.feeds) {
        Logikai_Adatmodell_Graf.feeds = nyers_json.feeds;
        
        // A JSON-ban a feeds egy TÖMB, a forEach jó.
        nyers_json.feeds.forEach(feed => {
            const feed_node_id = feed.node;
            
            // Feszültség alá helyezzük a tápforráshoz tartozó csomópontot (a BFS kezdőpontja)
            if (Logikai_Adatmodell_Graf.nodes[feed_node_id]) {
                Logikai_Adatmodell_Graf.nodes[feed_node_id].is_feed_point = true;
                Logikai_Adatmodell_Graf.nodes[feed_node_id].state = 'energized';
            }
            
            // A szegmenst is feszültség alá helyezzük a kezdeti színezéshez.
            if (Logikai_Adatmodell_Graf.segments[feed_node_id]) {
                 Logikai_Adatmodell_Graf.segments[feed_node_id].state = 'energized';
            }
        }); // <- Itt volt a valószínű hiba, a blokk lezárása
    }

    console.log(`GRÁF ÉPÍTÉS KÉSZ: ${Object.keys(Logikai_Adatmodell_Graf.nodes).length} csomópont, ${Object.keys(Logikai_Adatmodell_Graf.segments).length} szegmens inicializálva.`);
}

// ----------------------------------------------------------------------------------------------------------------------

// --- 2. FÁZIS: SZÁMÍTÁS ÉS FRISSÍTÉS ---

function start_szimulacio() { 
    futtat_es_frissit();
}

function futtat_es_frissit() {
    const frissitett_szegmensek = szamol_feszultsegi_allapotok();
    // A grafikus kezelőnek a frissített szegmens állapotokat (színeket) és a kapcsoló állást is átadjuk.
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(frissitett_szegmensek, Kapcsolo_Allapotok);
}

/**
 * Feszültség terjedésének számítása BFS (szélességi bejárás) segítségével.
 */
function szamol_feszultsegi_allapotok() {
    
    // 1. Inicializálás
    Object.values(Logikai_Adatmodell_Graf.nodes).forEach(node => {
        if (!node.is_feed_point) {
            node.state = 'unenergized';
        }
    });
    Object.values(Logikai_Adatmodell_Graf.segments).forEach(segment => {
        if (segment.group !== 'szakaszolo' && !Logikai_Adatmodell_Graf.nodes[segment.id]?.is_feed_point) { 
            segment.state = 'unenergized';
        } else if (segment.group === 'szakaszolo') {
            // A kapcsolók állapota a logikai tárolóból származik
            segment.state = Kapcsolo_Allapotok[segment.id] === 'closed' ? 'energized' : 'open';
        }
    });

    const queue = []; 
    const visited = new Set(); 
    
    // Kezdőpontok (tápforrások) feltöltése
    Object.values(Logikai_Adatmodell_Graf.nodes).forEach(node => {
        if (node.is_feed_point) {
            queue.push(node.id);
            visited.add(node.id);
        }
    });

    // 2. BFS futtatása
    while (queue.length > 0) {
        const current_segment_id = queue.shift(); 
        const current_node = Logikai_Adatmodell_Graf.nodes[current_segment_id];

        if (!current_node) continue;
        
        // A jelenlegi szegmenst/csomópontot feszültség alá helyezzük
        if (Logikai_Adatmodell_Graf.segments[current_segment_id]) {
            Logikai_Adatmodell_Graf.segments[current_segment_id].state = 'energized';
        }

        // Végigmegyünk a csomóponthoz csatlakozó kapcsolók ID-in (pl. "s_H1V")
        current_node.connections.forEach(kapcsolo_id => {
            
            const kapcsolo = Logikai_Adatmodell_Graf.segments[kapcsolo_id]; 
            if (!kapcsolo || kapcsolo.group !== 'szakaszolo') return;

            // 3. Kapcsoló Ellenőrzés
            if (Kapcsolo_Allapotok[kapcsolo_id] === "open") {
                // Ha nyitott, itt megáll a terjedés.
                return;
            }

            // Ha zárt, a feszültség átjut, és a kapcsoló is feszültség alá kerül.
            kapcsolo.state = 'energized';
            
            // Megkeressük a kapcsoló másik végét (szegmens ID-t)
            const next_segment_id = kapcsolo.ends.find(id => id !== current_segment_id);
            const next_segment = Logikai_Adatmodell_Graf.segments[next_segment_id];
            
            // Ha a következő szegmens létezik és még nem jártuk be, folytatjuk a BFS-t.
            if (next_segment && !visited.has(next_segment_id)) {
                next_segment.state = 'energized';
                visited.add(next_segment_id);
                queue.push(next_segment_id); 
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