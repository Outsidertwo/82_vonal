/**
 * Jelző Modul - Debug Verzió
 * Kezeli a jelzőrétegek megjelenítését feszültség és kapcsolóállás alapján.
 */
const JelzoModul = {
    konfiguracio: [],
    utolsoAktivLayer: null,

    /**
     * Inicializálja a modult a megadott JSON konfigurációval.
     */
    init: async function(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`HTTP hiba! Státusz: ${response.status}`);
            this.konfiguracio = await response.json();
            console.log("!!! JELZŐ MODUL: Konfiguráció sikeresen betöltve.");
        } catch (h) { 
            console.error("!!! JELZŐ MODUL: Hiba a JSON betöltésekor!", h); 
        }
    },

    /**
     * Frissíti a jelzők állapotát a vasúti logika alapján.
     * Ezt a függvényt a grafikai kezelő hívja meg minden változáskor.
     */
    frissites: function() {
        console.groupCollapsed("--- JELZŐ MODUL FRISSÍTÉS ---");

        const adatok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_node_adatok() : null;
        const kapcsolok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_kapcsolo_allapotok() : {};
        
        if (!adatok || !adatok.segments) {
            console.error("HIBA: Nem érhetőek el a vasút_logika adatai!");
            console.groupEnd();
            return;
        }

        // 1. Összes konfigurált jelzőréteg elrejtése (Reset)
        this.konfiguracio.forEach(s => {
            const el = document.getElementById(s.layer);
            if (el) { 
                el.style.display = "none"; 
                el.style.opacity = "0"; 
            }
        });

        // 2. Feszültségmentes (sötét) szegmensek kigyűjtése a logikából
        const mindenSotetId = Object.keys(adatok.segments).filter(id => 
            adatok.segments[id].state !== "energized"
        );
        console.log("Sötét szegmensek száma jelenleg:", mindenSotetId.length);

        let talaltJelzo = null;

        // 3. PRIORITÁSOS KERESÉS (A JSON-ben lévő sorrend számít!)
        for (const szabaly of this.konfiguracio) {
            console.log(`Ellenőrzés: [${szabaly.layer}]`);

            // A: Vezetékcsoportok (groups) ellenőrzése
            const csoport = (szabaly.groups || []).map(id => id.trim());
            const csoportPipalva = csoport.length === 0 || csoport.every(id => mindenSotetId.includes(id));
            
            if (!csoportPipalva) {
                console.log(`   X Bukta: A csoport (${csoport}) valamelyik eleme feszültség alatt van.`);
                continue;
            }

            // B: Kapcsolók/Szakaszolók (switches) mechanikai állásának ellenőrzése
            let kapcsolokOk = true;
            if (szabaly.switches) {
                for (let swId in szabaly.switches) {
                    const elvartAllapot = szabaly.switches[swId];
                    const aktualisAllapot = kapcsolok[swId]; // A logika Kapcsolo_Allapotok-jából
                    
                    console.log(`   ? Kapcsoló: ${swId} | Elvárt: ${elvartAllapot} | Aktuális: ${aktualisAllapot}`);

                    if (aktualisAllapot !== elvartAllapot) {
                        console.log(`   X Bukta: Kapcsoló állás nem egyezik.`);
                        kapcsolokOk = false;
                        break;
                    }
                }
            }

            // Ha minden feltétel (csoport ÉS kapcsolók) teljesül
            if (kapcsolokOk) {
                console.log(`   => SIKER: Kiválasztva: ${szabaly.layer}`);
                talaltJelzo = szabaly;
                break; // Megállunk az első érvényes szabálynál
            }
        }

        // 4. Megjelenítés végrehajtása az SVG-ben
        if (talaltJelzo) {
            const el = document.getElementById(talaltJelzo.layer);
            if (el) {
                el.style.display = "block";
                el.style.opacity = "1";
                
                if (this.utolsoAktivLayer !== talaltJelzo.layer) {
                    console.info(`%c>>> JELZŐ AKTÍV: ${talaltJelzo.layer}`, "color: white; background: green; padding: 2px 5px; border-radius: 3px;");
                    this.utolsoAktivLayer = talaltJelzo.layer;
                }
            } else {
                console.error(`KRITIKUS HIBA: A JSON-ben szereplő '${talaltJelzo.layer}' ID nem található az SVG-ben!`);
            }
        } else {
            console.log("Nincs megjeleníthető jelző az aktuális állapotban.");
            this.utolsoAktivLayer = null;
        }

        console.groupEnd();
    }
};

// Modul regisztrálása a globális névtérbe
window.JelzoModul = JelzoModul;