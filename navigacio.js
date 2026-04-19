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
                        Jelzok: KI
                    </button>
                    <button id="btn-sotet" onclick="Navigacio.toggleSotetMod()" style="
                        padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
                        border: 1px solid #bdc3c7;
                        background: var(--btn-off-bg, #e0e0e0);
                        color: var(--panel-text, #2c3e50);">
                        Sotet mod: KI
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);

        document.getElementById('station-select').addEventListener('change', (e) => {
            this.ugras(e.target.value);
        });
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