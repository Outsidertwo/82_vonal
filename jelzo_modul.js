/**
 * Jelzo Modul - allapotfelismeres es opcionális megjelenites.
 */
const JelzoModul = {
    konfiguracio: [],
    utolsoAktivLayer: null,
    aktualisAktivLayer: null,
    aktiv: false,

    init: async function(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`HTTP hiba! Statusz: ${response.status}`);
            this.konfiguracio = await response.json();
        } catch (h) {
            console.error("JELZO MODUL: Hiba a JSON betoltesekor!", h);
        }
    },

    _elrejtMindenLayer: function() {
        for (let i = 0; i < this.konfiguracio.length; i++) {
            const el = document.getElementById(this.konfiguracio[i].layer);
            if (el) {
                el.style.display = "none";
                el.style.opacity = "0";
            }
        }
    },

    _keresAktivJelzo: function() {
        const adatok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_node_adatok() : null;
        const kapcsolok = typeof vasut_logika !== 'undefined' ? vasut_logika.get_kapcsolo_allapotok() : {};

        if (!adatok || !adatok.segments) return null;

        const mindenSotetId = Object.keys(adatok.segments).filter(id =>
            adatok.segments[id].state !== "energized"
        );

        const mindenAktivId = Object.keys(adatok.segments).filter(id =>
            adatok.segments[id].state === "energized"
        );

        for (const szabaly of this.konfiguracio) {
            const csoport = szabaly.groups || [];
            if (csoport.length > 0 && !csoport.every(id => mindenSotetId.includes(id.trim()))) {
                continue;
            }

            const aktivCsoport = szabaly.active || [];
            if (aktivCsoport.length > 0 && !aktivCsoport.every(id => mindenAktivId.includes(id.trim()))) {
                continue;
            }

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
                return szabaly;
            }
        }

        return null;
    },

    frissites: function() {
        this._elrejtMindenLayer();

        const talaltJelzo = this._keresAktivJelzo();
        this.aktualisAktivLayer = talaltJelzo ? talaltJelzo.layer : null;

        if (window.MunkaengedelyModul) {
            window.MunkaengedelyModul.frissitAktivLayer(this.aktualisAktivLayer);
        }

        if (!this.aktiv) {
            return;
        }

        if (talaltJelzo) {
            const el = document.getElementById(talaltJelzo.layer);
            if (el) {
                el.style.display = "block";
                el.style.opacity = "1";

                if (this.utolsoAktivLayer !== talaltJelzo.layer) {
                    console.log(`>>> JELZO: ${talaltJelzo.layer}`);
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
    },

    getAktivLayer: function() {
        return this.aktualisAktivLayer;
    }
};

window.JelzoModul = JelzoModul;
