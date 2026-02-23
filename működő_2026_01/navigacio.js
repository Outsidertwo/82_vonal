/**
 * navigacio.js - Állomáskeret alapú navigáció
 */

const Navigacio = {
    // Ide gyűjtheted a kereteket: [Megjelenített név, SVG keret ID]
    allomasok:  [
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

    init: function() {
        // Ellenőrizzük, hogy ne készüljön el kétszer
        if (document.getElementById('station-picker')) return;

        const menuHTML = `
            <div id="station-picker" style="position: fixed; top: 15px; left: 15px; 
                 background: rgba(255, 255, 255, 0.95); padding: 12px; border: 2px solid #2c3e50; 
                 z-index: 9999; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                 font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <label for="station-select" style="display: block; font-weight: bold; margin-bottom: 8px; color: #2c3e50;">Állomásválasztó:</label>
                <select id="station-select" style="width: 180px; padding: 8px; border-radius: 4px; border: 1px solid #bdc3c7; cursor: pointer; font-size: 14px;">
                    <option value="">-- Válassz állomást --</option>
                    ${this.allomasok.map(a => `<option value="${a[1]}">${a[0]}</option>`).join('')}
                </select>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);

        document.getElementById('station-select').addEventListener('change', (e) => {
            this.ugras(e.target.value);
        });
    },

    ugras: function(elementId) {
        if (!elementId) return;

        const keret = document.getElementById(elementId);
        if (keret) {
            // A keret (téglalap) középre rendezése a képernyőn
            keret.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });

            // Opcionális: Egy pillanatra megmutatjuk a keretet (vizuális visszajelzés)
            // Ha teljesen láthatatlanra akarod, ezt a részt törölheted:
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
            console.error("Hiba: Nem található a '" + elementId + "' azonosítójú keret az SVG-ben.");
        }
    }
};

// Automatikus indítás az oldal betöltésekor
if (document.readyState === 'complete') {
    Navigacio.init();
} else {
    window.addEventListener('load', () => Navigacio.init());
}