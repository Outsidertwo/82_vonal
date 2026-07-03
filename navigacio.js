const Navigacio = {
    allomasok: [
        ["Maglód", "rect-maglod"],
        ["Gyömrő", "rect-gyomro"],
        ["Mende", "rect-mende"],
        ["Pusztaszentisván fázishatár", "rect-puszta"],
        ["Sülysáp", "rect-sulysap"],
        ["Tápiószecső", "rect-szecso"],
        ["Nagykáta", "rect-kata"],
        ["Üzemviteli fázishatár", "rect-uzem"],
        ["Tápiószele", "rect-szele"],
        ["Tápiógyörgye", "rect-gyorgye"],
        ["Betápláló fázishatár", "rect-betap"],
        ["Újszász", "rect-ujszasz"],
        ["Abonyi út fázishatár", "rect-abonyiut"],
        ["Jászberény fázishatár", "rect-jaszbereny"],
        ["Portelek", "rect-portelek"],
        ["Jászboldogháza", "rect-jbh"]
    ],

    jelzoKijelzesAktiv: false,
    sotetModAktiv: false,
    szcenarioFeliratElemek: {},

    init: function() {
        if (document.getElementById('station-picker')) return;

        const menuHTML = `
            <div id="nav-panel" style="
                position: fixed; top: 15px; left: 15px;
                background: var(--panel-bg, rgba(255,255,255,0.95));
                color: var(--panel-text, #2c3e50);
                padding: 12px; border: 2px solid var(--panel-border, #2c3e50);
                z-index: 9999; border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                display: flex; flex-direction: row; align-items: center; gap: 10px;">

                <div>
                    <label for="station-select" style="display:block; font-weight:bold; margin-bottom:6px; color: var(--panel-text, #2c3e50);">Állomásválasztó:</label>
                    <select id="station-select" style="
                        width: 180px; padding: 8px; border-radius: 4px;
                        border: 1px solid #bdc3c7; cursor: pointer; font-size: 14px;
                        background: var(--select-bg, #fff);
                        color: var(--panel-text, #2c3e50);">
                        <option value="">-- Válassz állomást --</option>
                        ${this.allomasok.map(a => `<option value="${a[1]}">${a[0]}</option>`).join('')}
                    </select>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button id="btn-jelzo" onclick="Navigacio.toggleJelzo()" style="
                        padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
                        border: 1px solid #bdc3c7;
                        background: var(--btn-off-bg, #e0e0e0);
                        color: var(--panel-text, #2c3e50);">
                        Jelzők: KI
                    </button>
                    <button id="btn-sotet" onclick="Navigacio.toggleSotetMod()" style="
                        padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
                        border: 1px solid #bdc3c7;
                        background: var(--btn-off-bg, #e0e0e0);
                        color: var(--panel-text, #2c3e50);">
                        Sötét mód
                    </button>
                    <button id="btn-reset" onclick="Navigacio.resetMinden()" style="
                        padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
                        border: 1px solid #bdc3c7;
                        background: #c0392b;
                        color: #ffffff;">
                        Reset
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);

        document.getElementById('station-select').addEventListener('change', (e) => {
            this.ugras(e.target.value);
        });

        // Szcenárió gombok késleltetve, megvárja a logika betöltését
        setTimeout(() => this._init_szcenario_gombok(), 800);
    },

    _init_szcenario_gombok: function() {
        if (!window.vasut_logika || !vasut_logika.get_szcenariok) return;

        const szcenariok = vasut_logika.get_szcenariok();
        if (!szcenariok || szcenariok.length === 0) return;

        const kontener = document.getElementById('szimulacio_kontener');
        if (!kontener) return;

        szcenariok.forEach(sc => {
            if (document.getElementById(`btn-sc-${sc.id}`)) return;

            const btn = document.createElement('button');
            btn.id = `btn-sc-${sc.id}`;
            btn.textContent = sc.nev;
            btn.style.cssText = `
                position: absolute;
                left: ${sc.gomb_x};
                top: ${sc.gomb_y};
                padding: 7px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                border: 1px solid #bdc3c7;
                background: var(--btn-off-bg, #e0e0e0);
                color: var(--panel-text, #2c3e50);
                z-index: 9999;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            `;
            btn.addEventListener('click', () => {
                Navigacio._szcenario_lepes(sc.id);
            });
            kontener.appendChild(btn);
        });
    },

    _szcenario_felirat_panel: function(sc) {
        const kontener = document.getElementById('szimulacio_kontener');
        if (!kontener) return null;

        const panelId = `felirat-sc-${sc.id}`;
        let panel = document.getElementById(panelId);

        if (!panel) {
            panel = document.createElement('div');
            panel.id = panelId;
            panel.style.cssText = `
                position: absolute;
                left: ${sc.felirat_x || sc.gomb_x};
                top: ${sc.felirat_y || sc.gomb_y};
                min-width: 260px;
                max-width: 420px;
                padding: 8px 10px;
                background: var(--panel-bg, rgba(255,255,255,0.95));
                color: var(--panel-text, #2c3e50);
                z-index: 9998;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 13px;
                line-height: 1.35;
                pointer-events: none;
            `;
            kontener.appendChild(panel);
            this.szcenarioFeliratElemek[sc.id] = panel;
        }

        return panel;
    },

    _frissit_szcenario_feliratok: function(sc, lepesszam) {
        const panel = this._szcenario_felirat_panel(sc);
        if (!panel) return;

        const sorok = sc.lepesek
            .slice(0, Math.min(lepesszam, 13))
            .map(lepes => lepes.felirat || `${lepes.kapcsolo}: ${lepes.allapot}`);

        panel.replaceChildren();
        sorok.forEach(sor => {
            const sorElem = document.createElement('div');
            sorElem.textContent = sor;
            panel.appendChild(sorElem);
        });
        panel.style.display = sorok.length > 0 ? 'block' : 'none';
    },

    _torol_szcenario_feliratok: function() {
        Object.values(this.szcenarioFeliratElemek).forEach(panel => {
            if (panel) {
                panel.innerHTML = '';
                panel.style.display = 'none';
            }
        });
    },

    _szcenario_lepes: function(szcenario_id) {
        if (!window.vasut_logika) return;
        const szcenariok = vasut_logika.get_szcenariok();
        const sc = szcenariok.find(s => s.id === szcenario_id);
        if (!sc) return;

        const lepesszam = vasut_logika.get_szcenario_lepesszam(szcenario_id);

        // Ha a szcenárió végére ért: reset és újrakezd
        if (lepesszam >= sc.lepesek.length) {
            Navigacio.resetMinden();
            return;
        }

        // Következő lépés végrehajtása
        vasut_logika.alkalmaz_szcenario(szcenario_id);

        // Gomb frissítése
        const btn = document.getElementById(`btn-sc-${szcenario_id}`);
        if (!btn) return;

        const uj_lepesszam = vasut_logika.get_szcenario_lepesszam(szcenario_id);
        Navigacio._frissit_szcenario_feliratok(sc, uj_lepesszam);

        if (uj_lepesszam >= sc.lepesek.length) {
            // Utolsó lépés megtörtént
            btn.style.background = '#27ae60';
            btn.style.color = '#ffffff';
            btn.textContent = `${sc.nev} ✓`;
        } else {
            // Folyamatban
            btn.style.background = '#e67e00';
            btn.style.color = '#ffffff';
        }
    },

    resetMinden: function() {
        if (!window.vasut_logika) return;
        vasut_logika.reset_kapcsolok();
        this._torol_szcenario_feliratok();

        // Szcenárió gombok visszaállítása
        if (vasut_logika.get_szcenariok) {
            vasut_logika.get_szcenariok().forEach(sc => {
                const btn = document.getElementById(`btn-sc-${sc.id}`);
                if (btn) {
                    btn.textContent = sc.nev;
                    btn.style.background = 'var(--btn-off-bg, #e0e0e0)';
                    btn.style.color = 'var(--panel-text, #2c3e50)';
                }
            });
        }

        // Jelző kikapcsolása ha be volt kapcsolva
        if (this.jelzoKijelzesAktiv) {
            this.toggleJelzo();
        }
    },

    toggleJelzo: function() {
        this.jelzoKijelzesAktiv = !this.jelzoKijelzesAktiv;
        const btn = document.getElementById('btn-jelzo');
        btn.textContent = this.jelzoKijelzesAktiv ? 'Jelzők: BE' : 'Jelzők: KI';
        btn.style.background = this.jelzoKijelzesAktiv
            ? 'var(--btn-on-bg, #27ae60)'
            : 'var(--btn-off-bg, #e0e0e0)';
        btn.style.color = this.jelzoKijelzesAktiv
            ? '#ffffff'
            : 'var(--panel-text, #2c3e50)';

        if (window.JelzoModul) {
            window.JelzoModul.setAktiv(this.jelzoKijelzesAktiv);
        }
    },

    toggleSotetMod: function() {
        this.sotetModAktiv = !this.sotetModAktiv;
        const btn = document.getElementById('btn-sotet');
        btn.textContent = this.sotetModAktiv ? 'Világos mód' : 'Sötét mód';
        btn.style.background = this.sotetModAktiv
            ? 'var(--btn-on-bg, #2c3e50)'
            : 'var(--btn-off-bg, #e0e0e0)';
        btn.style.color = this.sotetModAktiv
            ? '#ffffff'
            : 'var(--panel-text, #2c3e50)';

        document.body.classList.toggle('sotet-mod', this.sotetModAktiv);

        if (window.grafika_kezelo && typeof window.grafika_kezelo.frissit_szinek === 'function') {
            window.grafika_kezelo.frissit_szinek(this.sotetModAktiv);
        }
    },

    ugras: function(elementId) {
        if (!elementId) return;
        const keret = document.getElementById(elementId);
        if (keret) {
            keret.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            const eredetiOpacity = keret.style.opacity;
            const eredetiStroke = keret.style.stroke;
            keret.style.stroke = "#3498db";
            keret.style.strokeWidth = "5px";
            keret.style.opacity = "0.3";
            setTimeout(() => {
                keret.style.opacity = eredetiOpacity || "0";
                keret.style.stroke = eredetiStroke || "none";
            }, 800);
        } else {
            console.error("Hiba: Nem található a '" + elementId + "' azonosítójú keret.");
        }
    }
};

if (document.readyState === 'complete') {
    Navigacio.init();
} else {
    window.addEventListener('load', () => Navigacio.init());
}
