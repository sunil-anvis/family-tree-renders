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

// Global Dimensions (Updated dynamically on resize)
let width = window.innerWidth;
let height = window.innerHeight;

// Global Resize Listener
window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;

  // Update SVG attributes
  d3.select("#tree-container svg").attr("width", width).attr("height", height);

  // Re-render current view if active
  if (typeof currentView !== "undefined" && typeof switchView === "function") {
    switchView(currentView);
  }
});



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
        </div>
    </div>
`);
  modal
    .style("pointer-events", "all")
    .transition()
    .duration(200)
    .style("opacity", 1);
}

// Global variable to store current hierarchy root for tracing
let currentTreeRoot = null;

// State

window.currentView = "fan"; // 'fan', 'isometric' or 'pedigree'
let currentView = window.currentView;
let ancestorMode = false;
let fanHistory = []; // Stack for Fan View navigation history
let currentFanRootId = null; // Track current root ID for Fan View



// --- 4. Fan Chart Logic ---
function initFan(startNodeId = null) {
  svg.selectAll("*").remove();
  svg.on(".drag", null);
  svg.on(".zoom", null);

  // 3. Set Background for Fan View based on Theme
  const bgColor =
    typeof window.isDarkMode !== "undefined" && !window.isDarkMode
      ? "#ffffff"
      : "#171717";
  svg.style("background", bgColor);

  // 4. Responsive Radius Calculation
  // We use a base factor that leaves room for labels and buttons.
  // 0.4 ensures the diameter is 80% of the smallest screen dimension.
  const isMobile = width < 600;
  const radius = Math.min(width, height) * 0.4;

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
  const lightColors = ["#b5e2ff", "#ffa4c6", "#a6f6af", "#ffd1a4", "#dff2cd"];
  const darkColors = ["#4daee5", "#e26a97", "#59c864", "#dc9856", "#8eb170"];

  const genColors =
    typeof window.isDarkMode !== "undefined" && !window.isDarkMode
      ? lightColors
      : darkColors;
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
  // Use total subtree size (node count) as weight for a more accurate "busy-ness" metric
  fanRoot.sum(d => 1);

  // Override Layout
  // Assign x0, x1 (Angle) and y0, y1 (Radius)
  // Extend rings for depth 15
  const ringThickness = [80]; // Index 0 is the center circle radius
  for (let i = 1; i <= 15; i++) ringThickness.push(i <= 4 ? 80 : 60); // Decreasing thickness? Or constant.

  const depthStartRadius = [0];
  for (let i = 1; i < ringThickness.length; i++) {
    depthStartRadius[i] = depthStartRadius[i - 1] + ringThickness[i - 1];
  }

  // Angular Threshold Config
  const MIN_ANGLE_THRESHOLD = 0.08; // ~4.5 degrees. Segments smaller than this will be collapsed.

  const plusNodes = [];
  fanRoot.eachBefore((d) => {
    if (d.depth === 0) {
      d.x0 = 0;
      d.x1 = 2 * Math.PI;
      d.y0 = 0;
      d.y1 = ringThickness[0] - 5; // Center Circle Radius

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

      // Initialize Root's children angular range with weighted distribution
      if (d.children) {
        const range = d.x1 - d.x0;
        const totalValue = d3.sum(d.children, c => c.value);
        
        const SAFE_MIN_ANGLE = 0.08; 
        const childAngles = new Array(d.children.length);
        const fixedIndices = new Set();
        let remainingRange = range;
        let remainingValue = totalValue;

        // 1. Assign SAFE_MIN_ANGLE to any segment that would otherwise be too thin.
        let changed = true;
        while (changed) {
          changed = false;
          d.children.forEach((child, i) => {
            if (fixedIndices.has(i)) return;
            const proportionalAngle = (child.value / remainingValue) * remainingRange;
            if (proportionalAngle < SAFE_MIN_ANGLE) {
              childAngles[i] = SAFE_MIN_ANGLE;
              remainingRange -= SAFE_MIN_ANGLE;
              remainingValue -= child.value;
              fixedIndices.add(i);
              changed = true;
            }
          });
        }

        // 2. Distribute remaining range among those NOT fixed to min.
        if (fixedIndices.size < d.children.length) {
          d.children.forEach((child, i) => {
            if (!fixedIndices.has(i)) {
              childAngles[i] = (child.value / remainingValue) * remainingRange;
            }
          });
        } else {
          // --- FULL COVERAGE FIX ---
          const fairShare = range / d.children.length;
          d.children.forEach((child, i) => {
            childAngles[i] = fairShare;
          });
        }

        // 3. Final coordinate assignment
        let runningAngle = d.x0;
        d.children.forEach((child, i) => {
          const angle = childAngles[i];
          child.x0 = runningAngle;
          child.x1 = runningAngle + angle;
          runningAngle += angle;

          // Init Y for filter check
          const rStart = depthStartRadius[child.depth] || child.depth * 50;
          const rThick = ringThickness[child.depth] || 50;
          child.y0 = rStart + 6; // Increased radial spacing for premium look
          child.y1 = rStart + rThick - 6;
        });

        // --- SPACE FILLING ANCHOR ---
        if (d.children.length > 0) {
          d.children[d.children.length - 1].x1 = d.x1;
        }
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
      const totalValue = d3.sum(d.children, c => c.value);
      
      // SAFE_MIN_ANGLE: Must be larger than padAngle (0.02) to be visible.
      const SAFE_MIN_ANGLE = 0.08; 
      const totalNeededMin = d.children.length * SAFE_MIN_ANGLE;

      // --- THE ROBUST THRESHOLD CHECK ---
      // If parent arc is smaller than the minimum space needed for all children, collapse to "+".
      if (range < totalNeededMin || (range / d.children.length) < MIN_ANGLE_THRESHOLD) {
        d.hasHiddenChildren = true;
        d.children.forEach((c) => (c.isSystemHidden = true));

        const rStart = depthStartRadius[d.depth + 1] || (d.depth + 1) * 80;
        const rThick = 40; // Fixed thin height for button ring

        const plusNode = {
          data: { id: d.data.id, name: "+", isPlus: true },
          depth: d.depth + 1,
          x0: d.x0,
          x1: d.x1,
          y0: rStart - 4, // Extremely close to the block (2px gap)
          y1: rStart + 16,
          color: "#999999", 
          isPlusButton: true,
          parent: d,
        };
        plusNodes.push(plusNode);
      } else {
        // --- PROPORTIONAL MINIMAL SPACE ALGORITHM ---
        let remainingRange = range;
        let remainingValue = totalValue;
        
        const childAngles = new Array(d.children.length);
        const fixedIndices = new Set();

        // 1. Assign SAFE_MIN_ANGLE to any segment that would otherwise be too thin.
        let changed = true;
        while (changed) {
          changed = false;
          const currentAvgRange = remainingRange / (d.children.length - fixedIndices.size);
          
          d.children.forEach((child, i) => {
            if (fixedIndices.has(i)) return;
            
            const proportionalAngle = (child.value / remainingValue) * remainingRange;
            if (proportionalAngle < SAFE_MIN_ANGLE) {
              childAngles[i] = SAFE_MIN_ANGLE;
              remainingRange -= SAFE_MIN_ANGLE;
              remainingValue -= child.value;
              fixedIndices.add(i);
              changed = true;
            }
          });
        }

        // 2. Distribute remaining range among the bigger segments.
        if (fixedIndices.size < d.children.length) {
          d.children.forEach((child, i) => {
            if (!fixedIndices.has(i)) {
              childAngles[i] = (child.value / remainingValue) * remainingRange;
            }
          });
        } else {
          // --- FULL COVERAGE FIX ---
          const fairShare = range / d.children.length;
          d.children.forEach((child, i) => {
            childAngles[i] = fairShare;
          });
        }

        // 3. Final coordinate assignment
        let runningAngle = d.x0;
        d.children.forEach((child, i) => {
          const angle = childAngles[i];
          child.x0 = runningAngle;
          child.x1 = runningAngle + angle;
          runningAngle += angle;

          const rStart = depthStartRadius[child.depth];
          const rThick = ringThickness[child.depth];

          child.y0 = rStart + 6; // Increased radial spacing for premium look
          child.y1 = rStart + rThick - 6;
        });

        // --- SPACE FILLING ANCHOR ---
        if (d.children.length > 0) {
          d.children[d.children.length - 1].x1 = d.x1;
        }
      }
    }
  });

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1)
    .padAngle(0.005) 
    .cornerRadius(8);   // --- 3D Scene Setup (Smooth Version) ---
  const scene = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const fanGroup = scene
    .append("g")
    .attr("class", "fan-3d-container");

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

  const TOTAL_DEPTH = 12; // Total pixels of visual thickness
  const NUM_LAYERS = 24;  // Extreme density for perfectly smooth vertical walls
  const Y_STEP = 0.5;     // 0.5px shift per layer

  // 1. Solid Side Walls (Vertical Extrusion for all-around coverage)
  const depthLayer = fanGroup.append("g").attr("class", "fan-depth-layers");

  for (let i = 0; i < NUM_LAYERS; i++) {
    const yOffset = (NUM_LAYERS - i) * Y_STEP;
    
    depthLayer
      .selectAll(`.fan-segment-depth-${i}`)
      .data(finalRenderNodes)
      .enter()
      .filter((d) => !d.isPlusButton) // EXCLUDE plus buttons from 3D depth
      .append("path")
      .attr("class", `fan-segment-depth-${i}`)
      .attr("transform", `translate(0, ${yOffset})`)
      .attr("d", arc) 
      .style("fill", (d) => {
          return d3.color(d.color || "#ccc").darker(1.2).hex();
      })
      .style("stroke", function() { return d3.select(this).style("fill"); })
      .style("stroke-width", "1.5px") 
      .style("opacity", (d) => ((d.x1 - d.x0) < 0.04 ? 0 : 1));
  }

  // 2. Top Faces
  const topLayer = fanGroup.append("g").attr("class", "fan-top-layer");

  const topPaths = topLayer
    .selectAll(".fan-segment")
    .data(finalRenderNodes)
    .enter()
    .append("path")
    .attr("class", "fan-segment")
    .attr("d", (d) => {
      if (d.isPlusButton) {
        const midAngle = (d.x0 + d.x1) / 2;
        const r = (d.y0 + d.y1) / 2;
        const size = 20; 
        const angularWidth = size / r;
        return d3.arc()({
          startAngle: midAngle - angularWidth / 2,
          endAngle: midAngle + angularWidth / 2,
          innerRadius: r - size / 2,
          outerRadius: r + size / 2,
          padAngle: 0,
          cornerRadius: 15
        });
      }
      return arc(d);
    })
    .style("fill", (d) => {
        if (d.isPlusButton) {
          const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
          return isLightMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"; // Subtle background for plus icon
        }
        return d.color || "#ccc";
    })
    .style("stroke", "none") // No stroke for regular blocks OR plus background
    .style("stroke-width", "0px")
    .style("filter", (d) => d.isPlusButton ? null : null)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      if (d.isPlusButton) {
        if (currentFanRootId) fanHistory.push(currentFanRootId);
        initFan(d.data.id);
      } else {
        showModal(d);
      }
    })
    .on("mouseover", function (event, d) {
      if (d.isPlusButton) {
        const midAngle = (d.x0 + d.x1) / 2;
        const r = (d.y0 + d.y1) / 2;
        const cx = r * Math.sin(midAngle);
        const cy = -r * Math.cos(midAngle);
        
        d3.select(this)
          .transition().duration(200)
          .style("filter", "drop-shadow(0px 4px 8px rgba(0,0,0,0.3))")
          .attr("transform", `translate(${cx}, ${cy}) scale(1.1) translate(${-cx}, ${-cy})`);
      } else {
        d3.select(this)
          .transition().duration(200)
          .style("filter", "brightness(1.1)");
      }
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .transition().duration(200)
        .style("filter", d.isPlusButton ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))" : null)
        .attr("transform", "translate(0,0) scale(1)");
    });


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
      const angle = d.x1 - d.x0;
      const isSlanted = angle < 0.2; 
      const baseRotate = deg - 90;

      if (isSlanted) {
        // --- SLANTED (RADIAL) MODE for thin blocks ---
        rotate = baseRotate;
        if (deg > 90 && deg < 270) rotate += 180;
      } else {
        // --- TANGENTIAL (HORIZONTAL) MODE for wider blocks ---
        rotate = baseRotate + 90;
        if (deg > 90 && deg < 270) rotate += 180;
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
      const meNameSize = isMobile ? "12px" : "14px";
      el.append("text")
        .text(d.data.name)
        .attr("y", 0)
        .attr("dominant-baseline", "central")
        .attr("dy", 0)
        .style("font-size", meNameSize)
        .style("font-weight", "bold")
        .call(wrap, isMobile ? 80 : 100);

      // Relation — strip parenthetical detail e.g. "Brother-in-law (Sister's Husband)" → "Brother-in-law"
      // Relation text removed to simplify fan block view
      return;
    }

    // Expand Button Icon (SVG Path for a cleaner look)
    if (d.isPlusButton) {
      el.attr("transform", function () {
        const midAngle = (d.x0 + d.x1) / 2;
        const r = (d.y0 + d.y1) / 2;
        const cx = r * Math.sin(midAngle);
        const cy = -r * Math.cos(midAngle);
        return `translate(${cx}, ${cy})`;
      });

      // Draw a better '+' icon using two white lines
      const crossSize = d.x1 - d.x0 < 0.15 ? 4 : 6;
      
      el.append("line")
        .attr("x1", -crossSize).attr("y1", 0)
        .attr("x2", crossSize).attr("y2", 0)
        .attr("stroke", () => {
            const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
            return isLightMode ? "#555" : "white";
        })
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");
        
      el.append("line")
        .attr("x1", 0).attr("y1", -crossSize)
        .attr("x2", 0).attr("y2", crossSize)
        .attr("stroke", () => {
            const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
            return isLightMode ? "#555" : "white";
        })
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");
        
      return;
    }

    // --- LABEL DYNAMIC FITTING ---
    const angle = d.x1 - d.x0;
    const isSlanted = angle < 0.2;
    const midRadius = (d.y0 + d.y1) / 2;
    const arcLengthPixels = angle * midRadius;
    const radialThickness = d.y1 - d.y0;

    const availableWidth = isSlanted ? radialThickness : arcLengthPixels;

    // Standard Font Selection
    let primaryFontSize = isMobile ? 6 : 8;
    if (angle < 0.25) primaryFontSize = isMobile ? 5 : 7;
    if (angle < 0.15) primaryFontSize = isMobile ? 4.5 : 6;

    // Helper: Fitting Check
    const name = d.data.name || "";
    const nameWidth = name.length * primaryFontSize * 0.55;

    // If name is too wide for one line, try splitting it (ONLY for wide tangential labels)
    const parts = name.split(/\s+/);
    const useTwoLines = !isSlanted && nameWidth > arcLengthPixels && parts.length > 1;

    // ABSOLUTE VISIBILITY CHECK: Only hide if it's physically impossible to fit
    if (arcLengthPixels < 12 && d.depth > 1) return;

    el.attr("text-anchor", "middle")
      .attr("dominant-baseline", "central") // Perfectly center the text label
      .style("font-family", "sans-serif")
      .style("fill", "#000");

    if (useTwoLines) {
      // Top Half
      const topName = parts.slice(0, Math.ceil(parts.length/2)).join(" ");
      const bottomName = parts.slice(Math.ceil(parts.length/2)).join(" ");
      
      el.append("text")
        .text(topName)
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .attr("y", -primaryFontSize * 0.45)
        .style("font-size", primaryFontSize + "px")
        .style("font-weight", "bold");

      el.append("text")
        .text(bottomName)
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .attr("y", primaryFontSize * 0.45)
        .style("font-size", (primaryFontSize * 0.9) + "px");
    } else {
      // Single Line (Default)
      const textEl = el.append("text")
        .text(name)
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .style("font-size", primaryFontSize + "px")
        .style("font-weight", "bold");

      // Auto-truncate if still overflowing single line (respect radial height for slanted labels)
      if (nameWidth > availableWidth) {
        const maxChars = Math.floor(availableWidth / (primaryFontSize * 0.6));
        if (maxChars > 3) {
          textEl.text(name.slice(0, maxChars - 1) + "..");
        } else {
          textEl.text(""); // Hide if zero space
        }
      }
    }

    // Relation hidden as per request (can be seen in card)
  });

  // Zoom Logic
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      scene.attr("transform", event.transform);
    });

  // Initial Transform: Dynamic "Fit to Viewport" Scale
  // Calculate the actual maximum radius of the fan based on the rendered depth
  const maxDepth = fanRoot.height;
  const maxActualRadius = depthStartRadius[maxDepth] + (ringThickness[maxDepth] || 60);
  
  const screenMin = Math.min(width, height);
  const isTablet = width >= 600 && width <= 1024;
  
  // Determine a safe margin - more generous on mobile/tablet
  const margin = (isMobile || isTablet) ? 0.85 : 0.9;
  
  // Calculate scale: s * (2 * maxActualRadius) = screenMin * margin
  let initialScale = (screenMin * margin) / (2 * maxActualRadius);

  // Cap the scale so it doesn't get too large for small trees, 
  // but allow it to be very small for deep trees to ensure full visibility.
  if (initialScale > 1.2) initialScale = 1.2;
  if (initialScale < 0.2) initialScale = 0.2; // Absolute minimum to avoid dot-sized tree

  const initialTransform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale);

  svg.call(zoom).call(zoom.transform, initialTransform);

  // --- HTML Nav Button State Sync ---
  updateFanNavButtons();
}

// Keep Back button enabled/disabled based on history depth
function updateFanNavButtons() {
  const hasHistory = fanHistory.length > 0;
  
  // Also enable Reset if we are simply not at the default root anymore (even without history)
  const me = getMeFromRaw();
  const isDefaultRoot = !currentFanRootId || (me && String(currentFanRootId) === String(me.id));
  const canReset = hasHistory || !isDefaultRoot;

  ["mobile", "desktop"].forEach((suffix) => {
    const backBtn = document.getElementById(`fan-back-btn-${suffix}`);
    const resetBtn = document.getElementById(`fan-reset-btn-${suffix}`);
    if (backBtn) backBtn.disabled = !hasHistory;
    if (resetBtn) resetBtn.disabled = !canReset;
  });
}

// Wire up Back & Reset buttons (called once on page load)
(function setupFanNavButtons() {
  ["mobile", "desktop"].forEach((suffix) => {
    const backBtn = document.getElementById(`fan-back-btn-${suffix}`);
    const resetBtn = document.getElementById(`fan-reset-btn-${suffix}`);

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (fanHistory.length > 0) {
          const prevId = fanHistory.pop();
          initFan(prevId);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        fanHistory = [];
        initFan();
      });
    }
  });
})();

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
  window.currentView = view;

  // Close mobile drawer when user changes view, to keep screen clean.
  document.body.classList.remove("mobile-drawer-open");

  // 1. Globe Cleanup (Always try to close/hide Three.js first)
  try {
    if (typeof closeThreeGlobe === "function") closeThreeGlobe();
    if (typeof closeTrue3D === "function") closeTrue3D(); // [NEW] Cleanup True 3D
  } catch (e) {
    console.error("Error closing globe/3D:", e);
  }

  // 2. Default: Show D3 SVG (Fan, Tree, Vert, Iso all use D3 SVG)
  // Globe/Real3D View will hide it specifically.
  const svgEl = document.querySelector("#tree-container svg");
  if (svgEl) {
    svgEl.style.display = view === "real3d" ? "none" : "block";
  }

  // 3. UI Controls - Member Sidebar (Desktop & Mobile)
  const fanControls = document.querySelectorAll(".fan-controls-group");
  const isoControls = document.querySelectorAll(".iso-controls-group");
  const real3dControls = document.querySelectorAll(".real3d-controls-group");
  const fanSidebarMobile = document.getElementById("fan-member-sidebar");
  const fanSidebarDesktop = document.getElementById(
    "fan-member-sidebar-desktop",
  );

  if (view === "fan" || view === "isometric" || view === "real3d") {
    if (view === "fan") {
      fanControls.forEach((el) => (el.style.display = "flex"));
      isoControls.forEach((el) => (el.style.display = "none"));
      real3dControls.forEach((el) => (el.style.display = "none"));
    } else if (view === "isometric") {
      isoControls.forEach((el) => (el.style.display = "flex"));
      fanControls.forEach((el) => (el.style.display = "none"));
      real3dControls.forEach((el) => (el.style.display = "none"));
    } else if (view === "real3d") {
      real3dControls.forEach((el) => (el.style.display = "flex"));
      isoControls.forEach((el) => (el.style.display = "none"));
      fanControls.forEach((el) => (el.style.display = "none"));
    }

    if (fanSidebarMobile) fanSidebarMobile.style.display = "flex";
    if (fanSidebarDesktop) fanSidebarDesktop.style.display = "flex";
    populateMemberList();
  } else {
    // Hide Fan UI by default for other views
    fanControls.forEach((el) => (el.style.display = "none"));
    isoControls.forEach((el) => (el.style.display = "none"));
    real3dControls.forEach((el) => (el.style.display = "none"));
    if (fanSidebarMobile) fanSidebarMobile.style.display = "none";
    if (fanSidebarDesktop) fanSidebarDesktop.style.display = "none";
  }

  // 4. View Initialization
  if (view === "fan") {
    initFan();
  } else if (view === "isometric") {
    // Filter 3D view to only show Root, Parents, Siblings, and Children
    const focusId =
      typeof currentFanRootId !== "undefined" && currentFanRootId
        ? currentFanRootId
        : null;
    console.log(`[SwitchView] Applying 3D focal filter for ID: ${focusId}`);
    const filtered = transformToIndividualFamilyTree(rawFamilyData, focusId);
    if (filtered) {
      familyData = filtered;
    }
    init3DTree();
  } else if (view === "pedigree") {
    // Pedigree should also respect focus
    if (typeof currentFanRootId !== "undefined" && currentFanRootId) {
      familyData = transformFamilyData(rawFamilyData, currentFanRootId, true);
    }
    initPedigreeView();
  } else if (view === "real3d") {
    // Pass current focus if set
    initReal3DView(typeof currentFanRootId !== "undefined" ? currentFanRootId : null);
  }
}

// View Button Click Listeners
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // 1. Update UI (Active State)
    document
      .querySelectorAll(".view-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // 2. Switch View
    const selectedView = btn.dataset.view;
    console.log("Switching to view:", selectedView);
    switchView(selectedView);
  });
});

// Checkbox Listener
// Checkbox Listener (Sync both mobile and desktop toggles)
document.querySelectorAll(".ancestor-mode-toggle").forEach((toggle) => {
  toggle.addEventListener("change", (e) => {
    ancestorMode = e.target.checked;

    // Sync other toggles
    document.querySelectorAll(".ancestor-mode-toggle").forEach((t) => {
      if (t !== e.target) t.checked = ancestorMode;
    });

    if (currentView === "fan") initFan();
  });
});

// Member Sidebar Logic
let selectedMember = null;

function showMemberOptionsModal(member) {
  selectedMember = member;

  const modal = document.getElementById("member-options-modal");
  document.getElementById("member-options-name").textContent =
    member.name || "Unknown";
  document.getElementById("member-options-relation").textContent =
    member.relation || "";
  document.getElementById("member-options-photo").src =
    member.photo ||
    "https://api.kintree.com/kintree-assets/images/default-avatars/" +
      (member.gender === "f" ? "female.png" : "male.png");

  modal.classList.add("active");
}

function closeMemberOptionsModal() {
  const modal = document.getElementById("member-options-modal");
  modal.classList.remove("active");
  selectedMember = null;
}

function populateMemberList() {
  const containers = document.querySelectorAll(".member-list-container");
  if (containers.length === 0 || !rawFamilyData) return;

  // Avoid multiple populations if called quickly (though d3 or list is small)
  containers.forEach((container) => (container.innerHTML = ""));

  const list = Array.isArray(rawFamilyData)
    ? rawFamilyData
    : rawFamilyData.data || [];
  console.log(
    "Populating member list. Total members in raw data:",
    list.length,
  );

  // Sort by name (handling null/undefined)
  const sortedList = [...list].sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";
    return nameA.localeCompare(nameB);
  });
  // Clean all containers
  containers.forEach((container) => (container.innerHTML = ""));

  sortedList.forEach((member) => {
    const item = document.createElement("div");
    item.className = "member-item";
    item.dataset.id = member.id;
    item.innerHTML = `
      <img src="${member.photo || "https://api.kintree.com/kintree-assets/images/default-avatars/" + (member.gender === "f" ? "female.png" : "male.png")}" alt="${member.name || "Unknown"}">
      <div class="member-item-info">
        <span class="member-item-name">${member.name || "Unknown"}</span>
        <span class="member-item-relation">${(member.relation || "").replace(/\s*\(.*?\)\s*/g, "").trim()}</span>
      </div>
    `;
    containers.forEach((container) => {
      const clone = item.cloneNode(true);
      clone.addEventListener("click", () => {
        showMemberOptionsModal(member);
      });
      container.appendChild(clone);
    });
  });
}

function filterMemberList(query) {
  const items = document.querySelectorAll(".member-item");
  const q = query.toLowerCase();
  items.forEach((item) => {
    const name = item
      .querySelector(".member-item-name")
      .textContent.toLowerCase();
    const relation = item
      .querySelector(".member-item-relation")
      .textContent.toLowerCase();
    if (name.includes(q) || relation.includes(q)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

document.querySelectorAll(".member-search-input").forEach((input) => {
  input.addEventListener("input", (e) => {
    filterMemberList(e.target.value);
  });
});

// Member Options Modal Listeners
document
  .querySelector(".modal-close-btn")
  ?.addEventListener("click", closeMemberOptionsModal);
document
  .getElementById("member-options-modal")
  ?.addEventListener("click", (e) => {
    if (e.target.id === "member-options-modal") {
      closeMemberOptionsModal();
    }
  });

document.getElementById("view-details-btn")?.addEventListener("click", () => {
  if (selectedMember) {
    // Populate the modal with member details
    modalBody.html(`
      <div class="modal-profile">
          <img src="${selectedMember.photo || "https://api.kintree.com/kintree-assets/images/default-avatars/" + (selectedMember.gender === "f" ? "female.png" : "male.png")}" alt="${selectedMember.name}" class="modal-image">
          
          <div class="modal-content-wrapper">
              <h2 class="modal-name">${selectedMember.name || "Unknown"}</h2>
              <p class="modal-info">
                  ${selectedMember.relation || "N/A"} <span style="color:var(--neon-cyan)">•</span> 
                  ${selectedMember.size ? "Family Size: " + selectedMember.size : selectedMember.age ? selectedMember.age + " years" : "Age N/A"} 
                  <span style="color:var(--neon-cyan)">•</span> ${selectedMember.gender === "m" ? "Male" : selectedMember.gender === "f" ? "Female" : "N/A"}
                  <span style="color:var(--neon-cyan)">•</span> ${selectedMember.location || "Location N/A"}
              </p>
              
              <div class="modal-details">
                  <div class="detail-row">
                      <span class="detail-label">Born:</span>
                      <span class="detail-value">${selectedMember.birth_date || "N/A"}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Died:</span>
                      <span class="detail-value">${selectedMember.death_date || "N/A"}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Occupation:</span>
                      <span class="detail-value">${selectedMember.occupation || "N/A"}</span>
                  </div>
              </div>
          </div>
      </div>
    `);

    // CAPTURE DATA FIRST before closing modal resets selectedMember
    const memberData = { ...selectedMember };
    closeMemberOptionsModal();
    showModal({ data: memberData });
  }
});

document.getElementById("view-tree-btn")?.addEventListener("click", () => {
  if (selectedMember) {
    // CAPTURE DATA FIRST
    const memberId = selectedMember.id;

    closeMemberOptionsModal();

    // Close mobile drawer first
    document.body.classList.remove("mobile-drawer-open");

    // Switch to their tree view - Force them to be the root
    console.log("Re-rooting tree on:", memberId);
    switchToIndividualFamilyView(currentView, memberId, true);
  }
});

// Button Listeners - View Buttons (work for both desktop and mobile)
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const view = e.currentTarget.dataset.view;

    // Update Buttons UI for all view buttons
    document
      .querySelectorAll(".view-btn")
      .forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    if (view === "isometric") {
      switchToIndividualFamilyView(view);
    } else {
      switchView(view);
    }
  });
});

// Focus/Filter functions for family views
const switchToMyFamilyView = () => {
  document
    .querySelectorAll(".focus-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("my-family")?.classList.add("active");
  if (currentView === "fan") {
    initFan();
  } else {
    switchView(currentView);
  }
};

const switchToMaternalView = () => {
  document
    .querySelectorAll(".focus-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("maternal-family")?.classList.add("active");
  if (currentView === "fan") {
    initFan();
  } else {
    switchView(currentView);
  }
};

const switchToWifeView = () => {
  document
    .querySelectorAll(".focus-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("wife-family")?.classList.add("active");
  if (currentView === "fan") {
    initFan();
  } else {
    switchView(currentView);
  }
};

const switchToIndividualView = () => {
  document
    .querySelectorAll(".focus-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("individual-family")?.classList.add("active");
  switchToIndividualFamilyView(currentView);
};

// Focus Buttons - Desktop version (by ID)
document.getElementById("my-family")?.addEventListener("click", () => {
  switchToMyFamilyView();
});

document.getElementById("maternal-family")?.addEventListener("click", () => {
  switchToMaternalView();
});

document.getElementById("wife-family")?.addEventListener("click", () => {
  switchToWifeView();
});

document.getElementById("individual-family")?.addEventListener("click", () => {
  switchToIndividualView();
});

// Focus Buttons - Mobile version (by class)
document.querySelector(".my-family")?.addEventListener("click", () => {
  switchToMyFamilyView();
});

document.querySelector(".maternal-family")?.addEventListener("click", () => {
  switchToMaternalView();
});

document.querySelector(".wife-family")?.addEventListener("click", () => {
  switchToWifeView();
});

document.querySelector(".individual-family")?.addEventListener("click", () => {
  switchToIndividualView();
});

// Mobile menu toggles
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileDrawerOverlay = document.getElementById("mobile-drawer-overlay");
const mobileDrawerClose = document.querySelector(".mobile-drawer-close");

function closeMobileDrawer() {
  document.body.classList.remove("mobile-drawer-open");
}

function openMobileDrawer() {
  document.body.classList.add("mobile-drawer-open");
}

mobileMenuBtn?.addEventListener("click", () => {
  if (document.body.classList.contains("mobile-drawer-open")) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
});

mobileDrawerOverlay?.addEventListener("click", closeMobileDrawer);
mobileDrawerClose?.addEventListener("click", closeMobileDrawer);

// Resize Listener
window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);

  if (currentView === "fan") {
    initFan();
  } else if (currentView === "pedigree") {
    initPedigreeView();
  } else if (currentView === "isometric") {
    init3DTree();
  }
});

// Initial Load
// Initial Load removed, handled by initApp after data load

// --- 7. Re-Rooting Logic ---
window.reRootTree = function (targetId) {
  if (!rawFamilyData) {
    console.error("No raw data available for re-rooting");
    return;
  }

  console.log("Re-rooting tree on:", targetId);

  // Transform data focusing on targetId - Force them to be the root
  familyData = transformFamilyData(rawFamilyData, targetId, true);

  if (!familyData) {
    console.error("Failed to re-transform data");
    return;
  }

  // Re-render current view (Vertical Tree usually)
  if (currentView === "fan") {
    initFan(String(targetId));
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

    // --- FALLBACK TO STATIC DATA (Local File Support) ---
    if (typeof staticFamilyData !== "undefined") {
      console.log("Using static data fallback from data.js");
      rawFamilyData = staticFamilyData.data || staticFamilyData;
      familyData = transformFamilyData(staticFamilyData);

      if (familyData) {
        populateMemberList();
        initApp();

        // Show Fallback Success Toast
        const toast = d3
          .select("body")
          .append("div")
          .style("position", "fixed")
          .style("bottom", "20px")
          .style("left", "20px")
          .style("background", "rgba(50, 50, 0, 0.9)")
          .style("color", "#FFD700")
          .style("padding", "15px 25px")
          .style("border", "1px solid #FFD700")
          .style("border-radius", "5px")
          .style("font-family", "sans-serif")
          .style("z-index", "10000")
          .html("<strong>Dataset Loaded:</strong> data.js (Local Fallback)");

        setTimeout(() => {
          toast.transition().duration(1000).style("opacity", 0).remove();
        }, 3000);
        return; // Success, skip error message
      }
    }

    // Show Error on Screen if no fallback available
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
  currentFanRootId = null; // Reset focal ID to default (Myself)
  familyData = transformFamilyData(rawFamilyData);
  switchView(currentView); // re-render current view
});

document.getElementById("maternal-family")?.addEventListener("click", () => {
  const me = getMeFromRaw();
  if (!me || !me.mid) {
    alert("Maternal family not available");
    return;
  }

  currentFanRootId = String(me.mid); // Update focal ID
  familyData = transformFamilyData(rawFamilyData, me.mid);
  switchView(currentView);
});

document.getElementById("wife-family")?.addEventListener("click", () => {
  const me = getMeFromRaw();
  if (!me || !me.pids || !me.pids.length) {
    alert("Wife / external family not available");
    return;
  }

  currentFanRootId = String(me.pids[0]); // Update focal ID
  familyData = transformFamilyData(rawFamilyData, me.pids[0]);
  switchView(currentView);
});

const switchToIndividualFamilyView = (
  targetView,
  targetId = null,
  rootAtFocus = false,
) => {
  // New Feature: Restricted Individual Family View
  // Centers on Target + Parents + Siblings + Wife + Kids

  // 1. Get Target (Focus)
  let targetNode;
  if (targetId) {
    const list = Array.isArray(rawFamilyData)
      ? rawFamilyData
      : rawFamilyData.data || [];
    targetNode = list.find((m) => String(m.id) === String(targetId));
  } else {
    targetNode = getMeFromRaw();
  }

  if (!targetNode) {
    console.error(
      "Could not find target user. ID:",
      targetId,
      "Available IDs:",
      Array.isArray(rawFamilyData)
        ? rawFamilyData.map((m) => m.id)
        : (rawFamilyData.data || []).map((m) => m.id),
    );
    alert("Could not find the target user in the data.");
    return;
  }

  // 2. Transform Data
  // If targetId is provided and we want to root at focus, use the full raw background data
  // but specify the focus and rootAtFocus flag.
  // Otherwise, use the filtered "Individual Family" view.

  if (targetId && rootAtFocus) {
    // Re-root without strict filtering
    familyData = transformFamilyData(rawFamilyData, targetId, true);
  } else {
    // Individual Family Filter (Parents + Siblings + Spouse + Kids)
    const newData = transformToIndividualFamily(rawFamilyData, targetNode.id);
    if (!newData) {
      console.error(
        "Failed to generate Individual Family view for ID:",
        targetNode.id,
      );
      alert("Failed to generate Individual Family view.");
      return;
    }
    // Note: We intentionally DO NOT overwrite the global rawFamilyData here
    // to preserve the full graph for views that need it (like Fan View).
    familyData = transformFamilyData(newData);
  }

  if (!familyData) {
    console.error("Failed to generate family data structure.");
    return;
  }

  // 4. Switch to the target view with the filtered data
  // Track this ID globally so it persists across view transitions
  // Ensure we use the validated ID from targetNode
  currentFanRootId = String(targetNode.id);

  if (targetView === "fan") {
    initFan(currentFanRootId);
  } else {
    // For other views (isometric, vertical, etc.), switchView will consume currentFanRootId
    switchView(targetView);
  }

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
  const uiSelectors = [
    ".mobile-menu-btn",
    ".mobile-drawer-header",
    ".mobile-drawer-container",
    ".control-panel",
    ".member-sidebar",
    ".toast-notification",
    ".member-options-modal",
    "#mobile-drawer-overlay",
  ];

  const hiddenElements = [];
  uiSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.style.display !== "none") {
        hiddenElements.push({ el, originalDisplay: el.style.display });
        el.style.display = "none";
      }
    });
  });

  const container = document.getElementById("tree-container");
  const originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "visible";
  const originalContainerOverflow = container ? container.style.overflow : "";
  if (container) container.style.overflow = "visible";

  // Show a premium Processing Overlay
  let overlay = document.querySelector(".export-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "export-overlay";
    overlay.innerHTML = `
            <div class="export-spinner"></div>
            <div class="export-message">Generating ${format.toUpperCase()}...</div>
        `;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector(".export-message").innerText =
      `Generating ${format.toUpperCase()}...`;
  }

  // Smooth fade in
  requestAnimationFrame(() => overlay.classList.add("active"));

  let originalState = {};

  try {
    const svgElement = container ? container.querySelector("svg") : null;
    const globeContainer = document.getElementById("globe-container");

    // 1. Specialized Preparation for Full View
    if (currentView === "globe" && typeof myGlobe !== "undefined") {
      // Store current POV
      originalState.pov = myGlobe.pointOfView();
      // Trigger auto-focus on family if possible
      // Note: autoZoomToFamily is local to initThreeGlobe,
      // so we'll approximate a full view or hope it was already focused.
      // For now, we'll try to show the whole globe area.
      myGlobe.pointOfView({ lat: 0, lng: 0, alt: 2.5 }, 500);
      await new Promise((r) => setTimeout(r, 600));
    } else if (svgElement) {
      const g = d3.select(svgElement).select("g");
      if (!g.empty()) {
        const bbox = g.node().getBBox();
        const padding = 80;

        originalState.width = svgElement.getAttribute("width");
        originalState.height = svgElement.getAttribute("height");
        originalState.viewBox = svgElement.getAttribute("viewBox");
        originalState.transform = g.attr("transform");
        originalState.scrollLeft = document.documentElement.scrollLeft;
        originalState.scrollTop = document.documentElement.scrollTop;

        // Expand SVG and shift content to (0,0)
        const fullW = bbox.width + padding * 2;
        const fullH = bbox.height + padding * 2;
        svgElement.setAttribute("width", fullW);
        svgElement.setAttribute("height", fullH);
        svgElement.removeAttribute("viewBox");
        g.attr(
          "transform",
          `translate(${-bbox.x + padding}, ${-bbox.y + padding})`,
        );

        // Allow some time for layout updates
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const captureWidth = svgElement
      ? parseFloat(svgElement.getAttribute("width"))
      : window.innerWidth;
    const captureHeight = svgElement
      ? parseFloat(svgElement.getAttribute("height"))
      : window.innerHeight;

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
        // Ensure UI, processing message, and modals are not captured
        return (
          el.classList.contains("control-panel") ||
          el.classList.contains("member-sidebar") ||
          el.classList.contains("mobile-menu-btn") ||
          el.classList.contains("export-overlay") ||
          el.classList.contains("member-options-modal") ||
          el.id === "download-controls" ||
          el === overlay
        );
      },
    });

    const imgData = canvas.toDataURL(
      format === "png" ? "image/png" : "image/jpeg",
      0.9,
    );
    const fileName = `family-tree-${currentView}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "jpg") {
      const link = document.createElement("a");
      link.download = `${fileName}.jpg`;
      link.href = imgData;
      link.click();
    } else if (format === "png") {
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = imgData;
      link.click();
    } else if (format === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "l" : "p",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName}.pdf`);
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert("An error occurred during export. Check console for details.");
  } finally {
    // 3. Restore UI first to ensure it reappears even if restoration fails
    // 3. Restore UI first to ensure it reappears even if restoration fails
    const exportOverlay = document.querySelector(".export-overlay");
    if (exportOverlay) exportOverlay.classList.remove("active");

    hiddenElements.forEach(({ el, originalDisplay }) => {
      el.style.display = originalDisplay;
    });

    document.body.style.overflow = originalBodyOverflow;
    const container = document.getElementById("tree-container");
    if (container) container.style.overflow = originalContainerOverflow;

    // 4. Restore State
    try {
      if (
        currentView === "globe" &&
        typeof myGlobe !== "undefined" &&
        originalState.pov
      ) {
        myGlobe.pointOfView(originalState.pov, 500);
      } else {
        const svgElement = document.querySelector("#tree-container svg");
        if (svgElement && originalState.width) {
          svgElement.setAttribute("width", originalState.width);
          svgElement.setAttribute("height", originalState.height);
          if (originalState.viewBox)
            svgElement.setAttribute("viewBox", originalState.viewBox);
          d3.select(svgElement)
            .select("g")
            .attr("transform", originalState.transform);
          window.scrollTo(
            originalState.scrollLeft || 0,
            originalState.scrollTop || 0,
          );
        }
      }
    } catch (restoreErr) {
      console.error("Restoration error:", restoreErr);
    }
  }
}

// Add event listeners for download buttons
document.addEventListener("DOMContentLoaded", () => {
  // --- Unified Download Button Logic ---
  const downloadOpenBtns = document.querySelectorAll(".download-open-btn");
  const exportModal = document.getElementById("export-selection-modal");
  const closeExportBtn = document.getElementById("close-export-modal");
  const formatBtns = document.querySelectorAll(".export-format-btn");

  // Open Modal
  downloadOpenBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (exportModal) exportModal.classList.add("active");
    });
  });

  // Close Modal
  if (closeExportBtn) {
    closeExportBtn.addEventListener("click", () => {
      exportModal.classList.remove("active");
    });
  }

  // Handle format selection
  formatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.dataset.format;
      exportModal.classList.remove("active"); // Hide modal immediately
      exportView(format); // Start export
    });
  });

  // --- Theme Toggle Logic ---
  window.isDarkMode = localStorage.getItem("familyTreeTheme") !== "light";

  const applyTheme = () => {
    if (window.isDarkMode) {
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
    }

    // Update all theme icons
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = window.isDarkMode
          ? "fa-solid fa-sun"
          : "fa-solid fa-moon";
      }
      btn.title = window.isDarkMode
        ? "Switch to Light Mode"
        : "Switch to Dark Mode";
    });
  };

  applyTheme();

  // Attach listener to all theme toggle buttons
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.isDarkMode = !window.isDarkMode;
      localStorage.setItem(
        "familyTreeTheme",
        window.isDarkMode ? "dark" : "light",
      );
      applyTheme();

      // Re-render D3 views if active so they can optionally update layout-based backgrounds
      if (
        typeof currentView !== "undefined" &&
        (currentView === "fan" ||
          currentView === "isometric" ||
          currentView === "pedigree")
      ) {
        if (typeof switchView === "function") {
          switchView(currentView);
        }
      }
    });
  });
});
