// --- 4. Fan Chart Logic ---
function initFan(startNodeId = null) {
  svg.selectAll("*").remove();
  svg.on(".drag", null);
  svg.on(".zoom", null);

  // 3. Set Background for Fan View based on Theme
  const bgColor =
    typeof window.isDarkMode !== "undefined" && !window.isDarkMode
      ? "white"
      : "black";
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

  // Helper: Truncate Text and Append Ellipsis
  function truncateAndAppend(textObj, fullText, maxWidth, fontSize) {
    if (!fullText) return;
    const charWidth = fontSize * 0.55;
    if (fullText.length * charWidth <= maxWidth) {
      textObj.text(fullText);
      return;
    }

    // For longer text like "Relation (Detailed)", drop parenthesis if needed
    const noParen = fullText.replace(/\s*\(.*?\)/, "");
    if (
      noParen.length !== fullText.length &&
      noParen.length * charWidth <= maxWidth
    ) {
      textObj.text(noParen);
      return;
    }

    let maxChars = Math.floor(maxWidth / charWidth) - 2;
    if (maxChars <= 0) {
      textObj.text("");
      return;
    }

    // Truncate cleanly using the shorter text base if possible
    let baseText =
      noParen.length < fullText.length && noParen.length > 3
        ? noParen
        : fullText;
    if (maxChars < baseText.length) {
      textObj.text(baseText.slice(0, maxChars) + "..");
    } else {
      textObj.text(baseText);
    }
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

  // Color Palette
  const genColors = [
    "#BDD7EF", // Blue (Me)
    "#FFACFC",
    "#FEF28D",
    "#A8F48D",
    "#FE96FA",
  ];
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
  fanRoot.sum((d) => 1);

  // Override Layout
  // Assign x0, x1 (Angle) and y0, y1 (Radius)
  // Extend rings for depth 15
  const ringThickness = [100]; // Index 0 = Center Ring Radius
  for (let i = 1; i <= 15; i++) {
    if (i <= 4) ringThickness.push(100);
    else if (i <= 10) ringThickness.push(70);
    else ringThickness.push(50);
  }

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
      d.y1 = ringThickness[0] - 15; // Increased gap for premium separation

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
        const totalValue = d3.sum(d.children, (c) => c.value);

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
            const proportionalAngle =
              (child.value / remainingValue) * remainingRange;
            if (proportionalAngle < SAFE_MIN_ANGLE) {
              childAngles[i] = SAFE_MIN_ANGLE;
              remainingRange -= SAFE_MIN_ANGLE;
              remainingValue -= child.value;
              fixedIndices.add(i);
              changed = true;
            }
          });
        }

        // 2. Distribute remaining space amongst those NOT fixed to min.
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

        // 3. Coordinate assignment
        let runningAngle = d.x0;
        d.children.forEach((child, i) => {
          const angle = childAngles[i];
          child.x0 = runningAngle;
          child.x1 = runningAngle + angle;
          runningAngle += angle;

          // Init Y for filter check
          const rStart = depthStartRadius[child.depth] || child.depth * 50;
          const rThick = ringThickness[child.depth] || 50;
          child.y0 = rStart + 15;
          child.y1 = rStart + rThick - 15;
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
      const totalValue = d3.sum(d.children, (c) => c.value);

      const SAFE_MIN_ANGLE = 0.08;
      const totalNeededMin = d.children.length * SAFE_MIN_ANGLE;

      // --- THE ROBUST THRESHOLD CHECK ---
      if (
        range < totalNeededMin ||
        range / d.children.length < MIN_ANGLE_THRESHOLD
      ) {
        d.hasHiddenChildren = true;
        d.children.forEach((c) => (c.isSystemHidden = true));

        const rStart = depthStartRadius[d.depth + 1] || (d.depth + 1) * 80;
        const rThick = 40; // Fixed thin height for button ring

        const plusNode = {
          data: { id: d.data.id, name: "+", isPlus: true },
          depth: d.depth + 1,
          x0: d.x0,
          x1: d.x1,
          y0: rStart + 2,
          y1: rStart + 22,
          color: "#777", // Updated to match new grey theme
          isPlusButton: true,
          parent: d,
        };
        plusNodes.push(plusNode);
      } else {
        // --- PROPORTIONAL MINIMAL SPACE ALGORITHM ---
        const childAngles = new Array(d.children.length);
        const fixedIndices = new Set();
        let remainingRange = range;
        let remainingValue = totalValue;

        let changed = true;
        while (changed) {
          changed = false;
          d.children.forEach((child, i) => {
            if (fixedIndices.has(i)) return;
            const proportionalAngle =
              (child.value / remainingValue) * remainingRange;
            if (proportionalAngle < SAFE_MIN_ANGLE) {
              childAngles[i] = SAFE_MIN_ANGLE;
              remainingRange -= SAFE_MIN_ANGLE;
              remainingValue -= child.value;
              fixedIndices.add(i);
              changed = true;
            }
          });
        }

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

        let runningAngle = d.x0;
        d.children.forEach((child, i) => {
          const angle = childAngles[i];
          child.x0 = runningAngle;
          child.x1 = runningAngle + angle;
          runningAngle += angle;

          const rStart = depthStartRadius[child.depth];
          const rThick = ringThickness[child.depth];

          child.y0 = rStart + 15;
          child.y1 = rStart + rThick - 15;
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
    .padAngle(0.02) // Increased for a clean, spaced-out 3D look
    .cornerRadius(8); // Increased for smoother premium look


  // --- 3D Scene Setup (Stacked Layers) ---
  const scene = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // 1. Tilt Container: Scale Y to simulate perspective tilt
  const TILT_SCALE = 1;
  // --- 3D Scene Setup (Smooth Version) ---
  const fanGroup = scene
    .append("g")
    .attr("class", "fan-3d-container")
    .attr("transform", `scale(1, ${TILT_SCALE})`);


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

  const TOTAL_DEPTH = 10; // Pixels of visual thickness

  // 1. Side/Depth Walls (Rendered FIRST to stay behind)
  const depthLayer = fanGroup.append("g").attr("class", "fan-depth-layer");

  depthLayer
    .selectAll(".fan-segment-depth")
    .data(finalRenderNodes)
    .enter()
    .append("path")
    .attr("class", "fan-segment-depth")
    .attr("d", (d) => {
      // Create a "wall" by drawing an arc that covers the depth from y0-TOTAL_DEPTH to y0
      const depthArc = d3.arc()
        .startAngle(d.x0)
        .endAngle(d.x1)
        .innerRadius(Math.max(0, d.y0 - TOTAL_DEPTH))
        .outerRadius(d.y0 + 2) // Slight overlap to prevent gaps
        .padAngle(0.02)
        .cornerRadius(8);

      if (d.isPlusButton) {
        const midAngle = (d.x0 + d.x1) / 2;
        const r = (d.y0 + d.y1) / 2;
        const size = Math.min(15, (d.x1 - d.x0) * r * 0.8);
        return d3.arc()({
          startAngle: midAngle - size / (2 * r),
          endAngle: midAngle + size / (2 * r),
          innerRadius: r - size / 2 - TOTAL_DEPTH/2, // Shifted inward for button depth
          outerRadius: r + size / 2,
          padAngle: 0,
          cornerRadius: 4
        });
      }
      return depthArc(d);
    })
    .style("fill", (d) => {
        if (d.isPlusButton) {
          const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
          const baseColor = isLightMode ? "#bbb" : "#00D1FF"; // Slightly darker depth in light mode
          return d3.color(baseColor).darker(0.8).hex();
        }
        const baseColor = d.color || "#ccc";
        return d3.color(baseColor).darker(1.5).hex();
    })
    .style("opacity", (d) => {
        if (d.x1 - d.x0 < 0.04) return 0;
        return 1;
    });

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
          const size = Math.min(22, (d.x1 - d.x0) * r * 0.85);

          return d3.arc()({
            startAngle: midAngle - size / (2 * r),
            endAngle: midAngle + size / (2 * r),
            innerRadius: r - size / 2,
            outerRadius: r + size / 2,
            padAngle: 0,
            cornerRadius: 12,
          });
        }
        return arc(d);
    })
    .style("fill", (d) => {
      if (d.isPlusButton) {
        const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
        return isLightMode ? "#eee" : "#00D1FF"; // Light button face in light mode
      }
      return d.color || "#ccc";
    })
    .style("stroke", (d) => {
      if (d.isPlusButton) {
        const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
        return isLightMode ? "#bbb" : "#fff"; // Visible border in light mode
      }
      return "#333";
    })
    .style("stroke-width", (d) => d.isPlusButton ? "1.5px" : "0.5px")
    .style("filter", (d) => d.isPlusButton ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))" : null)
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
          .style("filter", "drop-shadow(0px 4px 8px rgba(0,0,0,0.6))")
          .attr("transform", `translate(${cx}, ${cy}) scale(1.2) translate(${-cx}, ${-cy})`);
      } else {
        d3.select(this).style("filter", "brightness(1.1)");
      }
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .transition().duration(200)
        .style("filter", d.isPlusButton ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))" : null)
        .attr("transform", "translate(0,0) scale(1)");
    });

  // 3. Labels (On Top Layer)
  const labelGroup = fanGroup
    .append("g")
    .attr("class", "fan-labels")
    .attr("transform", `translate(0, 0)`);

  const defs = fanGroup.append("defs");

  // Helper to make ID safe
  const getSafeId = (id) =>
    id ? "clip-" + id.toString().replace(/[^a-zA-Z0-9_-]/g, "_") : "clip-null";

  defs
    .selectAll("clipPath")
    .data(finalRenderNodes)
    .enter()
    .append("clipPath")
    .attr("id", (d) => getSafeId(d.data.id))
    .append("path")
    .attr("d", arc);

  const maxAnglesCheck = (d) =>
    d.x0 !== undefined && d.x1 !== undefined && !isNaN(d.x0) && !isNaN(d.x1);

  const labels = labelGroup
    .selectAll(".fan-label")
    .data(finalRenderNodes)
    .enter()
    .append("g")
    .attr("class", "fan-label")
    .attr("clip-path", (d) =>
      d.depth > 0 && !d.isPlusButton ? `url(#${getSafeId(d.data.id)})` : null,
    )
    .attr("transform", (d) => {
      if (!maxAnglesCheck(d)) return "translate(-9999,-9999)"; // Safety offscreen instead of 0,0

      if (d.depth === 0) return `translate(0, 0)`;

      return `translate(0,0)`;
    })
    .style("pointer-events", "none");

  labels.each(function (d) {
    if (!maxAnglesCheck(d)) return;

    const container = d3.select(this);
    let el = container;

    const midAngle = (d.x0 + d.x1) / 2;
    const r = (d.y0 + d.y1) / 2;
    const cx = r * Math.sin(midAngle);
    const cy = -r * Math.cos(midAngle);
    const deg = (midAngle * 180) / Math.PI;

    if (d.depth > 0 && !d.isPlusButton) {
      // --- LABEL DYNAMIC FITTING ---
      const angle = d.x1 - d.x0;
      const midRadius = (d.y0 + d.y1) / 2;
      const arcLengthPixels = angle * midRadius;

      // Physical visibility check
      if (arcLengthPixels < 12 && d.depth > 1) return;

      let rotate = 0;
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
      el = container
        .append("g")
        .attr("transform", `translate(${cx}, ${cy}) rotate(${rotate})`);
    }

    // Me Node (Center)
    if (d.depth === 0) {
      el.attr("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("fill", "#333")
        .style("pointer-events", "none");

      // Name
      el.append("text")
        .text(d.data.name)
        .attr("y", 0)
        .attr("dominant-baseline", "central")
        .attr("dy", 0)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .call(wrap, 100); // Wrap width ~100px (Center circle is roughly 120px wide)

      // Relation text removed to simplify fan block view
      return;
    }

    // Expand Button Text (Dynamic or Depth Limit)
    if (d.isPlusButton) {
      el.attr("transform", function () {
        const centroid = arc.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1]})`;
      });

      // --- PLUS BUTTON SCALING ---
      const plusFontSize = d.x1 - d.x0 < 0.15 ? "10px" : "16px";

      el.attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("pointer-events", "none");

      el.append("text")
        .text("+")
        .attr("dy", "0em")
        .style("font-size", plusFontSize)
        .style("font-weight", "bold")
        .style("fill", (d) => {
            const isLightMode = typeof window.isDarkMode !== "undefined" && !window.isDarkMode;
            return isLightMode ? "#555" : "white"; // Dark grey icon in light mode, white in dark
        })
        .style("pointer-events", "none");
      return;
    }

    // Standard Text
    // Strip parenthetical detail (e.g., "Cousin Sister (daughter of maternal uncle/aunt)" → "Cousin Sister")
    const relationText = d.data.relation
      ? d.data.relation.replace(/\s*\(.*?\)\s*/g, "").trim()
      : d.data.relation;
    const name = d.data.name || "";

    // --- Calculate Available Space ---
    const radialThickness = d.y1 - d.y0 - 10; // 5px padding
    const arcLength = (d.x1 - d.x0) * ((d.y0 + d.y1) / 2);

    // Adaptive Alignment: Wide segments follow arc, Thin segments follow radius
    const isSlanted = d.x1 - d.x0 < 0.2;
    const isTangential = !isSlanted;

    let availableWidth = 0;
    let availableHeight = 0;

    if (isTangential) {
      availableWidth = arcLength - 10; // Padding
      availableHeight = radialThickness;
    } else {
      availableWidth = radialThickness;
      availableHeight = arcLength;
    }

    // --- 1. Font Sizing & Multi-line Check ---
    let nameFontSize = 10;
    let relFontSize = 8;
    const maxTextHeight = Math.max(availableHeight * 0.8, 2);

    // Standard sizing
    nameFontSize = Math.min(13, maxTextHeight * 0.6);
    relFontSize = Math.min(10, maxTextHeight * 0.4);

    if (relFontSize > nameFontSize) relFontSize = nameFontSize * 0.8;
    if (nameFontSize < 3) nameFontSize = 0;
    if (relFontSize < 2.5) relFontSize = 0;

    // Check if name should be split into two lines
    const parts = name.split(/\s+/);
    const useTwoLines =
      nameFontSize > 0 &&
      parts.length > 1 &&
      isTangential &&
      availableHeight > nameFontSize * 2.2;

    const primaryFontSize = nameFontSize;

    el.attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-family", "sans-serif")
      .style("fill", "#000");

    if (nameFontSize > 0) {
      if (useTwoLines) {
        // --- TWO LINE NAME LAYOUT ---
        const mid = Math.ceil(parts.length / 2);
        const topName = parts.slice(0, mid).join(" ");
        const bottomName = parts.slice(mid).join(" ");

        // Vertical Offset to center the two-line block
        const totalTextHeight = primaryFontSize * 2 * 0.9;
        const startY = 0; // The group is already at the block center

        const topText = el
          .append("text")
          .text(topName)
          .attr("dominant-baseline", "central")
          .attr("text-anchor", "middle")
          .attr("y", -primaryFontSize * 0.6) // Increaded separation
          .style("font-size", primaryFontSize + "px")
          .style("font-weight", "bold");

        const bottomText = el
          .append("text")
          .text(bottomName)
          .attr("dominant-baseline", "central")
          .attr("text-anchor", "middle")
          .attr("y", primaryFontSize * 0.6) // Increased separation
          .style("font-size", primaryFontSize * 0.9 + "px");

        truncateAndAppend(topText, topName, availableWidth, primaryFontSize);
        truncateAndAppend(
          bottomText,
          bottomName,
          availableWidth,
          primaryFontSize * 0.9,
        );
      } else {
        // --- SINGLE LINE NAME + RELATION ---
        // To center both Name and Relation as a block:
        // Name at yOffsetName, Relation at yOffsetRel
        // If no relation, Name at 0.
        const nameY = 0; // Vertical center since no relation label is shown

        const nameText = el
          .append("text")
          .text(name)
          .attr("dominant-baseline", "central")
          .attr("text-anchor", "middle")
          .attr("y", nameY)
          .style("font-size", nameFontSize + "px")
          .style("font-weight", "bold")
          .style("pointer-events", "none");

        truncateAndAppend(nameText, name, availableWidth, nameFontSize);

        // Relation removed from fan block view per request (can be seen in card)
      }
    }
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
