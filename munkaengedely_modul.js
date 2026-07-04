const MunkaengedelyModul = {
    adatok: {},
    aktivLayer: null,
    overlay: null,
    tartalom: null,
    btn: null,

    init: async function(jsonPath) {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`HTTP hiba! Statusz: ${response.status}`);
            this.adatok = await response.json();
            this._letrehozFelulet();
            this.frissitAktivLayer(window.JelzoModul ? window.JelzoModul.getAktivLayer() : null);
        } catch (h) {
            console.error("MUNKAENGEDELY MODUL: Hiba a JSON betoltesekor!", h);
        }
    },

    regisztralGomb: function(btn) {
        this.btn = btn;
        this.btn.addEventListener('click', () => this.megnyit());
        this._frissitGomb();
    },

    frissitAktivLayer: function(layer) {
        this.aktivLayer = layer;
        this._frissitGomb();
    },

    megnyit: function() {
        const engedely = this.aktivLayer ? this.adatok[this.aktivLayer] : null;
        if (!engedely || !this.overlay || !this.tartalom) return;

        this._kitolt(engedely);
        this.overlay.hidden = false;
        document.body.classList.add('munkaengedely-nyitva');
    },

    bezar: function() {
        if (this.overlay) {
            this.overlay.hidden = true;
        }
        document.body.classList.remove('munkaengedely-nyitva');
    },

    _letrehozFelulet: function() {
        if (document.getElementById('munkaengedely-overlay')) {
            this.overlay = document.getElementById('munkaengedely-overlay');
            this.tartalom = document.getElementById('munkaengedely-tartalom');
            return;
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'munkaengedely-overlay';
        this.overlay.className = 'munkaengedely-overlay';
        this.overlay.hidden = true;

        const lap = document.createElement('section');
        lap.className = 'munkaengedely-lap';
        lap.setAttribute('aria-label', 'Munkaengedély segédlet');

        const fejlec = document.createElement('div');
        fejlec.className = 'munkaengedely-fejlec';

        const cim = document.createElement('h1');
        cim.textContent = 'Munkaengedély segédlet';

        const bezarBtn = document.createElement('button');
        bezarBtn.id = 'munkaengedely-bezar';
        bezarBtn.className = 'munkaengedely-bezar';
        bezarBtn.type = 'button';
        bezarBtn.textContent = 'Bezárás';
        bezarBtn.addEventListener('click', () => this.bezar());

        fejlec.append(cim, bezarBtn);

        this.tartalom = document.createElement('div');
        this.tartalom.id = 'munkaengedely-tartalom';
        this.tartalom.className = 'munkaengedely-tartalom';

        lap.append(fejlec, this.tartalom);
        this.overlay.appendChild(lap);
        document.body.appendChild(this.overlay);
    },

    _kitolt: function(engedely) {
        this.tartalom.replaceChildren();

        this._blokk('Munkavégzés helye', engedely.munkavegzes_helye);
        this._blokk('Kikapcsolt rész', engedely.kikapcsolt_resz);
        this._blokk('Földelési pontok', engedely.foldelesi_pontok);
        this._blokk('Legközelebbi feszültség alatt álló pontok', engedely.legkozelebbi_feszultseg_alatt);
    },

    _blokk: function(cim, ertek) {
        const blokk = document.createElement('section');
        blokk.className = 'munkaengedely-blokk';

        const h2 = document.createElement('h2');
        h2.textContent = cim;
        blokk.appendChild(h2);

        const lista = Array.isArray(ertek) ? ertek : [ertek || ''];
        lista.forEach(sor => {
            const p = document.createElement('p');
            p.textContent = sor;
            blokk.appendChild(p);
        });

        this.tartalom.appendChild(blokk);
    },

    _frissitGomb: function() {
        if (!this.btn) return;

        const vanEngedely = Boolean(this.aktivLayer && this.adatok[this.aktivLayer]);
        this.btn.classList.toggle('munkaengedely-elerheto', vanEngedely);
        this.btn.setAttribute('aria-disabled', vanEngedely ? 'false' : 'true');
    }
};

window.MunkaengedelyModul = MunkaengedelyModul;
