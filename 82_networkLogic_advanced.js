// ===========================================
// 82_networkLogic_advanced.js
// Fejlett topológiai logika + színezés
// - BFS a feeds pontoktól (csak zárt szakaszolókon át)
// - a topológia fájlból veszi a színeket (topology.szinek)
// - inaktív elemek fekete, aktívok a node.fazis/oldal vagy gyujtosin alapján
// - együttműködik a 82_switchControl.js-el (window.switchData export, események)
// ===========================================

(function () {
  // Globális konténerek (biztosítjuk, hogy elérhetők legyenek)
  window.topologyData = window.topologyData || {};
  window.wireColors = window.wireColors || {}; // alap-színek node alapján
  window.szinTabla = window.szinTabla || {};
  let topologyLoaded = false;

  // -------------------------
  // Betölti a topológiát, és létrehozza az alap szín-mappát (wireColors)
  // -------------------------
  async function loadTopology() {
    try {
      const resp = await fetch("82_topologia.json");
      const topo = await resp.json();
      window.topologyData = topo || {};
      window.szinTabla = (topo && topo.szinek) || {};
      // alap színek node-okhoz
      window.wireColors = window.wireColors || {};
      Object.values(window.topologyData.stations || {}).forEach(station => {
        Object.entries(station.nodes || {}).forEach(([nodeId, node]) => {
          if (node && node.fazis && node.oldal) {
            const key = `${node.fazis}_${node.oldal}`;
            if (window.szinTabla[key]) window.wireColors[nodeId] = window.szinTabla[key];
          } else if (node && node.type === "gyujtosin") {
            window.wireColors[nodeId] = window.szinTabla.gyujtosin || window.wireColors[nodeId] || "#CC9900";
          }
        });
      });

      topologyLoaded = true;
      console.log("✅ topology betöltve, alap színek kész.");
    } catch (e) {
      console.error("❌ topology betöltési hiba:", e);
      topologyLoaded = false;
    }
  }

  // -------------------------
  // Segédfüggvények: keresések a topology-ban (globális, inter-station ok)
  // -------------------------
  function findNode(nodeId) {
    if (!window.topologyData.stations) return null;
    for (const [stationName, station] of Object.entries(window.topologyData.stations)) {
      if (station.nodes && station.nodes[nodeId]) return { stationName, node: station.nodes[nodeId] };
    }
    return null;
  }

  function findSwitchDefinition(switchId) {
    if (!window.topologyData.stations) return null;
    for (const station of Object.values(window.topologyData.stations)) {
      if (station.switches && station.switches[switchId]) return station.switches[switchId];
    }
    return null;
  }

  function getSwitchState(switchId) {
    // 1) window.switchData (82_switchControl export)
    if (window.switchData && window.switchData[switchId] && window.switchData[switchId].state) {
      return window.switchData[switchId].state;
    }
    // 2) topology fallback
    const def = findSwitchDefinition(switchId);
    if (def && def.state) return def.state;
    // 3) alapértelmezett: closed (biztonsági okból)
    return "closed";
  }

  function switchAllows(switchId) {
    return getSwitchState(switchId) === "closed";
  }

  function getNodeConnects(nodeId) {
    const found = findNode(nodeId);
    if (!found) return [];
    const conn = found.node.connects;
    return Array.isArray(conn) ? conn.slice() : [];
  }

  // -------------------------
  // BFS bejárás feed-ektől: visszaad egy Set-et az aktív (feszültség alatti) id-kkel (w_ és s_)
  // -------------------------
  function computeActiveSet() {
    const active = new Set();
    if (!topologyLoaded) {
      console.warn("computeActiveSet: topology nincs betöltve.");
      return active;
    }
    const feeds = window.topologyData.feeds;
    if (!feeds || typeof feeds !== "object") {
      console.warn("computeActiveSet: nincs feeds definíció a topológiában.");
      return active;
    }

    const visitedNodes = new Set();
    const visitedSwitches = new Set();
    const q = [];

    // Helper: push node if not visited
    function pushNode(nodeId) {
      if (!nodeId || visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);
      active.add(nodeId);
      q.push(nodeId);
    }

    // Indulás: minden feed node
    Object.values(feeds).forEach(feed => {
      if (feed && feed.node) {
        pushNode(feed.node);
      }
    });

    while (q.length) {
      const curNode = q.shift();
      const connects = getNodeConnects(curNode); // switch id-k
      for (const swId of connects) {
        if (!swId) continue;
        // ha már feldolgoztuk a switchet, kihagyjuk
        if (visitedSwitches.has(swId)) continue;
        // csak zárt switcheken keresztül megy az energia
        if (!switchAllows(swId)) continue;

        // switch aktív
        visitedSwitches.add(swId);
        active.add(swId);

        // keressük a switch definíciót, és a másik csomópontot
        const swDef = findSwitchDefinition(swId);
        if (!swDef) continue;

        const from = swDef.from;
        const to = swDef.to;
        // előfordulhat, hogy a from/to nem node-id-k — csak kezeljük ha vannak
        let other = null;
        if (from === curNode) other = to;
        else if (to === curNode) other = from;
        else {
          // ha switch.from/to nem egyezik semelyik oldallal (rossz adatszerkezet), próbáljuk megtalálni a kapcsolódó node-ot:
          // nézzük a kapcsolódó node-ok connects-ét — ha swId szerepel bennük, vegyük őket
          for (const station of Object.values(window.topologyData.stations || {})) {
            for (const [nodeId, nodeObj] of Object.entries(station.nodes || {})) {
              if (Array.isArray(nodeObj.connects) && nodeObj.connects.includes(swId)) {
                if (nodeId !== curNode) { other = nodeId; break; }
              }
            }
            if (other) break;
          }
        }

        if (other && !visitedNodes.has(other)) {
          visitedNodes.add(other);
          active.add(other);
          q.push(other);
        }
      }
    }

    return active;
  }

  // -------------------------
  // Színezés: minden definiált node és switch alapból fekete, majd aktív elemek színezése
  // -------------------------
  function setStrokeImportant(elem, color) {
    if (!elem) return;
    try {
      elem.style.setProperty("stroke", color, "important");
      elem.style.setProperty("fill", "none", "important");
    } catch (e) {
      // fallback
      elem.style.stroke = color;
      elem.style.fill = "none";
    }
  }

  function resolveNodeColor(nodeId) {
    // Ha wireColors-ban van előre definiált szín, azt használjuk
    if (window.wireColors && window.wireColors[nodeId]) return window.wireColors[nodeId];

    const found = findNode(nodeId);
    if (!found) return "#00FF00"; // fallback aktív zöld

    const node = found.node;
    if (node.type === "gyujtosin") return window.szinTabla.gyujtosin || "#CC9900";

    if (node.fazis && node.oldal) {
      const key = `${node.fazis}_${node.oldal}`;
      if (window.szinTabla[key]) return window.szinTabla[key];
    }

    // ha nincs konkrét oldal, próbáljuk a fazist jobb-oldallal
    if (node.fazis) {
      const fallbackKey = `${node.fazis}_jobb`;
      if (window.szinTabla[fallbackKey]) return window.szinTabla[fallbackKey];
    }

    return "#00FF00"; // végső fallback
  }

  function applyColors() {
    if (!topologyLoaded) {
      console.warn("applyColors: topology nincs inicializálva.");
      return;
    }

    // 1) Minden topológiában definiált w_ és s_ DOM elem fekete
    let counted = 0;
    for (const station of Object.values(window.topologyData.stations || {})) {
      for (const nodeId of Object.keys(station.nodes || {})) {
        const el = document.getElementById(nodeId);
        if (el) {
          setStrokeImportant(el, "#000000");
          counted++;
        }
      }
      for (const swId of Object.keys(station.switches || {})) {
        const el = document.getElementById(swId);
        if (el) setStrokeImportant(el, "#000000");
      }
    }

    // 2) számoljuk az aktív halmazt
    const active = computeActiveSet();
    // console.debug("Aktív elemek:", Array.from(active));

    // 3) aktív elemek kiszínezése
    for (const id of active) {
      const el = document.getElementById(id);
      if (!el) continue;

      if (id.startsWith("s_")) {
        // switch: adjunk neki a szomszédos node-ok alapján színt (ha van)
        const swDef = findSwitchDefinition(id);
        let color = "#00FF00";
        if (swDef) {
          const fromColor = resolveNodeColor(swDef.from);
          const toColor = resolveNodeColor(swDef.to);
          // ha from és to különböző, preferáljuk a from oldal színét (általában a tápláló oldal),
          // de ha nincs fromColor, használjuk toColor
          color = fromColor || toColor || color;
        }
        setStrokeImportant(el, color);
        continue;
      }

      // w_ node
      const color = resolveNodeColor(id);
      setStrokeImportant(el, color);

      // Ha az elem egy <g> csoport, akkor biztos, hogy a benne lévő child elemek is színezve legyenek
      try {
        if (el.tagName.toLowerCase() === "g") {
          el.querySelectorAll("*").forEach(child => {
            setStrokeImportant(child, color);
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // 4) Feed csoportok biztosan az ő, statikus színüket kapják (feed definíciók override)
    if (window.topologyData.feeds) {
      Object.values(window.topologyData.feeds).forEach(feed => {
        if (!feed || !feed.node) return;
        const feedGroup = feed.group || feed.node;
        const phase = feed.phase;
        const oldal = feed.oldal || "jobb";
        let color = null;
        if (phase && oldal && window.szinTabla[`${phase}_${oldal}`]) color = window.szinTabla[`${phase}_${oldal}`];
        else if (phase && window.szinTabla[`${phase}_jobb`]) color = window.szinTabla[`${phase}_jobb`];
        else color = window.szinTabla.gyujtosin || "#FFFF00";

        const groupElem = document.getElementById(feedGroup);
        if (groupElem) {
          groupElem.querySelectorAll("*").forEach(child => setStrokeImportant(child, color));
        }
        const nodeElem = document.getElementById(feed.node);
        if (nodeElem) setStrokeImportant(nodeElem, color);
      });
    }
  }

  // -------------------------
  // Refresh API (külső hívásra)
  // -------------------------
  function refreshNetwork() {
    if (!topologyLoaded) {
      console.warn("refreshNetwork: várakozás topology loaderre...");
      return;
    }
    try {
      applyColors();
    } catch (e) {
      console.error("refreshNetwork hiba:", e);
    }
  }

  // Exponáljuk a hívást globálisan is (kézi teszteléshez)
  window.refreshNetwork = refreshNetwork;

  // -------------------------
  // Esemény-kezelés: ha a szakaszolók változnak, frissítünk
  // - 82_switchControl.js által lehet dispatch-olva 'switchToggled' custom event
  // - vagy window.onSwitchStateChange hívás is használható
  // -------------------------
  document.addEventListener("switchToggled", (e) => {
    // ha e.detail van, használjuk; mindig egy kis késleltetés, hogy a switchControl befejezze a DOM-transzformációt
    setTimeout(() => refreshNetwork(), 20);
  });

  // Ha switchControl meghívja ezt a függvényt, akkor is refresh-eljük
  window.onSwitchStateChange = function (switchId, newState) {
    // update window.switchData ha szükséges (nem kötelező, de segít)
    if (window.switchData && window.switchData[switchId]) window.switchData[switchId].state = newState;
    setTimeout(() => refreshNetwork(), 20);
  };

  // -------------------------
  // Indítás: várjuk, hogy a DOM és az SVG betöltődjön, illetve a topology fájl beolvasódjon
  // -------------------------
  window.addEventListener("DOMContentLoaded", async () => {
    await loadTopology();
    // rövid késleltetés, hogy SVG elemek is legyenek a DOM-ban
    setTimeout(() => {
      refreshNetwork();
      console.log("🔁 82_networkLogic_advanced inicializálva.");
    }, 200);
  });

  // Ha a file közvetlenül betöltődik (pl. már későn hívják), lehívjuk a load-ot
  (async function tryInitNow() {
    if (!topologyLoaded) {
      await loadTopology();
    }
  })();

})();
