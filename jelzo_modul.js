/**
 * Jelző Modul - Bővített Stabil Verzió
 */
/**
 * Jelző Modul - Bővített Stabil Verzió
 */
const JelzoModul = {
    konfiguracio: [],
    utolsoAktivLayer: null,
    aktiv: false,

    init: async function(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`HTTP hiba! Státusz: ${response.status}`);
            this.konfiguracio = await response.json();
        } catch (h) { 
            console.error("JELZŐ MODUL: Hiba a JSON betöltésekor!", h); 
        }
    },

    frissites: function() {
        // Ha ki van kapcsolva, mindent elrejt és kilép
        if (!this.aktiv) {
            for (let i = 0; i < this.konfiguracio.length; i++) {
                const el = document.getElementById(this.konfiguracio[i].layer);
                if (el) { 
                    el.style.display = "none"; 
                    el.style.opacity = "0"; 
                }
            }
            return;
        }

        const adatok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_node_adatok() : null;
        const kapcsolok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_kapcsolo_allapotok() : {};
        
        if (!adatok || !adatok.segments) return;

        // 1. Összes konfigurált jelzőréteg elrejtése
        for (let i = 0; i < this.konfiguracio.length; i++) {
            const el = document.getElementById(this.konfiguracio[i].layer);
            if (el) { 
                el.style.display = "none"; 
                el.style.opacity = "0"; 
            }
        }

        // 2. Szegmensek kigyűjtése állapot szerint
        const mindenSotetId = Object.keys(adatok.segments).filter(id => 
            adatok.segments[id].state !== "energized"
        );
        
        const mindenAktivId = Object.keys(adatok.segments).filter(id => 
            adatok.segments[id].state === "energized"
        );

        let talaltJelzo = null;

        // 3. PRIORITÁSOS KERESÉS
        for (const szabaly of this.konfiguracio) {
            
            // A: Inaktív (sötét) vezetékek ellenőrzése
            const csoport = szabaly.groups || [];
            if (csoport.length > 0 && !csoport.every(id => mindenSotetId.includes(id.trim()))) {
                continue;
            }

            // B: Aktív (feszültség alatti) vezetékek ellenőrzése
            const aktivCsoport = szabaly.active || [];
            if (aktivCsoport.length > 0 && !aktivCsoport.every(id => mindenAktivId.includes(id.trim()))) {
                continue;
            }

            // C: Kapcsolók mechanikai állásának ellenőrzése
            let kapcsolokOk = true;
            if (szabaly.switches) {
                for (let swId in szabaly.switches) {
                    if (kapcsolok[swId] !== szabaly.switches[swId]) {
                        kapcsolokOk = false;
                        break;
                    }
                }
            }

            if (kapcsolokOk) {
                talaltJelzo = szabaly;
                break; 
            }
        }

        // 4. Megjelenítés
        if (talaltJelzo) {
            const el = document.getElementById(talaltJelzo.layer);
            if (el) {
                el.style.display = "block";
                el.style.opacity = "1";
                
                if (this.utolsoAktivLayer !== talaltJelzo.layer) {
                    console.log(`>>> JELZŐ: ${talaltJelzo.layer}`);
                    this.utolsoAktivLayer = talaltJelzo.layer;
                }
            }
        } else {
            this.utolsoAktivLayer = null;
        }
    },

    setAktiv: function(erteke) {
        this.aktiv = erteke;
        this.frissites();
    }
};

window.JelzoModul = JelzoModul;