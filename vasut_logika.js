/*
* =========================================================================================
* VASUT_LOGIKA.JS - A Szimuláció Logikai Magja (a "DÖNTÉSHOZÓ")
* =========================================================================================
* * A működés lényege: BFS Algoritmus (Breadth-First Search - Szélességi Bejárás)
* A BFS garantálja, hogy minden útvonalat megtalál és kezeli a párhuzamos betáplálásokat.
*/

// --- GLOBÁLIS LOGIKAI TÁROLÓK ---

let Logikai_Adatmodell_Graf = {}; // A teljes gráf: szakaszok és szomszédságok (w_...)
let Kapcsolo_Allapotok = {};     // A kapcsolók aktuális logikai állása: { "s_id": "closed" | "open", ... }
let Szinek = {};                // A JSON-ból beolvasott színpaletta
let Szcenariok = {};            // A beolvasott szcenáriók adatai
let Grafika_Kezelo_Referencia;  // A grafika_kezelo.js modul publikus interfésze (visszahívás).


// --- PUBLIKUS SEGÉDMETÓDUSOK A GRAFIKÁNAK ---

/**
 * Szinkronizálja a külső Grafika Kezelő Referenciát.
 * Ezt a függvényt a grafika_kezelo.js hívja meg az inicializáláskor.
 * @param {object} referenca - A grafika_kezelo.js modul interfésze.
 */
function set_grafika_kezleo(referenca) {
    Grafika_Kezelo_Referencia = referenca;
}

/**
 * Lekérdez egy JSON fájlt aszinkron módon.
 */
async function betolt_json(fajl_nev) {
    const valasz = await fetch(fajl_nev);
    if (!valasz.ok) {
        throw new Error(`HIBA: Nem sikerült betölteni a(z) ${fajl_nev} fájlt.`);
    }
    return valasz.json();
}


// --- 1. FÁZIS: INICIALIZÁLÁS ---

/**
 * Elindítja a Logika Modult: betölti az adatokat és felépíti a Logikai Gráfot.
 */
async function init() {
    try {
        const topologia_json = await betolt_json('82_topologia.json');
        const szcenario_json = await betolt_json('scenarios.json');

        epitesi_kapcsolasi_graf(topologia_json);
        Szcenariok = szcenario_json.scenariok;
        
        // Előkészíti a grafikát (ez is aszinkron művelet, de a Grafika Modul kezeli)
        Grafika_Kezelo_Referencia.init_grafika_kezleo(Szcenariok, Kapcsolo_Allapotok);

        // Első számítás és frissítés a kezdeti állapottal
        futtat_es_frissit();

    } catch (hiba) {
        console.error("Hiba a szimuláció inicializálásában:", hiba);
    }
}

/**
 * Felépíti a Logikai Adatmodell Gráfot a JSON adatokból.
 */
function epitesi_kapcsolasi_graf(nyers_json) {
    Szinek = nyers_json.szinek;
    const kapcsolok_index = {};

    // 1. Kapcsolók Indexelése és Alapállás Mentése
    nyers_json.stations.forEach(station => {
        station.switches.forEach(sw => {
            kapcsolok_index[sw.id] = sw;
            Kapcsolo_Allapotok[sw.id] = sw.state; // Alapállás (closed/open) mentése
        });
    });

    // 2. Node-ok (Szakaszok) felépítése és inicializálása
    nyers_json.stations.forEach(station => {
        station.nodes.forEach(node => {
            const fazis_oldal = `${node.fazis}_${node.oldal}`;
            const aktiv_szin_kod = Szinek[fazis_oldal] || Szinek.kikapcsolt;

            Logikai_Adatmodell_Graf[node.id] = {
                id: node.id,
                aktiv_szin: aktiv_szin_kod,         // A Topológiában definiált szín
                is_feszultseg_alatt: false,         // Kezdeti logikai állapot
                is_feed: nyers_json.feeds.some(f => f.node === node.id), // Feszültségforrás-e?
                szomszedok: []                      // A csatlakozó szakaszok listája
            };
        });
    });

    // 3. Élek (Összeköttetések/Kapcsolók) hozzárendelése (Gráf építése)
    Object.values(kapcsolok_index).forEach(sw => {
        const node_from = Logikai_Adatmodell_Graf[sw.from];
        const node_to = Logikai_Adatmodell_Graf[sw.to];

        if (node_from && node_to) {
            // A kapcsolat kétirányú:
            node_from.szomszedok.push({ node_id: sw.to, kapcsolo_id: sw.id });
            node_to.szomszedok.push({ node_id: sw.from, kapcsolo_id: sw.id });
        }
    });
}


// --- 2. FÁZIS: LOGIKA MAGJA (BFS) ---

/**
 * A fő vezérlő rutin, ami minden logikai változás után lefut.
 */
function futtat_es_frissit() {
    // 1. BFS Algoritmus futtatása a feszültség alatt álló szakaszok listájáért
    const feszultseg_lista = szamol_feszultsegi_allapotok();
    
    // 2. Frissítés a Grafika Modulban (színezés)
    Grafika_Kezelo_Referencia.frissit_osszes_elem_megjelenitese(feszultseg_lista);

    // 3. Kapcsolók vizuális frissítése (nyitott/zárt jelzés)
    Grafika_Kezelo_Referencia.frissit_kapcsolo_megjelenites(Kapcsolo_Allapotok);
}

/**
 * BFS Algoritmus: Kiszámítja, mely szakaszok vannak feszültség alatt.
 * @returns {Array} - A feszültség alatt álló node-ok teljes listája.
 */
function szamol_feszultsegi_allapotok() {
    
    let varolista = [];   // A BFS várólistája (Queue)
    let eredmeny_lista = []; // A grafikai kimeneti lista (a feszült node-ok)

    // Inicializálás: Minden node-ot resetelünk, a forrásokat betesszük a várólistába
    Object.values(Logikai_Adatmodell_Graf).forEach(node => {
        node.is_feszultseg_alatt = false;
        if (node.is_feed) {
            node.is_feszultseg_alatt = true;
            varolista.push(node.id);
            eredmeny_lista.push(node);
        }
    });

    // Bejárási Hurok (Feszültség terjedése)
    let node_A_id;
    while (varolista.length > 0) {
        node_A_id = varolista.shift(); // Kiemeljük a vizsgálandó szakasz ID-ját
        const node_A = Logikai_Adatmodell_Graf[node_A_id];

        // Megvizsgáljuk a Node A összes szomszédját
        for (const szomszed of node_A.szomszedok) {
            const node_B = Logikai_Adatmodell_Graf[szomszed.node_id];

            // 1. FONTOS FELTÉTEL: A kapcsoló zárt állapotban van-e?
            const kapcsolo_zart = Kapcsolo_Allapotok[szomszed.kapcsolo_id] === "closed";
            
            // 2. FONTOS FELTÉTEL: A Node B még nincs feszültség alatt? (Ne vizsgáljuk újra a látogatott elemeket)
            const nincs_feszultseg_alatt = !node_B.is_feszultseg_alatt;

            if (kapcsolo_zart && nincs_feszultseg_alatt) {
                // Feszültség terjedése (átadása)
                node_B.is_feszultseg_alatt = true;
                varolista.push(node_B.id);
                eredmeny_lista.push(node_B);
            }
        }
    }
    
    return eredmeny_lista;
}


// --- 3. FÁZIS: ÁLLAPOT KEZELÉS ---

/**
 * Kezeli a felhasználói kattintásból eredő kapcsolóállás váltását.
 */
function kapcsolo_kezeles(kapcsolo_id) {
    if (Kapcsolo_Allapotok.hasOwnProperty(kapcsolo_id)) {
        // Átváltjuk az aktuális állapotot (closed <-> open)
        const uj_allapot = (Kapcsolo_Allapotok[kapcsolo_id] === "closed") ? "open" : "closed";
        Kapcsolo_Allapotok[kapcsolo_id] = uj_allapot;
        
        // Teljes szimuláció frissítése az új állással
        futtat_es_frissit();
    }
}

/**
 * Beállítja a hálózatot egy előre definiált szcenárióba.
 */
function alkalmaz_szcenario(szcenario_id) {
    const kivalasztott_szcenario = Szcenariok[szcenario_id];

    if (!kivalasztott_szcenario) return;
    
    // 1. Reset az összes kapcsolóra: minden visszaáll az alap "closed" állapotba.
    // Ezt a bonyolultabb JSON állás helyett most feltételezzük.
    Object.keys(Kapcsolo_Allapotok).forEach(id => {
        Kapcsolo_Allapotok[id] = 'closed'; 
    });

    // 2. Felülírjuk azokat az állásokat, amiket a szcenárió definiál
    for (const [id, allapot] of Object.entries(kivalasztott_szcenario)) {
        if (Kapcsolo_Allapotok.hasOwnProperty(id)) {
            Kapcsolo_Allapotok[id] = allapot;
        }
    }

    // Teljes szimuláció frissítése az új állással
    futtat_es_frissit();
}


// --- PUBLIKUS INTERFÉSZ A KÜLSŐ MODULOK FELÉ ---
window.vasut_logika = {
    init: init,
    set_grafika_kezleo: set_grafika_kezleo,
    kapcsolo_kezeles: kapcsolo_kezeles,
    alkalmaz_szcenario: alkalmaz_szcenario,
    get_node_adatok: (id) => Logikai_Adatmodell_Graf[id],
    get_szcenario_nevek: () => Szcenariok,
    get_szinek: () => Szinek,
    get_kapcsolo_allapotok: () => Kapcsolo_Allapotok
};