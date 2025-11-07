// 82_voltageFlow.js – TELJES, MŰKÖDŐ, BŐVÍTHETŐ
// VAGY logika, kétirányú, soros, 9 állomás = 0 kódmódosítás

let voltageMap = new Map(); // w_... → value (0,1,2,3...)
let graph = new Map();      // w_... → Set(w_...)

// 1. GRÁF ÉPÍTÉSE – KÉTIRÁNYÚ, VAGY LOGIKA
function buildGraph() {
  graph.clear();
  const stations = window.topologyData?.stations || {};

  Object.values(stations).forEach(station => {
    Object.entries(station.switches || {}).forEach(([swId, sw]) => {
      if (window.switchData[swId]?.state === "closed") {
        const from = sw.from;
        const to = sw.to;
        if (from && to) {
          if (!graph.has(from)) graph.set(from, new Set());
          if (!graph.has(to)) graph.set(to, new Set());
          graph.get(from).add(to);
          graph.get(to).add(from); // KÉTIRÁNYÚ
        }
      }
    });
  });
}

// 2. FEED-EK LISTÁJA
function getFeedNodes() {
  const feeds = window.topologyData?.feeds || {};
  return [
    { node: feeds.Alallomas_HTK?.node || "w_Alallomas_HTK_gys", value: 1 },
    { node: feeds.Alallomas_Hatvan?.node || "w_Hn_gys", value: 2 },
    { node: feeds.JBH_feed?.node || null, value: 3 }
  ].filter(f => f.node);
}

// 3. FESZÜLTSÉGTERJEDÉS
function simulateVoltageFlow() {
  voltageMap.clear();
  const visited = new Set();
  const feeds = getFeedNodes();

  feeds.forEach(feed => {
    if (!visited.has(feed.node)) {
      bfs(feed.node, feed.value, visited);
    }
  });
}

function bfs(startNode, value, visited) {
  const queue = [startNode];
  visited.add(startNode);
  voltageMap.set(startNode, value);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        voltageMap.set(neighbor, value);
        queue.push(neighbor);
      }
    }
  }
}

// 4. CSOPORT SZÍNEZÉSE
function updateColors() {
  const szinek = window.topologyData?.szinek || {};
  const defaultColor = "#000000";

  document.querySelectorAll('g[id^="w_"], g[id^="s_"]').forEach(group => {
    const groupId = group.id;
    const value = voltageMap.get(groupId) || 0;
    let color = defaultColor;

    if (value > 0) {
      const node = findNodeById(groupId);
      if (node?.fazis && node?.oldal) {
        color = szinek[`${node.fazis}_${node.oldal}`] || defaultColor;
      } else if (node?.type === "gyujtosin") {
        color = szinek.gyujtosin || defaultColor;
      }
    }

    group.querySelectorAll('*').forEach(el => {
      el.style.stroke = color;
      el.style.fill = "none";
    });
  });
}

function findNodeById(nodeId) {
  const stations = window.topologyData?.stations || {};
  for (const station of Object.values(stations)) {
    if (station.nodes?.[nodeId]) return station.nodes[nodeId];
  }
  return null;
}

// 5. TELJES FRISSÍTÉS
function refreshVoltage() {
  buildGraph();
  simulateVoltageFlow();
  updateColors();
  console.log(`Feszültség frissítve: ${voltageMap.size} node`);
}

// 6. INDÍTÁS ÉS HOOK
document.addEventListener("DOMContentLoaded", () => {
  const wait = setInterval(() => {
    if (window.switchData && window.topologyData) {
      clearInterval(wait);
      refreshVoltage();
      window.triggerVoltageUpdate = refreshVoltage;
    }
  }, 100);
});