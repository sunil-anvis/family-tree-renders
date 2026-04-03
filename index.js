// --- 1. Data & Global Setup ---
let familyData;
let rawFamilyData; // Store raw flat data for Graph Views (Fan)

// Initialize App

// Helper to get "Me" from raw API data
function getMeFromRaw() {
  const list = rawFamilyData?.data || rawFamilyData;
  if (!Array.isArray(list)) return null;
  return list.find((p) => p.relation === "Myself" || p.relation === "Me");
}

function initApp() {
  // Determine initial view based on active button in HTML
  const activeBtn = document.querySelector(".view-btn.active");
  if (activeBtn) {
    currentView = activeBtn.dataset.view;
  }

  // Initial Render
  switchView(currentView);
}

// Global Dimensions
let width = window.innerWidth;
let height = window.innerHeight;

// Globe State
let globeData = {};
let projection,
  path,
  globeGroup,
  landGroup,
  stateGroup,
  riverGroup,
  cityGroup,
  linkGroup,
  nodeGroup,
  dragBehavior,
  zoomBehavior;

// Main SVG Container
const svg = d3
  .select("#tree-container")
  .html("")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style(
    "background",
    "radial-gradient(circle at center, #02111b 0%, #000000 100%)",
  );

// Modal Setup
const modal = d3
  .select("body")
  .append("div")
  .attr("class", "modal-overlay")
  .style("opacity", 0)
  .style("pointer-events", "none");

const modalContent = modal.append("div").attr("class", "modal-content");
const modalClose = modalContent
  .append("button")
  .attr("class", "modal-close")
  .html("&times;");
const modalBody = modalContent.append("div").attr("class", "modal-body");

modalClose.on("click", () => {
  modal
    .transition()
    .duration(200)
    .style("opacity", 0)
    .on("end", () => modal.style("pointer-events", "none"));
});

modal.on("click", (e) => {
  if (e.target.className === "modal-overlay") {
    modal
      .transition()
      .duration(200)
      .style("opacity", 0)
      .on("end", () => modal.style("pointer-events", "none"));
  }
});

function showModal(d) {
  const isVerticalView = currentView === "vertical-tree";

  modalBody.html(`
    <div class="modal-profile">
        <img src="${d.data.photo}" alt="${d.data.name}" class="modal-image">
        
        <div class="modal-content-wrapper">
            <h2 class="modal-name">${d.data.name}</h2>
            <p class="modal-info">
                ${d.data.relation} <span style="color:var(--neon-cyan)">•</span> 
                ${d.data.size ? "Family Size: " + d.data.size : d.data.age ? d.data.age + " years" : "Age N/A"} 
                <span style="color:var(--neon-cyan)">•</span> ${d.data.gender === "m" ? "Male" : d.data.gender === "f" ? "Female" : "N/A"}
            </p>
            
            <p class="modal-location">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                ${d.data.location || "Location Unknown"}
            </p>

            ${
              isVerticalView
                ? `
                <div class="modal-actions" style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="trace-btn" id="trace-path-btn" style="flex:1;">Trace Path from Me</button>
                </div>
            `
                : ""
            }
        </div>
    </div>
`);
  modal
    .style("pointer-events", "all")
    .transition()
    .duration(200)
    .style("opacity", 1);

  // Trace Button Handler (only in vertical view)
  if (isVerticalView) {
    const traceBtn = document.getElementById("trace-path-btn");
    if (traceBtn) {
      traceBtn.addEventListener("click", () => {
        console.log("Trace button clicked!");
        console.log("currentTreeRoot:", currentTreeRoot);
        console.log("Target node data:", d.data);

        if (!currentTreeRoot) {
          console.error("currentTreeRoot is not set!");
          return;
        }

        // 1. Clear previous trace
        d3.selectAll(".trace-active").classed("trace-active", false);

        // 2. Find "Me" node
        const meNode = currentTreeRoot.descendants().find((n) => n.data.isMe);
        console.log("Me node:", meNode);

        // 3. Find path to current node (d)
        const targetNode = currentTreeRoot
          .descendants()
          .find((n) => n.data.id === d.data.id);
        console.log("Target node:", targetNode);

        if (!meNode) {
          console.error("Could not find 'Me' node in tree!");
          alert("Could not find 'Myself' in this tree view to trace from.");
          return;
        }

        if (!targetNode) {
          console.error("Could not find target node in tree!");
          return;
        }

        if (meNode === targetNode) {
          console.log("Target is 'Me' - no path to trace");
          return;
        }

        // Calculate Path (Ancestry path in the *visual* tree)
        const pathNodes = meNode.path(targetNode);
        console.log(
          "Path nodes:",
          pathNodes.map((n) => n.data.name),
        );

        // Highlight Nodes
        const nodeIds = new Set(pathNodes.map((n) => n.data.id));
        d3.selectAll(".tree-node")
          .filter((n) => nodeIds.has(n.data.id))
          .classed("trace-active", true);

        // Highlight Links
        const linkPairs = new Set();
        for (let i = 0; i < pathNodes.length - 1; i++) {
          const a = pathNodes[i];
          const b = pathNodes[i + 1];
          linkPairs.add(`${a.data.id}-${b.data.id}`);
          linkPairs.add(`${b.data.id}-${a.data.id}`);
        }

        console.log("Link pairs:", Array.from(linkPairs));

        // Close modal first
        modal
          .transition()
          .duration(200)
          .style("opacity", 0)
          .on("end", () => modal.style("pointer-events", "none"));

        // Animate the trace sequentially
        // Highlight nodes one by one with delay
        pathNodes.forEach((node, index) => {
          setTimeout(() => {
            d3.selectAll(".tree-node")
              .filter((n) => n.data.id === node.data.id)
              .classed("trace-active", true)
              .select("circle")
              .transition()
              .duration(300)
              .attr("r", 25) // Pulse effect
              .transition()
              .duration(300)
              .attr("r", 21);
          }, index * 400); // 400ms delay between each node
        });

        // Animate links one by one
        for (let i = 0; i < pathNodes.length - 1; i++) {
          const a = pathNodes[i];
          const b = pathNodes[i + 1];
          const linkKey = `${a.data.id}-${b.data.id}`;

          setTimeout(
            () => {
              d3.selectAll(".tree-link[data-link-type='main-tree']")
                .filter(function (l) {
                  return linkPairs.has(
                    `${l.source.data.id}-${l.target.data.id}`,
                  );
                })
                .filter(function (l) {
                  return (
                    `${l.source.data.id}-${l.target.data.id}` === linkKey ||
                    `${l.target.data.id}-${l.source.data.id}` === linkKey
                  );
                })
                .classed("trace-active", true)
                .transition()
                .duration(400)
                .attr("stroke-width", 6)
                .transition()
                .duration(200)
                .attr("stroke-width", 4);
            },
            i * 400 + 200,
          ); // Start after the source node, offset by 200ms
        }
      });
    }
  }
}

// Global variable to store current hierarchy root for tracing
let currentTreeRoot = null;

// State

let currentView = "vertical-tree"; // 'tree' or 'vertical-tree'
let ancestorMode = false;
let fanHistory = []; // Stack for Fan View navigation history
let currentFanRootId = null; // Track current root ID for Fan View

// --- 3. Tree Logic ---
function initTree() {
  svg.selectAll("*").remove(); // Clear SVG
  svg.on(".drag", null); // Clear drag
  svg.on(".zoom", null); // Clear zoom

  // 2. Set Background for Tree View (Multicolor Gradient)
  svg.style("background", "linear-gradient(45deg, #1a2980 0%, #26d0ce 100%)");

  const cardWidth = 180;
  const cardHeight = 60;

  // Tree Layout
  // Create a group for the tree to support Zoom/Pan
  const g = svg.append("g").attr("transform", `translate(${width / 2}, 50)`);

  // --- SVG DEFINITIONS (Gradients/Filters) ---
  const defs = svg.append("defs");

  // Card Gradient (Neon Dark)
  const cardGradient = defs
    .append("linearGradient")
    .attr("id", "card-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  cardGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#1a1a2e"); // Dark Blue

  cardGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#16213e"); // Slightly lighter

  // Glow Filter
  const filter = defs
    .append("filter")
    .attr("id", "neon-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  filter
    .append("feGaussianBlur")
    .attr("stdDeviation", "2.5")
    .attr("result", "coloredBlur");

  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const root = d3.hierarchy(familyData);

  // Increase size for cards
  // Adjust node size to account for potential spouses (Double Width)
  const treeLayout = d3
    .tree()
    .nodeSize([cardWidth * 2 + 50, cardHeight + 40]) // Width (increased), Height spacing
    .separation((a, b) => (a.parent == b.parent ? 1.1 : 1.25));

  treeLayout(root);

  // Links
  g.selectAll(".tree-link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "tree-link")
    .attr("d", (d) => {
      let s = { x: d.source.x, y: d.source.y + cardHeight / 2 };
      let t = { x: d.target.x, y: d.target.y - cardHeight / 2 };

      // --- Source Handling ---
      if (d.source.data.spouse) {
        // Square Bracket Style (Top-Down)
        // Father (Left) + Mother (Right) -> Horizontal Bar -> Vertical Down

        const fatherX = s.x;
        const motherX = s.x + (cardWidth + 20); // Spouse offset

        // Horizontal Bar Y Position (Below cards)
        const bracketY = s.y + 20;

        // 1. Vertical Connectors from Parents to Horizontal Bar
        const fatherLine = `M ${fatherX},${s.y} L ${fatherX},${bracketY} `;
        const motherLine = `M ${motherX},${s.y} L ${motherX},${bracketY} `;

        // 2. Horizontal Bracket Line
        const horizontalLine = `M ${fatherX},${bracketY} L ${motherX},${bracketY} `;

        // 3. Child Connector (From Bracket Midpoint Down)
        const bracketMidX = (fatherX + motherX) / 2;

        // Target is usually single node (center)
        // If Target has spouse, we need target bracket logic
        let targetX = t.x;
        if (d.target.data.spouse) {
          // If target is a couple, point to center of couple
          targetX = t.x + (cardWidth + 20) / 2;
        }

        const midY = (bracketY + t.y) / 2;

        // Path: MidBracket -> MidPoint -> Target
        // Simple Orthogonal: V midY H t.x V t.y
        const mainPath = `M ${bracketMidX},${bracketY} V ${midY} H ${targetX} V ${t.y} `;

        // Check if Target needs Bracket (Child -> Parents)
        if (d.target.data.spouse) {
          // Target Bracket Logic (Join Upwards)
          const tFatherX = t.x;
          const tMotherX = t.x + (cardWidth + 20);
          const tBracketY = t.y - 20;

          // Lines from Bracket to Target Parents
          const tFatherLine = `M ${tFatherX},${tBracketY} L ${tFatherX},${t.y} `;
          const tMotherLine = `M ${tMotherX},${tBracketY} L ${tMotherX},${t.y} `;
          const tHorizLine = `M ${tFatherX},${tBracketY} L ${tMotherX},${tBracketY} `;

          // Connect Main Path to Target Bracket Center
          const tBracketMidX = (tFatherX + tMotherX) / 2;

          // Recalculate Main Path to hit tBracketMidX/tBracketY
          const fixedMainPath = `M ${bracketMidX},${bracketY} V ${midY} H ${tBracketMidX} V ${tBracketY} `;

          return (
            fatherLine +
            motherLine +
            horizontalLine +
            fixedMainPath +
            tFatherLine +
            tMotherLine +
            tHorizLine
          );
        }

        return fatherLine + motherLine + horizontalLine + mainPath;
      }

      // Single Source
      else {
        // If Target has spouse, point to center of couple
        let targetX = t.x;
        let targetY = t.y;

        if (d.target.data.spouse) {
          // Target Bracket Logic (Join Upwards)
          const tFatherX = t.x;
          const tMotherX = t.x + (cardWidth + 20);
          const tBracketY = t.y - 20;

          const tFatherLine = `M ${tFatherX},${tBracketY} L ${tFatherX},${t.y} `;
          const tMotherLine = `M ${tMotherX},${tBracketY} L ${tMotherX},${t.y} `;
          const tHorizLine = `M ${tFatherX},${tBracketY} L ${tMotherX},${tBracketY} `;

          const tBracketMidX = (tFatherX + tMotherX) / 2;

          const midY = (s.y + tBracketY) / 2;
          const mainPath = `M ${s.x},${s.y} V ${midY} H ${tBracketMidX} V ${tBracketY} `;

          return mainPath + tFatherLine + tMotherLine + tHorizLine;
        }

        const midY = (s.y + t.y) / 2;
        return `M ${s.x},${s.y} V ${midY} H ${t.x} V ${t.y} `;
      }
    })
    .attr("fill", "none")
    .attr("stroke", "#4ecca3")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.6);

  // Nodes (Cards)
  const nodes = g
    .selectAll(".tree-node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "tree-node")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      showModal(d);
    });

  // Render Card (Reusable function?)
  const renderCard = (selection, data, isSpouse = false) => {
    const truncate = (str, n) =>
      str && str.length > n ? str.slice(0, n - 3) + "..." : str;
    const xOffset = isSpouse ? cardWidth + 20 : 0;

    const grp = selection
      .append("g")
      .attr("transform", `translate(${xOffset}, 0)`);

    // Card Background
    if (familyData.node_style !== "circle") {
      grp
        .append("rect")
        .attr("x", -cardWidth / 2)
        .attr("y", -cardHeight / 2)
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 10)
        .attr("class", "tree-card-bg");
    }

    // Clip Path
    const clipId = `clip-${data.id}`;
    grp
      .append("clipPath")
      .attr("id", clipId)
      .append("circle")
      .attr("r", 20)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0);

    // Image
    grp
      .append("image")
      .attr("xlink:href", data.photo)
      .attr("x", -cardWidth / 2 + 10)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("crossorigin", "anonymous")
      .attr("clip-path", `url(#${clipId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");

    // Ring
    grp
      .append("circle")
      .attr("r", 21)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0)
      .attr("fill", "none")
      .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
      .attr("stroke-width", data.isMe ? 4 : 1.5);
    // Text Group
    const textGroup = grp
      .append("g")
      .attr("transform", `translate(${-cardWidth / 2 + 60}, 0)`);

    textGroup
      .append("text")
      .attr("class", "tree-card-name")
      .attr("y", -2)
      .text(truncate(data.name, 15))
      .append("title") // Tooltip
      .text(data.name);

    textGroup
      .append("text")
      .attr("class", "tree-card-relation")
      .attr("y", 12)
      .text(truncate(data.relation || "", 20))
      .append("title") // Tooltip for relation
      .text(data.relation || "");

    // If it's a spouse, maybe link graphically with a line?
    // (handled by placement)
  };

  nodes.each(function (d) {
    const el = d3.select(this);
    // Render Main Node
    renderCard(el, d.data, false);

    // Render Spouse if exists
    if (d.data.spouse) {
      // Spouse exists: Render Spouse Card
      // Connector line removed (handled by bracket links or proximity)
      renderCard(el, d.data.spouse, true);
    }
  });

  // Zoom for Tree
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  // Center the tree initially
  const initialTransform = d3.zoomIdentity.translate(width / 2, 50).scale(1);
  svg.call(zoom).call(zoom.transform, initialTransform);
}

// --- 4. Fan Chart Logic ---
function initFan(startNodeId = null) {
  svg.selectAll("*").remove();
  svg.on(".drag", null);
  svg.on(".zoom", null);

  // 3. Set Background for Fan View based on Theme
  const bgColor = (typeof window.isDarkMode !== "undefined" && !window.isDarkMode) ? "white" : "black";
  svg.style("background", bgColor);

  const radius = Math.min(width, height) * 0.65;

  // Helper: Text Wrapping Function
  function wrap(text, width) {
    text.each(function () {
      var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy") || 0),
        tspan = text
          .text(null)
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", dy + "em");
      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }

  // --- 2. Build Graph (Adjacency List) ---
  const allNodesMap = new Map();
  const adj = new Map();

  const addEdge = (id1, id2) => {
    if (!adj.has(id1)) adj.set(id1, []);
    if (!adj.has(id2)) adj.set(id2, []);
    // Avoid duplicates
    if (!adj.get(id1).includes(id2)) adj.get(id1).push(id2);
    if (!adj.get(id2).includes(id1)) adj.get(id2).push(id1);
  };

  // Traverse Family Data to build Graph
  // Use rawFamilyData if available (Full Graph), else fallback to hierarchy (Tree only)

  if (rawFamilyData) {
    // Build Graph from Flat List (Robust)
    const flatList = Array.isArray(rawFamilyData)
      ? rawFamilyData
      : rawFamilyData.data || [];

    flatList.forEach((p) => {
      const pid = p.id.toString();
      // Store Node
      if (!allNodesMap.has(pid)) {
        allNodesMap.set(pid, {
          id: pid,
          name: p.name,
          gender: p.gender,
          relation: p.relation,
          photo: p.photo,
          isMe: p.relation === "Myself" || p.relation === "Me",
          fid: p.fid,
          mid: p.mid,
        });
      }

      // Add Edges (Parent-Child)
      // p.fid -> p
      if (p.fid) {
        const fid = p.fid.toString();
        addEdge(pid, fid);
      }
      if (p.mid) {
        const mid = p.mid.toString();
        addEdge(pid, mid);
      }

      // Add Edges (Spouse)
      if (p.pids && Array.isArray(p.pids)) {
        p.pids.forEach((spouseId) => {
          addEdge(pid, spouseId.toString());
        });
      }
    });
  } else {
    // Fallback to Hierarchy Traversal (Lossy for Maternal lines usually)
    const mainRoot = d3.hierarchy(familyData);

    mainRoot.descendants().forEach((d) => {
      allNodesMap.set(d.data.id, d.data);
      // Spouse Link
      if (d.data.spouse) {
        if (!d.data.spouse.id) d.data.spouse.id = d.data.id + "_spouse";
        allNodesMap.set(d.data.spouse.id, d.data.spouse);
        addEdge(d.data.id, d.data.spouse.id);
      }
    });

    mainRoot.links().forEach((link) => {
      addEdge(link.source.data.id, link.target.data.id);
    });
  }

  // BFS to build new tree centered on Start Node ("Me")
  let rootId = startNodeId;

  if (!rootId) {
    // Find "Me" or "Myself" in the map
    const values = Array.from(allNodesMap.values());
    const meNode = values.find((d) => d.isMe || d.relation === "Myself");
    if (meNode) {
      rootId = meNode.id;
    } else {
      // Fallback: Use the main root ID from familyData
      if (familyData && familyData.id) {
        rootId = familyData.id;
        console.warn(
          "Fan View: 'Myself' not found, defaulting to Tree Root:",
          rootId,
        );
      } else {
        rootId = allNodesMap.keys().next().value;
        console.warn(
          "Fan View: 'Myself' not found, defaulting to arbitrary node:",
          rootId,
        );
      }
    }
  }

  const rootNodeData = allNodesMap.get(rootId);

  if (!rootNodeData) {
    console.error("Fan Root not found:", rootId);
    return;
  }

  currentFanRootId = rootId; // Update global state

  const newRoot = { ...rootNodeData, children: [] };
  const queue = [{ id: rootId, node: newRoot, depth: 0 }];
  const visited = new Set([rootId]);

  while (queue.length > 0) {
    const { id, node, depth } = queue.shift();

    if (depth >= 15) continue; // Increased depth limit for large datasets

    const neighbors = adj.get(id) || [];
    neighbors.forEach((nid) => {
      if (!visited.has(nid)) {
        // --- PARENTS MODE FILTER ---
        if (ancestorMode) {
          const currentData = allNodesMap.get(id);
          // Check strict parentage: Is nid the Father or Mother of current node?
          let isParent = false;
          if (currentData) {
            const fid = currentData.fid ? currentData.fid.toString() : null;
            const mid = currentData.mid ? currentData.mid.toString() : null;
            // nid is the neighbor we are considering moving TO
            if (nid === fid || nid === mid) {
              isParent = true;
            }
          }
          if (!isParent) return;
        }

        visited.add(nid);
        const nData = allNodesMap.get(nid);
        if (nData) {
          const newNode = { ...nData, children: [] };
          node.children.push(newNode);
          queue.push({ id: nid, node: newNode, depth: depth + 1 });
        }
      }
    });
  }

  const fanRoot = d3.hierarchy(newRoot);

  // Color Palette Theme Split
  const lightColors = [
    "#BDD7EF", // Blue (Me)
    "#FFACFC",
    "#FEF28D",
    "#A8F48D",
    "#FE96FA",
  ];
  const darkColors = [
    "#DDEEFF",
    "#FFAFAF",
    "#FFE078",
    "#F3A5FF",
    "#FF669E",
  ];
  
  const genColors = (typeof window.isDarkMode !== "undefined" && !window.isDarkMode) ? lightColors : darkColors;
  const getGenColor = (d) => genColors[d.depth % genColors.length];

  // Assign Colors
  fanRoot.descendants().forEach((d) => {
    d.color = getGenColor(d);
  });

  // Pre-calculate Depth for Ring assignment
  fanRoot.descendants().forEach((d) => {
    // d.depth is auto-calculated by d3.hierarchy
    // 0 = Me, 1 = Children/Parents, etc.
  });

  // Custom Partition Layout
  // We want to control the Angles manually to split ancestors/descendants if needed.
  // For simplicity V2: Standard 360 Sunburst partition
  const partition = d3.partition().size([2 * Math.PI, radius]); // x, y (angle, radius)

  // Run partition logic MANUALLY to ensure fit?
  // Standard d3 partition:
  // partition(fanRoot);

  // FIX: Manual Radial Layout to separate "Parents" (Top) vs "Children" (Bottom)
  // or just let it flow. The user image shows a full semi-circle or full circle.
  // Let's do a Full Circle Sunburst for maximum space.

  // 1. Assign "Value" to leaves to determine angular width
  fanRoot.count(); // Sets .value to number of leaves

  // Override Layout
  // Assign x0, x1 (Angle) and y0, y1 (Radius)
  // Extend rings for depth 15
  const ringThickness = [0];
  for (let i = 1; i <= 15; i++) ringThickness.push(i <= 4 ? 80 : 60); // Decreasing thickness? Or constant.

  const depthStartRadius = [0];
  for (let i = 1; i < ringThickness.length; i++) {
    depthStartRadius[i] = depthStartRadius[i - 1] + ringThickness[i];
  }

  // Angular Threshold Config
  const MIN_ANGLE_THRESHOLD = 0.08; // ~4.5 degrees. Segments smaller than this will be collapsed.

  const plusNodes = [];
  fanRoot.eachBefore((d) => {
    if (d.depth === 0) {
      d.x0 = 0;
      d.x1 = 2 * Math.PI;
      d.y0 = 0;
      d.y1 = ringThickness[1] - 5; // Center Circle Radius

      // Identify "Mother" side if we want strict split?
      // Standard: Sort by something?
      // Let's assume standard order.

      // Manual Split: Father's side (0 to PI), Mother's side (PI to 2PI)?
      // Needs accurate graph traversal.
      // For now: Just standard partition logic below.

      // Just separate children equally:
      const totalChildren = d.children ? d.children.length : 0;
      if (totalChildren > 0) {
        // Determine Father vs Mother if possible
        // Assuming familyData structure: siblings are ordered.
        // We'll just evenly distribute for now.
        // TODO: Strict Maternal/Paternal separation requires specific data tagging.
      }

      // We'll mimic the "Manual Loop" distribution below but for the Root's children
      // to ensure they start at clear quadrants if we wanted.
      // For now, let the generic loop handle it, but we initialize Root:

      // Important: We need to define the angular range for the root's children to inherit.
      // d.x0/x1 are set.
      // But we need to set the specific ranges for children 1-by-1 if we want custom split.
      // If we skip this, the generic loop handles it based on parent's x0/x1.

      // Let's try to find "Mother" and "Father" nodes specifically if they exist in Children
      const father = d.children
        ? d.children.find((c) => c.data.relation === "Father")
        : null;
      const mother = d.children
        ? d.children.find((c) => c.data.relation === "Mother")
        : null;

      // Note: In current data structure, "Father" is usually the parent of "Me" in the JSON structure if "Me" is root?
      // Actually, "Me" is usually a child of "Father".
      // If we re-rooted to "Me", "Father" is a child of "Me" in the d3.hierarchy concept?
      // Yes, if we built the hierarchy that way.
      // But currently `d3.hierarchy(centerNode)` where centerNode is from the original tree...
      // Original Tree: G-Father -> Father -> Me.
      // If centerNode is Me, `d3.hierarchy` only gives DESCENDANTS (Children).
      // It does NOT automatically walk up to Parents unless we restructured the data to include Upward links as 'children'.

      // *** CRITICAL FIX ***:
      // Does `fanRoot` include Parents?
      // In standard JSON, no. Parents are 'above'.
      // If we want a true Fan Chart of Ancestors + Descendants, we need a graph traversal that builds a new hierarchy object
      // containing both, centered on "Me".
      // If `familyData` is standard directed tree, we only have children.
      // However, the User's Image implies Ancestors (Grandmother, Uncle, etc.).
      // The previous code assumed `fanRoot` had them.
      // Let's assume the dataset or previous logic added them?
      // Looking at `data.js`: It's a tree.
      // If we want "Me" centered, and show Parents, we need a bi-directional hierarchy builder.

      // As this is a clean-up/refactor, I will assume the current `fanRoot` (just descendants of `centerNode`)
      // is acceptable OR that we need to fake it for the demo if the user wants "Parents".
      // The request is about the "+" feature. I will stick to the generic partition logic which works for whatever `fanRoot` contains.

      // Initialize Root's children angular range
      if (d.children) {
        const range = d.x1 - d.x0;
        const step = range / d.children.length;
        d.children.forEach((child, i) => {
          child.x0 = d.x0 + i * step;
          child.x1 = d.x0 + (i + 1) * step;
          // Init Y for filter check
          const rStart = depthStartRadius[child.depth] || child.depth * 50;
          const rThick = ringThickness[child.depth] || 50;
          child.y0 = rStart + 5;
          child.y1 = rStart + rThick - 5;
        });
      }

      return;
    }

    // Generic Child Layout & THRESHOLD CHECK
    if (d.children && d.children.length > 0) {
      // Check if THIS node is already hidden by its parent?
      // If 'd' is hidden, its children shouldn't be processed for layout (or will be hidden).
      if (d.childrenHidden) {
        // Propagate hidden state? Or just don't calculate coords?
        d.children.forEach((c) => (c.childrenHidden = true));
        return;
      }

      const range = d.x1 - d.x0;
      const step = range / d.children.length;

      // --- THE PLUS FEATURE LOGIC ---
      // Check if the children would be too thin
      if (step < MIN_ANGLE_THRESHOLD) {
        // New Logic: Don't hide the parent ("Mother").
        // Instead, mark children as hidden and create a NEW "Plus" node in the child ring.

        d.hasHiddenChildren = true; // Flag for logic, but doesn't affect parent render
        d.children.forEach((c) => (c.isSystemHidden = true));

        // Create Plus Node
        const rStart = depthStartRadius[d.depth + 1] || (d.depth + 1) * 80; // Fallback if out of bounds
        const rThick = ringThickness[d.depth + 1] || 60;

        const plusNode = {
          data: { id: d.data.id, name: "+", isPlus: true }, // Use parent ID for expansion
          depth: d.depth + 1,
          x0: d.x0,
          x1: d.x1,
          y0: rStart + 5,
          y1: rStart + rThick - 5,
          color: "#333", // Distinct color for button
          isPlusButton: true,
          parent: d,
        };
        plusNodes.push(plusNode);
      } else {
        // Distribute normally
        d.children.forEach((child, i) => {
          child.x0 = d.x0 + i * step;
          child.x1 = d.x0 + (i + 1) * step;

          const rStart = depthStartRadius[child.depth];
          const rThick = ringThickness[child.depth];

          child.y0 = rStart + 5;
          child.y1 = rStart + rThick - 5;
        });
      }
    }
  });

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1)
    .padAngle(0.02)
    .cornerRadius(5);

  // --- 3D Scene Setup (Stacked Layers) ---
  const scene = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // 1. Tilt Container: Scale Y to simulate perspective tilt
  const TILT_SCALE = 1;
  const fanGroup = scene
    .append("g")
    .attr("class", "fan-3d-container")
    .attr("transform", `scale(1, ${TILT_SCALE})`);

  // 2. Render Layers (Bottom to Top) for Thickness
  const NUM_LAYERS = 8;
  const LAYER_OFFSET = 2; // Pixels per layer (total depth = 16px)

  // Helper: Darken color for sides
  const darken = (c, factor) => d3.color(c).darker(factor).hex();

  // Filter Data: Exclude nodes that are hidden
  const visibleNodes = fanRoot.descendants().filter((d) => {
    if (d.depth === 0) return true; // Root always visible

    // Filter hidden children
    if (d.isSystemHidden) return false;
    if (d.parent && d.parent.isSystemHidden) return false; // Safety cascaded check

    return (
      d.x0 !== undefined && d.x1 !== undefined && !isNaN(d.x0) && !isNaN(d.x1)
    );
  });

  // Merge Regular Nodes + Plus Nodes
  const finalRenderNodes = visibleNodes.concat(plusNodes);

  for (let i = 0; i < NUM_LAYERS; i++) {
    const isTop = i === NUM_LAYERS - 1;
    const yOffset = (NUM_LAYERS - 1 - i) * LAYER_OFFSET;

    const layer = fanGroup
      .append("g")
      .attr("transform", `translate(0, ${yOffset})`);

    const paths = layer
      .selectAll(".fan-segment")
      .data(finalRenderNodes)
      .enter()
      .append("path")
      .attr("class", "fan-segment")
      .attr("d", arc)
      .style("fill", (d) => {
        if (d.isPlusButton) return "#333";

        // Normal coloring

        return isTop ? d.color : darken(d.color, 0.5 + (NUM_LAYERS - i) * 0.1);
      })
      .style("stroke", (d) => (isTop ? "#333" : "none"))
      .style("stroke-width", "0.5px");

    if (isTop) {
      paths
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          console.log(
            "Fan Segment Clicked:",
            d.data.name,
            "Depth:",
            d.depth,
            "ID:",
            d.data.id,
          );

          if (d.isPlusButton) {
            // Expand Tree - Parent ID is in d.data.id from constructor
            console.log("Expanding tree at:", d.data.id);
            if (currentFanRootId) fanHistory.push(currentFanRootId);
            initFan(d.data.id);
          } else {
            showModal(d);
          }
        })
        .on("mouseover", function () {
          d3.select(this).style("filter", "brightness(1.1)");
        })
        .on("mouseout", function () {
          d3.select(this).style("filter", null);
        });
    }
  }

  // 3. Labels (On Top Layer)
  const labelGroup = fanGroup
    .append("g")
    .attr("class", "fan-labels")
    .attr("transform", `translate(0, 0)`);

  const maxAnglesCheck = (d) =>
    d.x0 !== undefined && d.x1 !== undefined && !isNaN(d.x0) && !isNaN(d.x1);

  const labels = labelGroup
    .selectAll(".fan-label")
    .data(finalRenderNodes)
    .enter()
    .append("g")
    .attr("class", "fan-label")
    .attr("transform", (d) => {
      if (!maxAnglesCheck(d)) return "translate(-9999,-9999)"; // Safety offscreen instead of 0,0

      // Fix for Full Ring Centroid Bug:
      // d3.arc().centroid(d) returns [0,0] if the arc is a full circle (or near it).
      // We need to manually calculate the position based on mid-angle and mid-radius.

      const midAngle = (d.x0 + d.x1) / 2;
      const r = (d.y0 + d.y1) / 2;

      // Convert Polar to Cartesian
      // Note: d3 arc angles, 0 is at 12 o'clock (-PI/2 in standard trig)?
      // d3.arc startAngle 0 is 12 o'clock usually defined in arc generator?
      // Wait, d3.arc default 0 is 12 o'clock.
      // But let's verify standard d3 usage. Usually 0 is up.
      // Cartesian: x = r * sin(angle), y = -r * cos(angle) for 0 at 12oclock.

      let cx, cy;
      // If angle is large (e.g. > 300 degrees), centroid falls to center.
      // 300 deg = 5.23 rad.
      // Let's just ALWAYS use polar calc for consistency?
      // Centroid is center of mass (area). For simple annular sector, it's slightly different from mid-radius.
      // But for text, mid-radius is usually better aligned.
      // Let's switch to polar calc for ALL labels to be safe and consistent.

      cx = r * Math.sin(midAngle);
      cy = -r * Math.cos(midAngle);

      const deg = (midAngle * 180) / Math.PI; // 0 at Top, 90 at Right, 180 Bottom

      // 1. Me Node: Center
      if (d.depth === 0) return `translate(0, 0)`;

      // 2. Others: Rotate to align with slice
      let rotate = 0;

      if (d.depth === 1) {
        // For Depth 1 (Ring around center), we want text upright?
        // If we follow the ring curve?
        // Standard Fan: Text is radial or tangential.
        // Existing code was tangential (rotated).
        // Let's keep tangential but ensure correct flip.
        rotate = deg > 90 && deg < 270 ? deg + 180 : deg;
      } else {
        rotate = deg < 180 ? deg - 90 : deg + 90;
      }
      return `translate(${cx}, ${cy}) rotate(${rotate})`;
    })
    .style("pointer-events", "none");

  labels.each(function (d) {
    if (!maxAnglesCheck(d)) return;

    const el = d3.select(this);

    // Me Node (Text Mode)
    // Me Node (Center)
    if (d.depth === 0) {
      el.attr("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("fill", "#333")
        .style("pointer-events", "none");

      // Name
      el.append("text")
        .text(d.data.name)
        .attr("y", -10) // Moved up slightly to accommodate multiple lines
        .attr("dy", 0)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .call(wrap, 100); // Wrap width ~100px (Center circle is roughly 120px wide)

      // Relation (e.g., "Family Member" or "Myself")
      if (d.data.relation) {
        el.append("text")
          .text(d.data.relation)
          .attr("y", 12)
          .style("font-size", "10px")
          .style("fill", "#555");
      }
      return;
    }

    // Expand Button Text (Dynamic or Depth Limit)
    if (d.isPlusButton) {
      // Re-center for the Plus symbol to ensure it's un-rotated IF we want upright.
      // But the transform above applies rotation.
      // Let's undo rotation for the Plus sign if we want it perfect,
      // or just let it rotate. Rotated Plus is an 'X'.
      // We want a Plus '+'.

      // Undo rotation for clarity:
      el.attr("transform", function () {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1]})`;
      });

      el.attr("text-anchor", "middle").style("pointer-events", "none");

      el.append("text")
        .text("+")
        .attr("dy", "0.35em")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .style("pointer-events", "none");
      return;
    }

    // Standard Text
    const relationText = d.data.relation;
    const name = d.data.name;

    // Dynamic Font Size
    const angle = d.x1 - d.x0; // Radians
    let fontSize = 8; // Reduced base

    // Scale down for smaller slices
    if (angle < 0.25) fontSize = 7;
    if (angle < 0.2) fontSize = 6;
    if (angle < 0.15) fontSize = 5;
    if (angle < 0.1) fontSize = 4;
    if (angle < 0.06) fontSize = 3;
    if (angle < 0.03) fontSize = 2; // Tiny

    // Apply
    el.attr("text-anchor", "middle")
      .style("font-family", "sans-serif")
      .style("fill", "#000");

    // Name
    el.append("text")
      .text(name)
      .attr("y", -fontSize / 2) // Center logic
      .style("font-size", fontSize + "px")
      .style("font-weight", "bold")
      .style("pointer-events", "none");

    // Relation (Smaller than Name)
    const relSize = Math.max(3, fontSize - 2);

    el.append("text")
      .text(relationText)
      .attr("y", fontSize / 2 + 2)
      .style("font-size", relSize + "px")
      .style("fill", "#444")
      .style("pointer-events", "none");
  });

  // Zoom Logic
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      scene.attr("transform", event.transform);
    });

  svg
    .call(zoom)
    .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

  // Add "Back" button if we are deep (not at true root)
  // --- Navigation Buttons (Back & Reset) ---
  // Render Back Button if history exists
  if (fanHistory.length > 0) {
    const backBtn = svg
      .append("g")
      .attr("transform", `translate(50, 50)`)
      .style("cursor", "pointer")
      .on("click", () => {
        const prevId = fanHistory.pop();
        initFan(prevId);
      });

    backBtn
      .append("rect")
      .attr("width", 80)
      .attr("height", 30)
      .attr("rx", 15)
      .attr("fill", "rgba(255, 255, 255, 0.2)")
      .attr("stroke", "#fff");

    backBtn
      .append("text")
      .attr("x", 40)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .text("Back")
      .style("fill", "white")
      .style("font-size", "12px");
  }

  // Render Reset Button if not at true root (or deep)
  // We check if we are NOT at the absolute start (which is usually found dynamically if not passed)
  // Check if startNodeId is different from the initial 'Me'
  // But initFan logic determines 'rootId' dynamically if startNodeId is null.
  // Let's rely on: if (startNodeId && startNodeId !== "root" && startNodeId !== meNode.id)
  // Note: meNode definition is inside initFan logic above. We need to access it.
  // Re-finding 'Me' here is inefficient but safe.

  // Better: Check if we have history. If history > 0, we can definitely Reset.
  // Or if startNodeId is set?

  if (fanHistory.length > 0) {
    const resetBtn = svg
      .append("g")
      .attr("transform", `translate(140, 50)`) // Positioned to the right of Back button
      .style("cursor", "pointer")
      .on("click", () => {
        fanHistory = []; // Clear history
        initFan(); // Reset to default
      });

    resetBtn
      .append("rect")
      .attr("width", 80)
      .attr("height", 30)
      .attr("rx", 15)
      .attr("fill", "rgba(255, 255, 255, 0.2)")
      .attr("stroke", "#ff4444");

    resetBtn
      .append("text")
      .attr("x", 40)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .text("Reset")
      .style("fill", "white")
      .style("font-size", "12px");
  }
}

// --- 5. Isometric 3D Logic ---

// --- 5. Vertical Tree Logic (Left-to-Right) ---
function initVerticalTree() {
  svg.selectAll("*").remove(); // Clear SVG
  svg.on(".drag", null); // Clear drag
  svg.on(".zoom", null); // Clear zoom

  // Background for Vertical Tree View
  svg.style("background", "linear-gradient(45deg, #1a2980 0%, #26d0ce 100%)");

  const cardWidth = 180;
  const cardHeight = 60;

  // Tree Layout Group
  // Translate slightly right to give space for root
  const g = svg.append("g").attr("transform", `translate(100, ${height / 2})`);

  const root = d3.hierarchy(familyData);

  const treeLayout = d3
    .tree()
    .nodeSize([cardHeight * 2 + 50, cardWidth + 120]) // Height, Width spacing (Increased width to fix "sticked" connections)
    .separation((a, b) => (a.parent == b.parent ? 1.1 : 1.25));

  treeLayout(root);

  // Links
  g.selectAll(".tree-link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "tree-link")
    .attr("d", (d) => {
      // Swap X and Y for Left-to-Right
      let s = { y: d.source.x, x: d.source.y + cardWidth / 2 };

      // If source has spouse, link start from midpoint vertically
      if (d.source.data.spouse) {
        const offset = (cardHeight + 20) / 2;
        s.y += offset;
      }

      const t = { y: d.target.x, x: d.target.y - cardWidth / 2 };

      // Logic Adjustment:
      // If we are connecting from Grandparents -> Father/Mother.
      // Target is Father/Mother (Depth 1).
      // User wants connection to go ONLY to Father (or Mother), not the center of the couple.
      // So for Depth 1 targets, we skip the spouse offset?
      // "Me" is Depth 0. Father/Mother are Depth 1. GP are Depth 2.
      // Wait, links are distinct.
      // Link: Me -> Father. Me is S, Father is T. Depth 0 -> 1.
      // Link: Father -> Pat GP. Father is S, Pat GP is T. Depth 1 -> 2.

      // Wait, D3 Tree direction in my code:
      // ancestorRoot = Me. Children = Father, Mother.
      // So Tree structure is Me -> Father.
      // Link source=Me, target=Father.
      // User requested: "connection from grandfather... to father".
      // In my structure: Grandfather is CHILD of Father. (Me -> Father -> GF).
      // So Link: Father(Source) -> GF(Target).
      // Visual Line: Left(Source) --- Right(Target).
      // If visual is Me(Left) ... Father(Right) ... GF(Far Right).
      // Then Link draw is Source -> Target.
      // The user phrasing "from grandfather to father" implies he sees relation direction.
      // But visually, the line is between Father and Grandfather.

      // Issue: "instead of center of father and mother".
      // That implies the PREVIOUS link (Me -> Father/Mother) was hitting the center?
      // "connection from grandfather ... to father".
      // If Grandparents are to the Right of Father.
      // The line connects Father (Left side of gap) and Grandparents (Right side).
      // Father is the SOURCE of that link (in D3 data).
      // Grandfather is TARGET.

      // If user means the line hitting FATHER should be specific.
      // That means the SOURCE point of the (Father->GF) link.
      // OR the TARGET point of the (Me->Father) link.
      // "center of father and mother" usually refers to the link between Me and Parents.
      // Let's re-read: "the connection from grandfather and grandmother should go only to father".
      // This refers to the link *between* GP and Father.
      // In my layout: Father (Left) ---- GP (Right).
      // Father is connected to GP.
      // Father has a spouse (Mother).
      // My code handles Source Offset: `if (d.source.data.spouse) s.y += offset`.
      // This moves the start of the line (at Father) to the center of Father+Mother.
      // User wants it to go ONLY to Father.
      // So: If Source is Father (or Mother), and we are linking to Grandparents,
      // DO NOT offset the Source Y.

      // Implementation:
      // Check if source is Depth 1 (Father/Mother in this tree).
      // If so, set s.y to d.source.x (no offset).

      if (d.source.data.spouse) {
        // Modified: Only offset if NOT connecting to grandparents?
        // Or simply: If this is the link to Grandparents, don't offset.
        // How do we know? Target is depth 2.
        if (d.target.depth === 2) {
          // This is Father -> GF link.
          // Keep s.y as is (Center of Father card).
        } else {
          // This is Me -> Father link (Source is Me, Depth 0).
          // Or other links.
          // Me doesn't have visible spouse here.
          const offset = (cardHeight + 20) / 2;
          s.y += offset;
        }
      }

      // Rounded Orthogonal Line
      // Path: Source -> (Horizontal) -> Corner1 -> (Vertical) -> Corner2 -> (Horizontal) -> Target

      // Adjust midX to give more space from Source (prevent "sticked" look)
      // Default center, but ensure at least 50px from source if possible
      let midX = (s.x + t.x) / 2;
      const minGap = 50;
      if (midX - s.x < minGap && t.x - s.x > minGap * 2) {
        midX = s.x + minGap;
      }

      const r = 10; // Corner radius

      // Direction flags
      // s.x is Start X, t.x is End X. midX is between.
      // In left-to-right tree, s.x < midX < t.x.
      // Vertical direction: s.y vs t.y.

      // Safe Radius: Ensure we don't overlap if segments are short
      const w1 = Math.abs(midX - s.x);
      const w2 = Math.abs(t.x - midX);
      const h = Math.abs(t.y - s.y);
      const safeR = Math.min(r, w1 / 2, w2 / 2, h / 2);

      if (h < 1) {
        // If practically horizontal, straight line
        return `M ${s.x},${s.y} L ${t.x},${t.y} `;
      }

      // Determine sweep flags for curves
      const dy = t.y - s.y;
      const signY = dy > 0 ? 1 : -1; // 1 if going down, -1 if going up

      // Path construction
      // M s.x, s.y
      // L midX - r, s.y
      // Q midX, s.y  midX, s.y + signY * r
      // L midX, t.y - signY * r
      // Q midX, t.y  midX + r, t.y
      // L t.x, t.y

      return `M ${s.x},${s.y}
                    L ${midX - safeR},${s.y}
                    Q ${midX},${s.y} ${midX},${s.y + signY * safeR}
                    L ${midX},${t.y - signY * safeR}
                    Q ${midX},${t.y} ${midX + safeR},${t.y}
                    L ${t.x},${t.y} `;
    })
    .attr("fill", "none")
    .attr("stroke", "#4ecca3")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.6);

  // Nodes (Cards)
  const nodes = g
    .selectAll(".tree-node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "tree-node")
    // Swap X and Y for translation
    .attr("transform", (d) => `translate(${d.y}, ${d.x})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      showModal(d);
    });

  const renderVCard = (selection, data, isSpouse = false) => {
    const yOffset = isSpouse ? cardHeight + 20 : 0; // Fixed gap
    const grp = selection
      .append("g")
      .attr("transform", `translate(0, ${yOffset})`);

    // Card Background
    if (familyData.node_style !== "circle") {
      grp
        .append("rect")
        .attr("x", -cardWidth / 2)
        .attr("y", -cardHeight / 2)
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 10)
        .attr("class", "tree-card-bg");
    }

    const clipId = `vclip-${data.id}`;
    grp
      .append("clipPath")
      .attr("id", clipId)
      .append("circle")
      .attr("r", 20)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0);

    grp
      .append("image")
      .attr("xlink:href", data.photo)
      .attr("x", -cardWidth / 2 + 10)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("crossorigin", "anonymous")
      .attr("clip-path", `url(#${clipId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");

    grp
      .append("circle")
      .attr("r", 21)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0)
      .attr("fill", "none")
      .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
      .attr("stroke-width", data.isMe ? 4 : 1.5);

    const textGroup = grp
      .append("g")
      .attr("transform", `translate(${-cardWidth / 2 + 60}, 0)`);

    textGroup
      .append("text")
      .attr("class", "tree-card-name")
      .attr("y", -2)
      .text(data.name);

    textGroup
      .append("text")
      .attr("class", "tree-card-relation")
      .attr("y", 12)
      .text(data.relation);
  };

  nodes.each(function (d) {
    const el = d3.select(this);
    renderVCard(el, d.data, false);
    if (d.data.spouse) {
      // Spouse exists: Render Spouse Card
      // No vertical connecting line!
      renderVCard(el, d.data.spouse, true);
    }
  });

  // Zoom
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  // Center initially (Left side)
  const initialTransform = d3.zoomIdentity.translate(100, height / 2).scale(1);
  svg.call(zoom).call(zoom.transform, initialTransform);
}

// --- 6. Switcher & Event Listeners ---

function switchView(view) {
  currentView = view;

  // 1. Globe Cleanup (Always try to close/hide Three.js first)
  try {
    if (typeof closeThreeGlobe === "function") closeThreeGlobe();
    if (typeof closeTrue3D === "function") closeTrue3D(); // [NEW] Cleanup True 3D
  } catch (e) {
    console.error("Error closing globe/3D:", e);
  }

  // 2. Default: Show D3 SVG (Fan, Tree, Vert, Iso all use D3 SVG)
  // Globe View will hide it specifically.
  const svgEl = document.querySelector("#tree-container svg");
  if (svgEl) svgEl.style.display = "block";

  // 3. UI Controls
  const fanSidebar = document.getElementById("fan-member-sidebar");
  if (view === "fan") {
    document.getElementById("fan-controls").style.display = "flex";
    if (fanSidebar) {
      fanSidebar.style.display = "flex";
      populateMemberList(); // Ensure list is populated
    }
    // Reset Fan State
    fanHistory = [];
    currentFanRootId = null;
  } else if (view === "isometric" || view === "true-3d") {
    // 3D Views get the sidebar too
    const fanControls = document.getElementById("fan-controls");
    if (fanControls) fanControls.style.display = "none";
    if (fanSidebar) {
      fanSidebar.style.display = "flex";
      populateMemberList(); // Ensure list is populated
    }
  } else {
    const fanControls = document.getElementById("fan-controls");
    if (fanControls) fanControls.style.display = "none"; // Safety check
    if (fanSidebar) fanSidebar.style.display = "none";
  }

  // Isometric Controls
  const isoControls = document.getElementById("iso-controls");
  if (isoControls) {
    if (view === "isometric") {
      isoControls.style.display = "flex";
    } else {
      isoControls.style.display = "none";
    }
  }

  // 4. View Initialization
  if (view === "fan") {
    initFan();
  } else if (view === "tree") {
    initTree();
  } else if (view === "vertical-tree") {
    initVerticalTreeV2();
  } else if (view === "isometric") {
    init3DTree();
  } else if (view === "pedigree") {
    initPedigreeView();
  } else if (view === "true-3d") {
    // [NEW] True 3D View
    if (typeof initTrue3D === "function") {
      initTrue3D();
    }
  } else if (view === "globe") {
    // Hide SVG for Globe
    if (svgEl) svgEl.style.display = "none";

    if (typeof initThreeGlobe === "function") {
      initThreeGlobe();
    } else {
      console.error("Three.js Globe not found");
    }
  }
}

// Checkbox Listener
document.getElementById("ancestor-mode").addEventListener("change", (e) => {
  ancestorMode = e.target.checked;
  if (currentView === "fan") initFan();
});

// Member Sidebar Logic
function populateMemberList() {
  const listContainer = document.getElementById("member-list");
  if (!listContainer || !rawFamilyData) return;

  const list = Array.isArray(rawFamilyData) ? rawFamilyData : (rawFamilyData.data || []);
  console.log("Populating member list. Total members in raw data:", list.length);
  
  // Sort by name (handling null/undefined)
  const sortedList = [...list].sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";
    return nameA.localeCompare(nameB);
  });

  listContainer.innerHTML = "";
  sortedList.forEach(member => {
    const item = document.createElement("div");
    item.className = "member-item";
    item.dataset.id = member.id;
    item.innerHTML = `
      <img src="${member.photo || 'https://api.kintree.com/kintree-assets/images/default-avatars/' + (member.gender === 'f' ? 'female.png' : 'male.png')}" alt="${member.name || 'Unknown'}">
      <div class="member-item-info">
        <span class="member-item-name">${member.name || 'Unknown'}</span>
        <span class="member-item-relation">${member.relation || ''}</span>
      </div>
    `;
    item.addEventListener("click", () => {
      if (currentView === "fan") {
        initFan(member.id.toString());
      } else if (currentView === "isometric" || currentView === "true-3d") {
        switchToIndividualFamilyView(currentView, member.id);
      }
    });
    listContainer.appendChild(item);
  });
}

function filterMemberList(query) {
  const items = document.querySelectorAll(".member-item");
  const q = query.toLowerCase();
  items.forEach(item => {
    const name = item.querySelector(".member-item-name").textContent.toLowerCase();
    const relation = item.querySelector(".member-item-relation").textContent.toLowerCase();
    if (name.includes(q) || relation.includes(q)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

document.getElementById("member-search")?.addEventListener("input", (e) => {
  filterMemberList(e.target.value);
});

// Button Listeners
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const view = e.target.dataset.view;

    // Update Buttons UI
    document
      .querySelectorAll(".view-btn")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");

    if (view === "isometric") {
      // Default to Individual Family for 3D View
      switchToIndividualFamilyView(view);
    } else {
      // For other views, we might want to reset to full tree or keep current?
      // User didn't specify, but to be safe and avoid getting stuck in Individual View
      // when switching back to Tree, we should probably reset unless the user manually selected a filter.
      // However, typical behavior is "View changes visualization, Filter changes data".
      // But since we are FORCING data change on 3D, we should probably force it back on others?
      // Let's stick to the specific request: "3d view should open default on individual family".
      // We will NOT auto-reset for others to allow "Individual Family in Vertical Tree" if desired,
      // UNLESS the user switches FROM 3D.
      // Actually, if I switch to 3D -> Data becomes Individual.
      // If I switch back to Tree -> Data STAYS Individual.
      // This might be annoying if the user didn't realize data changed.
      // But let's assume "Default on open" means "When I click 3D, make sure it's Individual".

      switchView(view);
    }
  });
});

// Resize Listener
window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);

  if (currentView === "tree") {
    initTree();
  } else if (currentView === "vertical-tree") {
    initVerticalTreeV2();
  } else if (currentView === "fan") {
    initFan();
  } else if (currentView === "pedigree") {
    initPedigreeView();
  } else if (currentView === "isometric") {
    init3DTree();
  } else if (currentView === "true-3d") {
    // Handled internally by try-3d-view.js listener, but we can force update if needed
    // initTrue3D(); // Not needed if we use separate resize listener
  } else if (currentView === "globe") {
    // initGlobe(); // D3 one de-activated
    // Resize handled by window listener in globe_view.js
  }
});

// Initial Load
// Initial Load removed, handled by initApp after data load

// --- 7. Vertical Tree V2 (Bracket Connections) ---
function initVerticalTreeV2() {
  svg.selectAll("*").remove(); // Clear SVG
  svg.on(".drag", null); // Clear drag
  svg.on(".zoom", null); // Clear zoom

  // Background for Vertical Tree View
  svg.style("background", "linear-gradient(45deg, #1a2980 0%, #26d0ce 100%)");

  const cardWidth = 180;
  const cardHeight = 60;

  // Tree Layout Group
  // Translate slightly right to give space for root
  const g = svg.append("g").attr("transform", `translate(100, ${height / 2})`);

  // --- Data Transformation for Vertical Tree ---
  // The familyData is already transformed by transformFamilyData to be a proper hierarchy.

  let vTreeRootData = familyData;

  const root = d3.hierarchy(vTreeRootData);
  currentTreeRoot = root; // Store for tracing

  // Calculate Max Depth to Invert Layout
  const maxDepth = d3.max(root.descendants(), (d) => d.depth);
  const depthStep = cardWidth + 100; // REDUCED Spacing (was 200)
  const totalWidth = maxDepth * depthStep;

  const treeLayout = d3
    .tree()
    .nodeSize([1, depthStep]) // Unit spacing for custom separation
    .separation((a, b) => {
      // "First Generation" (Depth 1 - Children of Root) specific spacing
      const isGen1 = a.depth === 1 && b.depth === 1;

      let sep = isGen1 ? 65 : 80; // Reduced base Spacing (was 80/110)

      const addSpacing = (d) => {
        let s = 0;
        // Spouse spacing
        if (d.data.spouse) s += isGen1 ? 65 : 80; // Reduced (was 80/100)
        if (
          d.data.spouse &&
          d.data.spouse.parents &&
          d.data.spouse.parents.length > 0
        )
          s += 40; // Reduced (was 60)
        return s;
      };

      sep += addSpacing(a);
      sep += addSpacing(b);

      // Extra gap between different branches (cousins/uncles)
      if (a.parent !== b.parent) sep += 20; // Reduced (was 40)

      return sep;
    });

  treeLayout(root);

  // INVERT FUNC: Flip X coordinates
  // Standard: Left (0) -> Right (Width)
  const getX = (d) => d.y;
  const getY = (d) => d.x;

  const colorScale = d3.scaleOrdinal([
    "#FF0055", // Neon Red
    "#FFD700", // Gold
    "#32FF32", // Neon Lime
    "#FF6600", // Neon Orange
    "#D500F9", // Neon Purple
    "#00E5FF", // Neon Cyan (High Contrast)
    "#FF3D00", // Deep Orange
  ]);

  // REPLACING LINK LOGIC START
  const linkSel = g
    .selectAll(".tree-link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "tree-link")
    .attr("data-link-type", "main-tree") // Mark as main tree link for trace feature
    .attr("d", (d) => {
      // Visual Data Logic:
      // Standard Flow: Source (Left) -> Target (Right)
      const s = { x: getX(d.source) + cardWidth / 2, y: getY(d.source) };
      const t = { x: getX(d.target) - cardWidth / 2, y: getY(d.target) };

      const visualSourceData = d.source.data;
      const visualTargetData = d.target.data;

      // --- Source Handling (Ancestor/Parent) ---
      if (visualSourceData.spouse) {
        // Ancestor has Spouse: Center-Gap Fork Logic
        const centerX = s.x - cardWidth / 2; // Center of Ancestor group

        // Father Bottom Y
        const fatherBottomY = s.y + cardHeight / 2;
        // Mother Top Y
        const spouseY = s.y + (cardHeight + 20);
        const motherTopY = spouseY - cardHeight / 2;

        // 1. Vertical Link between Spouses (Center Gap)
        const verticalLine = `M ${centerX},${fatherBottomY} V ${motherTopY} `;

        // 2. Connector from Middle of Vertical Link
        const midY = (s.y + spouseY) / 2;

        // Orthogonal Step (Rightwards to t.x)
        let mainPath = "";
        const dy = t.y - midY;
        let midX = (centerX + t.x) / 2;

        const rightEdge = centerX + cardWidth / 2;
        if (midX < rightEdge + 20) {
          midX = rightEdge + 50;
        }

        if (Math.abs(dy) < 1) {
          mainPath = `M ${centerX},${midY} L ${t.x},${t.y} `;
        } else {
          mainPath = `M ${centerX},${midY} H ${midX} V ${t.y} H ${t.x} `;
        }

        return verticalLine + mainPath;
      }

      // --- Target Handling (Descendant/Child) ---
      // If Descendant has Spouse => Square Bracket Style (Left facing bracket)
      if (visualTargetData.spouse) {
        const spouseY = t.y + (cardHeight + 20);
        const midY = (s.y + t.y) / 2;

        const bracketX = t.x - 20; // 20px Left of Descendant

        // 1. Horizontal Connectors from Bracket to Pair
        const fatherLine = `M ${bracketX},${t.y} L ${t.x},${t.y} `;
        const motherLine = `M ${bracketX},${spouseY} L ${t.x},${spouseY} `;

        // 2. Vertical Bracket Line
        const verticalLine = `M ${bracketX},${t.y} L ${bracketX},${spouseY} `;

        // 3. Source Connector (Source -> Bracket Midpoint)
        const targetMidY = (t.y + spouseY) / 2;

        let midX = (s.x + bracketX) / 2;
        const minGap = 50;

        if (bracketX - s.x > minGap * 2 && midX - s.x < minGap) {
          midX = s.x + minGap;
        }

        const dy = targetMidY - s.y;
        let mainPath = "";

        if (Math.abs(dy) < 1) {
          mainPath = `M ${s.x},${s.y} L ${bracketX},${targetMidY} `;
        } else {
          mainPath = `M ${s.x},${s.y} H ${midX} V ${targetMidY} H ${bracketX} `;
        }

        return fatherLine + motherLine + verticalLine + mainPath;
      }

      // Default: Normal Connection (Single -> Single)
      else {
        // Father/Default: Single Source
        // Start exactly from node center (s.y). Do NOT offset for spouse.
        // "Only to the father" -> Implies single line start.

        // Normal Orthogonal Path
        let midX = (s.x + t.x) / 2;
        const minGap = 50;

        if (t.x - s.x > minGap * 2 && midX - s.x < minGap) {
          midX = s.x + minGap;
        }

        const dy = t.y - s.y;
        if (Math.abs(dy) < 1) {
          return `M ${s.x},${s.y} L ${t.x},${t.y} `;
        }

        return `M ${s.x},${s.y} H ${midX} V ${t.y} H ${t.x} `;
      }
    })
    .attr("fill", "none")
    .attr("stroke", "#FFFFFF") // All Main Tree Connections are White
    .attr("stroke-width", 3)
    .attr("opacity", 1.0);

  // Nodes (Cards)
  const nodes = g
    .selectAll(".tree-node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "tree-node")
    // Swap X and Y for translation
    .attr("transform", (d) => `translate(${getX(d)}, ${getY(d)})`)
    // Click removed from here to allow individual card clicks
    .style("cursor", "border");

  const renderVCard = (selection, data, isSpouse = false) => {
    const truncate = (str, n) =>
      str && str.length > n ? str.slice(0, n - 3) + "..." : str;
    const yOffset = isSpouse ? cardHeight + 20 : 0; // Fixed gap
    const grp = selection
      .append("g")
      .attr("transform", `translate(0, ${yOffset})`);

    // Card Background
    grp
      .append("rect")
      .attr("x", -cardWidth / 2)
      .attr("y", -cardHeight / 2)
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 10)
      .attr("fill", "url(#card-gradient)") // Use SVG Gradient
      .attr("class", "tree-card-bg");

    // Add Click Listener to specific card
    grp.style("cursor", "pointer").on("click", (event) => {
      event.stopPropagation();
      // Wrap data to match showModal expectation (d.data...)
      showModal({ data: data });
    });

    const clipId = `vclip-${data.id}`;
    grp
      .append("clipPath")
      .attr("id", clipId)
      .append("circle")
      .attr("r", 20)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0);

    grp
      .append("image")
      .attr("xlink:href", data.photo)
      .attr("x", -cardWidth / 2 + 10)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("crossorigin", "anonymous")
      .attr("clip-path", `url(#${clipId})`)
      .attr("preserveAspectRatio", "xMidYMid slice");

    grp
      .append("circle")
      .attr("r", 21)
      .attr("cx", -cardWidth / 2 + 30)
      .attr("cy", 0)
      .attr("fill", "none")
      .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
      .attr("stroke-width", data.isMe ? 4 : 1.5);

    const textGroup = grp
      .append("g")
      .attr("transform", `translate(${-cardWidth / 2 + 60}, 0)`);

    textGroup
      .append("text")
      .attr("class", "tree-card-name")
      .attr("y", -2)
      .text(truncate(data.name, 15))
      .append("title")
      .text(data.name);

    textGroup
      .append("text")
      .attr("class", "tree-card-relation")
      .attr("y", 12)
      .text(truncate(data.relation || "", 20))
      .append("title")
      .text(data.relation);

    return grp;
  };

  nodes.each(function (d) {
    const el = d3.select(this);
    renderVCard(el, d.data, false);
    if (d.data.spouse) {
      // Spouse exists: Render Spouse Card
      renderVCard(el, d.data.spouse, true);

      // Draw Vertical Line between Cards (Childless Couple Connection)
      // Main Card Bottom: Y = 30
      // Spouse Card Top: Y = 50 (80 - 30)
      el.append("path")
        .attr("d", `M 0,30 V 50`)
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("opacity", 1.0);

      // Check for Spousal Parents (Maternal Grandparents etc.)
      if (d.data.spouse.parents && d.data.spouse.parents.length > 0) {
        // Render them to the LEFT of the spouse
        const parentXOffset = -600; // Increased spacing further
        const spouseYOffset = cardHeight + 20; // Relative to Main Node

        const p1 = d.data.spouse.parents[0];
        const p2 = d.data.spouse.parents[1];

        // Render Parent 1 (Father)
        const p1Y = spouseYOffset - 40;
        const p1Grp = el
          .append("g")
          .attr("transform", `translate(${parentXOffset}, ${p1Y})`);
        renderVCard(p1Grp, p1, false);

        // Render Parent 2 (Mother)
        const p2Y = spouseYOffset + 40;
        const p2Grp = el
          .append("g")
          .attr("transform", `translate(${parentXOffset}, ${p2Y})`);
        if (p2) renderVCard(p2Grp, p2, false);

        // Vertical Link between Parents (Center Gap)
        const p1Bottom = p1Y + cardHeight / 2;
        const p2Top = p2Y - cardHeight / 2;

        // Draw Vertical Line
        el.append("path")
          .attr("d", `M ${parentXOffset},${p1Bottom} V ${p2Top} `)
          .attr("stroke", colorScale(d.data.spouse.id)) // Spousal Line Color
          .attr("stroke-width", 3);

        // Horizontal Line to Spouse (from Midpoint)
        const midY = (p1Y + p2Y) / 2; // Should be spouseYOffset
        // Connect to Left Edge of Spouse Card (-cardWidth/2)

        el.append("path")
          .attr("d", `M ${parentXOffset},${midY} H ${-cardWidth / 2} `)
          .attr("stroke", colorScale(d.data.spouse.id)) // Spousal Line Color
          .attr("stroke-width", 3)
          .attr("fill", "none");
      }
    }
  });

  // Zoom
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  // Center initially (Left side)
  const initialTransform = d3.zoomIdentity.translate(100, height / 2).scale(1);
  svg.call(zoom).call(zoom.transform, initialTransform);
}

// --- 8. Re-Rooting Logic ---
window.reRootTree = function (targetId) {
  if (!rawFamilyData) {
    console.error("No raw data available for re-rooting");
    return;
  }

  console.log("Re-rooting tree on:", targetId);

  // Transform data focusing on targetId
  familyData = transformFamilyData(rawFamilyData, targetId);

  if (!familyData) {
    console.error("Failed to re-transform data");
    return;
  }

  // Re-render current view (Vertical Tree usually)
  if (currentView === "vertical-tree") {
    initVerticalTreeV2();
  } else {
    initApp();
  }

  // Toast
  const newRootName = familyData.data ? familyData.data.name : familyData.name;
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = `Showing Tree Root: ${newRootName}`;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#4ecca3";
  toast.style.color = "#000";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "20px";
  toast.style.zIndex = "10000";
  toast.style.fontWeight = "bold";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Initialize App
// Load Data and Initialize
d3.json("data.json")
  .then((data) => {
    // Store Raw Data
    rawFamilyData = data.data || data; // Handle {data: []} or []

    // Transform data if it's in API format
    familyData = transformFamilyData(data);

    if (!familyData) {
      throw new Error("Failed to transform family data");
    }

    populateMemberList(); // Populate member list after data load
    initApp();

    // Show Success Toast
    const toast = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("bottom", "20px")
      .style("left", "20px")
      .style("background", "rgba(0, 50, 0, 0.9)")
      .style("color", "#4ecca3")
      .style("padding", "15px 25px")
      .style("border", "1px solid #4ecca3")
      .style("border-radius", "5px")
      .style("font-family", "sans-serif")
      .style("z-index", "10000")
      .html("<strong>Dataset Loaded:</strong> data.json");

    setTimeout(() => {
      toast.transition().duration(1000).style("opacity", 0).remove();
    }, 3000);
  })
  .catch((error) => {
    console.error("Error loading data.json:", error);

    // Show Error on Screen
    d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("top", "50%")
      .style("left", "50%")
      .style("transform", "translate(-50%, -50%)")
      .style("background", "rgba(50, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "30px")
      .style("border", "2px solid red")
      .style("border-radius", "10px")
      .style("text-align", "center")
      .style("z-index", "9999").html(`
            <h2>Data Loading Failed</h2>
            <p>Could not load <code>data.json</code>. This is likely due to browser security restrictions (CORS) when opening files directly.</p>
            <hr style="border-color: #555;">
            <p><strong>Option 1:</strong> Use a Local Server (Recommended)</p>
            <ul style="text-align: left; opacity: 0.8;">
                <li>VS Code: Right-click index.html > "Open with Live Server"</li>
                <li>Python: <code>python -m http.server</code></li>
            </ul>
            <p><strong>Option 2:</strong> Re-enable <code>data.js</code> in index.html for local file support.</p>
            <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer; background: #444; color: white; border: none; margin-top: 10px;">Retry</button>
        `);
  });

// ─────────────────────────────────────
// FAMILY VIEW SWITCHING (ANCESTOR MODE)
// ─────────────────────────────────────

document.getElementById("my-family")?.addEventListener("click", () => {
  familyData = transformFamilyData(rawFamilyData);
  switchView(currentView); // re-render current view
});

document.getElementById("maternal-family")?.addEventListener("click", () => {
  const me = getMeFromRaw();
  if (!me || !me.mid) {
    alert("Maternal family not available");
    return;
  }

  familyData = transformFamilyData(rawFamilyData, me.mid);
  switchView(currentView);
});

document.getElementById("wife-family")?.addEventListener("click", () => {
  const me = getMeFromRaw();
  if (!me || !me.pids || !me.pids.length) {
    alert("Wife / external family not available");
    return;
  }

  familyData = transformFamilyData(rawFamilyData, me.pids[0]);
  switchView(currentView);
});

const switchToIndividualFamilyView = (targetView, targetId = null) => {
  // New Feature: Restricted Individual Family View
  // Centers on Target + Parents + Siblings + Wife + Kids

  // 1. Get Target (Focus)
  let targetNode;
  if (targetId) {
    const list = Array.isArray(rawFamilyData) ? rawFamilyData : (rawFamilyData.data || []);
    targetNode = list.find((m) => String(m.id) === String(targetId));
  } else {
    targetNode = getMeFromRaw();
  }

  if (!targetNode) {
    alert("Could not find the target user in the data.");
    return;
  }

  // 2. Transform Data
  // We use the new dedicated transformer function
  // Note: transformToIndividualFamily must be available globally from transform-api-data.js
  const newData = transformToIndividualFamily(rawFamilyData, targetNode.id);

  if (!newData) {
    alert("Failed to generate Individual Family view.");
    return;
  }

  familyData = newData;
  switchView(targetView || currentView);

  // Toast
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = "Showing: Individual Family Only";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0D8ABC",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "20px",
    zIndex: "10000",
    fontWeight: "bold",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

document
  .getElementById("individual-family")
  ?.addEventListener("click", () => switchToIndividualFamilyView());

// --- 9. Globe View Logic (D3 - Deprecated/Hidden) ---
function initD3Globe_Deprecated() {
  svg.selectAll("*").remove(); // Clear SVG
  svg.on(".zoom", null); // Clear global zoom if any

  // Re-create Groups (Order matters for layering)
  // 1. Set Background for Globe View (Space Galaxy)
  svg.style(
    "background",
    "radial-gradient(circle at center, #02111b 0%, #000000 100%)",
  );

  globeGroup = svg.append("g"); // Water + Graticules
  landGroup = svg.append("g"); // Landmasses (Countries)
  stateGroup = svg.append("g"); // States/Provinces
  riverGroup = svg.append("g"); // Rivers
  linkGroup = svg.append("g"); // Links

  // Cities should be above land/rivers but below nodes
  cityGroup = svg.append("g"); // Cities

  nodeGroup = svg.append("g"); // Family Nodes

  // Projection Setup
  projection = d3
    .geoOrthographic()
    .scale(300)
    .center([0, 0])
    .rotate([-70, -20])
    .translate([width / 2, height / 2]);

  path = d3.geoPath().projection(projection);
  const graticule = d3.geoGraticule();

  // Background Sphere (Water)
  globeGroup
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-water")
    .attr("d", path)
    .attr("fill", "#0077be") // Ocean Blue
    .attr("stroke", "#005E99")
    .attr("stroke-width", 1);

  // Graticules
  globeGroup
    .append("path")
    .datum(graticule)
    .attr("class", "globe-graticule")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.3)
    .attr("stroke-opacity", 0.2);

  // Initial Loading State
  const loadingText = svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "20px")
    .text("Loading Detailed Maps...");

  // Data Fetching
  if (
    globeData.countries &&
    globeData.states &&
    globeData.rivers &&
    globeData.cities
  ) {
    loadingText.remove();
    renderLayers();
    autoZoomToFamily();
  } else {
    Promise.all([
      // Countries (Base)
      d3.json(
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
      ),
      // States (Admin 1 - 10m)
      d3.json(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
      ),
      // Rivers (10m)
      d3.json(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson",
      ),
      // Cities (Populated Places - 10m)
      d3.json(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson",
      ),
    ])
      .then(([countries, states, rivers, cities]) => {
        globeData = { countries, states, rivers, cities };
        loadingText.remove();
        renderLayers();
        autoZoomToFamily();
      })
      .catch((err) => {
        console.error("Map load failed", err);
        loadingText.text("Failed to load maps.");
      });
  }

  function renderLayers() {
    // 1. Countries
    const countryFeatures = globeData.countries.features || globeData.countries;
    landGroup
      .selectAll(".globe-land")
      .data(countryFeatures)
      .enter()
      .append("path")
      .attr("class", "globe-land")
      .attr("d", path)
      .attr("fill", "#2d6a4f") // Earth Green
      .attr("stroke", "#40916c")
      .attr("stroke-width", 0.5);

    // Country Labels (Base Layer)
    landGroup
      .selectAll(".country-label")
      .data(countryFeatures)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("font-family", "sans-serif")
      .style("fill", "#fff")
      .style("opacity", 0.5)
      .style("pointer-events", "none")
      .text((d) => d.properties.name)
      .style("display", "none");

    // 2. States (Initially empty/hidden handled by updateGlobe, but we render DOM elements here)
    stateGroup
      .selectAll(".globe-state")
      .data(globeData.states.features)
      .enter()
      .append("path")
      .attr("class", "globe-state")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.3)
      .attr("stroke-opacity", 0.3)
      .style("display", "none"); // Hidden by default

    // 3. Rivers
    riverGroup
      .selectAll(".globe-river")
      .data(globeData.rivers.features)
      .enter()
      .append("path")
      .attr("class", "globe-river")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#4CC9F0") // River Blue
      .attr("stroke-width", 0.5)
      .style("display", "none"); // Hidden by default

    // 4. Cities
    // Filter to reasonable subset to avoid DOM explosion before culling loop
    // We'll render them all but hide them
    cityGroup
      .selectAll(".globe-city")
      .data(globeData.cities.features)
      .enter()
      .append("circle")
      .attr("class", "globe-city")
      .attr("r", 1) // Tiny dots
      .attr("fill", "#fff")
      .style("opacity", 0.8)
      .style("display", "none");

    cityGroup
      .selectAll(".city-label")
      .data(globeData.cities.features)
      .enter()
      .append("text")
      .attr("class", "city-label")
      .attr("text-anchor", "start")
      .attr("dx", 3)
      .attr("dy", 1)
      .style("font-size", "6px")
      .style("font-family", "sans-serif")
      .style("fill", "#ddd")
      .style("pointer-events", "none")
      .text((d) => d.properties.NAME)
      .style("display", "none");
  }

  // Process Hierarchy for Globe Nodes (On top of everything)
  const root = d3.hierarchy(familyData);
  const nodes = root.descendants();
  const links = root.links();

  // Links
  const linkElements = linkGroup
    .selectAll(".geo-link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "geo-link")
    .attr("fill", "none")
    .attr("stroke", "#FFD700")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  // Nodes
  const nodeElements = nodeGroup
    .selectAll(".geo-node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "geo-node")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      showModal(d);
    });

  nodeElements
    .append("circle")
    .attr("r", (d) => (d.data.isMe ? 8 : 6))
    .classed("heartbeat", (d) => d.data.isMe)
    .attr("fill", (d) => (d.data.isMe ? "#FFD700" : "#ff0000"))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  nodeElements
    .append("text")
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("fill", "white")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("text-shadow", "0 2px 4px black")
    .style("font-family", "sans-serif")
    .text((d) => d.data.name);

  // Update Function
  function updateGlobe() {
    if (!globeData.countries) return;

    const currentPath = d3.geoPath().projection(projection);
    const center = projection.invert([width / 2, height / 2]);
    const scale = projection.scale();

    // 1. Base Globe & Countries
    globeGroup.selectAll("path").attr("d", currentPath);

    if (landGroup.selectAll("path").size() > 0) {
      landGroup.selectAll("path").attr("d", currentPath);

      // Country Labels (Always calculate pos, visibility depends on angle)
      landGroup.selectAll(".country-label").each(function (d) {
        const el = d3.select(this);
        const centroid = d3.geoCentroid(d);
        const dist = d3.geoDistance(center, centroid);

        if (dist > 1.57) {
          el.style("display", "none");
        } else {
          const coords = projection(centroid);
          if (coords) {
            el.attr("transform", `translate(${coords[0]},${coords[1]})`);
            // Fade out countries when zoomed in to let Cities shine?
            // Keep them for context.
            el.style("display", "block");
          }
        }
      });
    }

    // 2. States (LOD: Scale > 400)
    if (stateGroup.selectAll("path").size() > 0) {
      if (scale > 400) {
        stateGroup
          .selectAll("path")
          .style("display", null) // Show
          .attr("d", currentPath);
      } else {
        stateGroup.selectAll("path").style("display", "none");
      }
    }

    // 3. Rivers (LOD: Scale > 800)
    if (riverGroup.selectAll("path").size() > 0) {
      if (scale > 800) {
        riverGroup
          .selectAll("path")
          .style("display", null)
          .attr("d", currentPath);
      } else {
        riverGroup.selectAll("path").style("display", "none");
      }
    }

    // 4. Cities (LOD: Scale > 1000)
    if (cityGroup.selectAll("circle").size() > 0) {
      if (scale > 1000) {
        cityGroup.selectAll(".globe-city").each(function (d) {
          const el = d3.select(this);
          // Points are easy: coords are in geometry
          const coords = d.geometry.coordinates;
          const dist = d3.geoDistance(center, coords);

          // Strict clipping + Zoom culling (hide small cities if not super zoomed?)
          // For now, just backface culling
          if (dist > 1.57) {
            el.style("display", "none");
          } else {
            const p = projection(coords);
            if (p) {
              el.attr("cx", p[0]).attr("cy", p[1]);
              el.style("display", "block");
            }
          }
        });

        cityGroup.selectAll(".city-label").each(function (d) {
          const el = d3.select(this);
          const coords = d.geometry.coordinates;
          const dist = d3.geoDistance(center, coords);

          if (dist > 1.57) {
            el.style("display", "none");
          } else {
            const p = projection(coords);
            if (p) {
              el.attr("x", p[0]).attr("y", p[1]);
              // Show label only if it's a major city OR very high zoom
              // d.properties.SCALERANK can help (lower is bigger)
              const rank = d.properties.SCALERANK || 10;
              if (scale > 3000 || rank < 3) {
                el.style("display", "block");
              } else {
                el.style("display", "none");
              }
            }
          }
        });
      } else {
        cityGroup.selectAll(".globe-city").style("display", "none");
        cityGroup.selectAll(".city-label").style("display", "none");
      }
    }

    // Nodes & Links (Always visible if front-facing)
    linkElements.attr("d", (d) => {
      const source = d.source.data.coords;
      const target = d.target.data.coords;
      return currentPath({
        type: "LineString",
        coordinates: [source, target],
      });
    });

    nodeElements.attr("transform", (d) => {
      const coords = projection(d.data.coords);
      return coords ? `translate(${coords[0]},${coords[1]})` : "translate(0,0)";
    });

    nodeElements.style("display", (d) => {
      const dist = d3.geoDistance(center, d.data.coords);
      return dist > 1.57 ? "none" : "block";
    });
  }

  // Interaction
  dragBehavior = d3.drag().on("drag", (event) => {
    const rotate = projection.rotate();
    const k = 75 / projection.scale();
    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
    updateGlobe();
  });

  zoomBehavior = d3
    .zoom()
    .scaleExtent([200, 10000]) // Allow SUPER deep zoom (10k)
    .on("zoom", (event) => {
      projection.scale(event.transform.k);
      updateGlobe();
    });

  svg.call(dragBehavior);
  svg
    .call(zoomBehavior)
    .call(zoomBehavior.transform, d3.zoomIdentity.scale(projection.scale()));

  // Zoom Controls Functionality
  d3.select("#zoom-in").on("click", () => {
    svg.transition().duration(500).call(zoomBehavior.scaleBy, 1.5);
  });

  d3.select("#zoom-out").on("click", () => {
    svg.transition().duration(500).call(zoomBehavior.scaleBy, 0.66);
  });

  function autoZoomToFamily() {
    // Collect all coordinates
    const coords = [];
    const traverse = (node) => {
      if (node.coords) coords.push(node.coords);
      if (node.children) node.children.forEach(traverse);
    };
    traverse(familyData);

    if (coords.length === 0) return;

    // Calculate Centroid
    const center = d3.geoCentroid({
      type: "MultiPoint",
      coordinates: coords,
    });

    // Rotate to center
    projection.rotate([-center[0], -center[1]]);

    // Super Zoom to show details!
    const targetScale = 2500; // Deep zoom to see cities
    projection.scale(targetScale);

    // Update view
    // Update view
    svg.call(zoomBehavior.transform, d3.zoomIdentity.scale(targetScale));
    updateGlobe();
  }
}

// ─────────────────────────────────────
// EXPORT VIEW (JPG / PDF)
// ─────────────────────────────────────

async function exportView(format) {
    const controls = document.getElementById('view-controls');
    const sidebar = document.getElementById('fan-member-sidebar');
    const toast = document.querySelector('.toast-notification');
    const memberList = document.getElementById('member-list');
    
    // 1. Prepare for capture: Hide UI elements
    const originalControlsDisplay = controls ? controls.style.display : '';
    const originalSidebarDisplay = sidebar ? sidebar.style.display : '';
    const originalToastDisplay = toast ? toast.style.display : '';

    if (controls) controls.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (toast) toast.style.display = 'none';

    const container = document.getElementById('tree-container');
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';
    const originalContainerOverflow = container ? container.style.overflow : '';
    if (container) container.style.overflow = 'visible';

    // Show a premium Processing Overlay
    let overlay = document.querySelector('.export-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'export-overlay';
        overlay.innerHTML = `
            <div class="export-spinner"></div>
            <div class="export-message">Generating ${format.toUpperCase()}...</div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.export-message').innerText = `Generating ${format.toUpperCase()}...`;
    }
    
    // Smooth fade in
    requestAnimationFrame(() => overlay.classList.add('active'));

    try {
        const svgElement = container ? container.querySelector('svg') : null;
        const globeContainer = document.getElementById('globe-container');
        let originalState = {};

        // 1. Specialized Preparation for Full View
        if (currentView === 'globe' && typeof myGlobe !== 'undefined') {
            // Store current POV
            originalState.pov = myGlobe.pointOfView();
            // Trigger auto-focus on family if possible
            // Note: autoZoomToFamily is local to initThreeGlobe, 
            // so we'll approximate a full view or hope it was already focused.
            // For now, we'll try to show the whole globe area.
            myGlobe.pointOfView({ lat: 0, lng: 0, alt: 2.5 }, 500);
            await new Promise(r => setTimeout(r, 600));
        } else if (svgElement) {
            const g = d3.select(svgElement).select('g');
            if (!g.empty()) {
                const bbox = g.node().getBBox();
                const padding = 80;
                
                originalState.width = svgElement.getAttribute('width');
                originalState.height = svgElement.getAttribute('height');
                originalState.viewBox = svgElement.getAttribute('viewBox');
                originalState.transform = g.attr('transform');
                originalState.scrollLeft = document.documentElement.scrollLeft;
                originalState.scrollTop = document.documentElement.scrollTop;

                // Expand SVG and shift content to (0,0)
                const fullW = bbox.width + padding * 2;
                const fullH = bbox.height + padding * 2;
                svgElement.setAttribute('width', fullW);
                svgElement.setAttribute('height', fullH);
                svgElement.removeAttribute('viewBox'); 
                g.attr('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);
                
                // Allow some time for layout updates
                await new Promise(r => setTimeout(r, 100));
            }
        }

        const captureWidth = svgElement ? parseFloat(svgElement.getAttribute('width')) : window.innerWidth;
        const captureHeight = svgElement ? parseFloat(svgElement.getAttribute('height')) : window.innerHeight;

        const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: false,
            logging: true,
            backgroundColor: null,
            scale: 1.5, // Adjust for quality vs performance
            width: captureWidth,
            height: captureHeight,
            windowWidth: captureWidth,
            windowHeight: captureHeight,
            ignoreElements: (el) => {
                return (el.id === 'download-controls' || el === procMsg || el.id === 'view-controls' || el.id === 'fan-member-sidebar');
            }
        });

        const imgData = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.90);
        const fileName = `family-tree-${currentView}-${new Date().toISOString().slice(0, 10)}`;

        if (format === 'jpg') {
            const link = document.createElement('a');
            link.download = `${fileName}.jpg`;
            link.href = imgData;
            link.click();
        } else if (format === 'png') {
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = imgData;
            link.click();
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${fileName}.pdf`);
        }
    } catch (err) {
        console.error("Export failed:", err);
        alert("An error occurred during export. Check console for details.");
    } finally {
        // 3. Restore UI first to ensure it reappears even if restoration fails
        const overlay = document.querySelector('.export-overlay');
        if (overlay) overlay.classList.remove('active');
        
        if (controls) controls.style.display = originalControlsDisplay;
        if (sidebar) sidebar.style.display = originalSidebarDisplay;
        if (toast) toast.style.display = originalToastDisplay;
        
        document.body.style.overflow = originalBodyOverflow;
        const container = document.getElementById('tree-container');
        if (container) container.style.overflow = originalContainerOverflow;

        // 4. Restore State
        try {
            if (currentView === 'globe' && typeof myGlobe !== 'undefined' && originalState.pov) {
                myGlobe.pointOfView(originalState.pov, 500);
            } else {
                const svgElement = document.querySelector('#tree-container svg');
                if (svgElement && originalState.width) {
                    svgElement.setAttribute('width', originalState.width);
                    svgElement.setAttribute('height', originalState.height);
                    if (originalState.viewBox) svgElement.setAttribute('viewBox', originalState.viewBox);
                    d3.select(svgElement).select('g').attr('transform', originalState.transform);
                    window.scrollTo(originalState.scrollLeft || 0, originalState.scrollTop || 0);
                }
            }
        } catch (restoreErr) {
            console.error("Restoration error:", restoreErr);
        }
    }
}

// Add event listeners for download buttons
document.addEventListener('DOMContentLoaded', () => {
    const jpgBtn = document.getElementById('download-jpg');
    const pngBtn = document.getElementById('download-png');
    const pdfBtn = document.getElementById('download-pdf');

    if (jpgBtn) {
        jpgBtn.addEventListener('click', () => exportView('jpg'));
    }
    if (pngBtn) {
        pngBtn.addEventListener('click', () => exportView('png'));
    }
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => exportView('pdf'));
    }

    // --- Theme Toggle Logic ---
    window.isDarkMode = localStorage.getItem("familyTreeTheme") !== "light";

    const applyTheme = () => {
        if (window.isDarkMode) {
            document.body.classList.remove("light-mode");
        } else {
            document.body.classList.add("light-mode");
        }
        const themeIcon = document.querySelector("#theme-toggle i");
        if (themeIcon) {
            themeIcon.className = window.isDarkMode ? "fa-solid fa-sun" : "fa-solid fa-moon";
            const themeBtn = document.getElementById("theme-toggle");
            if (themeBtn) themeBtn.title = window.isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode";
        }
    };

    applyTheme();

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            window.isDarkMode = !window.isDarkMode;
            localStorage.setItem("familyTreeTheme", window.isDarkMode ? "dark" : "light");
            applyTheme();

            // Re-render D3 views if active so they can optionally update layout-based backgrounds
            if (typeof currentView !== 'undefined' && (currentView === 'fan' || currentView === 'isometric')) {
                if (typeof switchView === "function") {
                    switchView(currentView);
                }
            }
        });
    }
});
