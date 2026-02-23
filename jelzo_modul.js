const JelzoModul = {
    konfiguracio: [],
    utolsoAktivLayer: null,

    init: async function(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            this.konfiguracio = await response.json();
        } catch (h) { 
            console.error("JELZŐ MODUL: Hiba a konfiguráció betöltésekor!", h); 
        }
    },

    frissites: function() {
        const adatok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_node_adatok() : null;
        const kapcsolok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_kapcsolo_allapotok() : {};
        
        if (!adatok || !adatok.segments) return;

        // 1. Összes jelzőréteg alaphelyzetbe állítása
        this.konfiguracio.forEach(s => {
            const el = document.getElementById(s.layer);
            if (el) { 
                el.style.display = "none"; 
                el.style.opacity = "0"; 
            }
        });

        // 2. Feszültségmentes szegmensek kigyűjtése
        const mindenSotetId = Object.keys(adatok.segments).filter(id => 
            adatok.segments[id].state !== "energized"
        );

        let talaltJelzo = null;

        // 3. Megfelelő szabály kiválasztása (prioritási sorrendben)
        for (const szabaly of this.konfiguracio) {
            // Vezetékcsoportok ellenőrzése
            const csoport = (szabaly.groups || []).map(id => id.trim());
            if (csoport.length > 0 && !csoport.every(id => mindenSotetId.includes(id))) continue;

            // Szakaszolók mechanikai állásának ellenőrzése
            let feltetelekPipalva = true;
            if (szabaly.switches) {
                for (let swId in szabaly.switches) {
                    if (kapcsolok[swId] !== szabaly.switches[swId]) {
                        feltetelekPipalva = false;
                        break;
                    }
                }
            }

            if (feltetelekPipalva) {
                talaltJelzo = szabaly;
                break; 
            }
        }

        // 4. Megjelenítés végrehajtása
        if (talaltJelzo) {
            const el = document.getElementById(talaltJelzo.layer);
            if (el) {
                el.style.display = "block";
                el.style.opacity = "1";
                
                if (this.utolsoAktivLayer !== talaltJelzo.layer) {
                    console.log(`JELZŐ VÁLTÁS: ${talaltJelzo.layer}`);
                    this.utolsoAktivLayer = talaltJelzo.layer;
                }
            }
        } else {
            this.utolsoAktivLayer = null;
        }
    }
};

window.JelzoModul = JelzoModul;