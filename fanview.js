// --- 4. Fan Chart Logic ---
function initFan(startNodeId = null) {
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 3. Set Background for Fan View (Black)
    svg.style("background", "black");

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
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
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
        const flatList = Array.isArray(rawFamilyData) ? rawFamilyData : (rawFamilyData.data || []);

        flatList.forEach(p => {
            const pid = p.id.toString();
            // Store Node
            if (!allNodesMap.has(pid)) {
                allNodesMap.set(pid, {
                    id: pid,
                    name: p.name,
                    gender: p.gender,
                    relation: p.relation,
                    photo: p.photo,
                    isMe: (p.relation === "Myself" || p.relation === "Me"),
                    fid: p.fid,
                    mid: p.mid
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
                p.pids.forEach(spouseId => {
                    addEdge(pid, spouseId.toString());
                });
            }
        });

    } else {
        // Fallback to Hierarchy Traversal (Lossy for Maternal lines usually)
        const mainRoot = d3.hierarchy(familyData);

        mainRoot.descendants().forEach(d => {
            allNodesMap.set(d.data.id, d.data);
            // Spouse Link
            if (d.data.spouse) {
                if (!d.data.spouse.id) d.data.spouse.id = d.data.id + "_spouse";
                allNodesMap.set(d.data.spouse.id, d.data.spouse);
                addEdge(d.data.id, d.data.spouse.id);
            }
        });

        mainRoot.links().forEach(link => {
            addEdge(link.source.data.id, link.target.data.id);
        });
    }

    // BFS to build new tree centered on Start Node ("Me")
    let rootId = startNodeId;

    if (!rootId) {
        // Find "Me" or "Myself" in the map
        const values = Array.from(allNodesMap.values());
        const meNode = values.find(d => d.isMe || d.relation === "Myself");
        if (meNode) {
            rootId = meNode.id;
        } else {
            // Fallback: Use the main root ID from familyData
            if (familyData && familyData.id) {
                rootId = familyData.id;
                console.warn("Fan View: 'Myself' not found, defaulting to Tree Root:", rootId);
            } else {
                rootId = allNodesMap.keys().next().value;
                console.warn("Fan View: 'Myself' not found, defaulting to arbitrary node:", rootId);
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
        neighbors.forEach(nid => {
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
        "#90caf9", // Blue (Me)
        "#f48fb1", // Pink
        "#fff59d", // Yellow
        "#a5d6a7", // Green
        "#ce93d8", // Purple
        "#ffcc80", // Orange
    ];
    const getGenColor = (d) => genColors[d.depth % genColors.length];

    // Assign Colors
    fanRoot.descendants().forEach(d => {
        d.color = getGenColor(d);
    });

    // Pre-calculate Depth for Ring assignment
    fanRoot.descendants().forEach(d => {
        // d.depth is auto-calculated by d3.hierarchy
        // 0 = Me, 1 = Children/Parents, etc.
    });

    // Custom Partition Layout
    // We want to control the Angles manually to split ancestors/descendants if needed.
    // For simplicity V2: Standard 360 Sunburst partition
    const partition = d3.partition()
        .size([2 * Math.PI, radius]); // x, y (angle, radius)

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
    fanRoot.eachBefore(d => {
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
            const father = d.children ? d.children.find(c => c.data.relation === "Father") : null;
            const mother = d.children ? d.children.find(c => c.data.relation === "Mother") : null;

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
                    const rStart = depthStartRadius[child.depth] || (child.depth * 50);
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
                d.children.forEach(c => c.childrenHidden = true);
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
                d.children.forEach(c => c.isSystemHidden = true);

                // Create Plus Node
                const rStart = depthStartRadius[d.depth + 1] || ((d.depth + 1) * 80); // Fallback if out of bounds
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
                    parent: d
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


    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1)
        .padAngle(0.02)
        .cornerRadius(5);

    // --- 3D Scene Setup (Stacked Layers) ---
    const scene = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // 1. Tilt Container: Scale Y to simulate perspective tilt
    const TILT_SCALE = 1;
    const fanGroup = scene.append("g")
        .attr("class", "fan-3d-container")
        .attr("transform", `scale(1, ${TILT_SCALE})`);

    // 2. Render Layers (Bottom to Top) for Thickness
    const NUM_LAYERS = 8;
    const LAYER_OFFSET = 2; // Pixels per layer (total depth = 16px)

    // Helper: Darken color for sides
    const darken = (c, factor) => d3.color(c).darker(factor).hex();

    // Filter Data: Exclude nodes that are hidden 
    const visibleNodes = fanRoot.descendants().filter(d => {
        if (d.depth === 0) return true; // Root always visible

        // Filter hidden children
        if (d.isSystemHidden) return false;
        if (d.parent && d.parent.isSystemHidden) return false; // Safety cascaded check

        return (d.x0 !== undefined && d.x1 !== undefined && !isNaN(d.x0) && !isNaN(d.x1));
    });

    // Merge Regular Nodes + Plus Nodes
    const finalRenderNodes = visibleNodes.concat(plusNodes);

    for (let i = 0; i < NUM_LAYERS; i++) {
        const isTop = i === NUM_LAYERS - 1;
        const yOffset = (NUM_LAYERS - 1 - i) * LAYER_OFFSET;

        const layer = fanGroup.append("g")
            .attr("transform", `translate(0, ${yOffset})`);

        const paths = layer.selectAll(".fan-segment")
            .data(finalRenderNodes)
            .enter().append("path")
            .attr("class", "fan-segment")
            .attr("d", arc)
            .style("fill", d => {
                if (d.isPlusButton) return "#333";

                // Normal coloring

                return isTop ? d.color : darken(d.color, 0.5 + (NUM_LAYERS - i) * 0.1);
            })
            .style("stroke", d => isTop ? "#333" : "none")
            .style("stroke-width", "0.5px");

        if (isTop) {
            paths.style("cursor", "pointer")
                .on("click", (event, d) => {
                    event.stopPropagation();
                    console.log("Fan Segment Clicked:", d.data.name, "Depth:", d.depth, "ID:", d.data.id);

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
    const labelGroup = fanGroup.append("g")
        .attr("class", "fan-labels")
        .attr("transform", `translate(0, 0)`);

    const maxAnglesCheck = (d) => (d.x0 !== undefined && d.x1 !== undefined && !isNaN(d.x0) && !isNaN(d.x1));

    const labels = labelGroup.selectAll(".fan-label")
        .data(finalRenderNodes)
        .enter().append("g")
        .attr("class", "fan-label")
        .attr("transform", d => {
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

            const deg = midAngle * 180 / Math.PI; // 0 at Top, 90 at Right, 180 Bottom

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
                rotate = (deg > 90 && deg < 270) ? deg + 180 : deg;
            } else {
                rotate = (deg < 180) ? (deg - 90) : (deg + 90);
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

            el.attr("text-anchor", "middle")
                .style("pointer-events", "none");

            el.append("text").text("+")
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

        // --- Calculate Available Space ---
        const radialThickness = d.y1 - d.y0 - 10; // 5px padding
        const midRadius = (d.y0 + d.y1) / 2;
        const arcLength = (d.x1 - d.x0) * midRadius;

        let availableWidth, availableHeight;

        // Determine Orientation based on Depth
        // Depth 1 is Tangential (Text runs along the ring)
        // Depth > 1 is Radial (Text runs outward/inward along radius)
        const isTangential = (d.depth === 1);

        if (isTangential) {
            availableWidth = arcLength - 10; // Padding
            availableHeight = radialThickness;
        } else {
            availableWidth = radialThickness;
            availableHeight = arcLength;
        }

        // --- 1. Font Sizing ---
        let nameFontSize = 10;
        let relFontSize = 8;

        // Constrain height (Font Size)
        // We have 2 lines: Name (~60%) + Relation (~40%)
        const maxTextHeight = Math.max(availableHeight * 0.8, 2);

        // Standard sizing
        nameFontSize = Math.min(14, maxTextHeight * 0.6);
        relFontSize = Math.min(10, maxTextHeight * 0.4);

        // If height is tight, scale down
        // Ensure relation is not bigger than name
        if (relFontSize > nameFontSize) relFontSize = nameFontSize * 0.8;

        // Min sizes
        if (nameFontSize < 3) nameFontSize = 0;
        if (relFontSize < 2.5) relFontSize = 0;

        // --- 2. Truncation Helper ---
        function truncateAndAppend(textObj, fullText, maxWidth) {
            let currentLen = textObj.node().getComputedTextLength();
            if (currentLen <= maxWidth) return;

            let textVal = fullText;
            // Binary search or iterative? Iterative is fine for small strings.
            // Faster approach: guess based on char width?
            // Let's stick to iterative to be properly "System 2" precise as requested.

            while (currentLen > maxWidth && textVal.length > 0) {
                // Remove chunks? one char is safe.
                textVal = textVal.slice(0, -1);
                textObj.text(textVal + "...");
                currentLen = textObj.node().getComputedTextLength();
            }
        }

        el.attr("text-anchor", "middle")
            .style("font-family", "sans-serif")
            .style("fill", "#000");

        if (nameFontSize > 0) {
            const nameText = el.append("text")
                .text(name)
                .attr("y", -nameFontSize * 0.2)
                .style("font-size", nameFontSize + "px")
                .style("font-weight", "bold")
                .style("pointer-events", "none");

            truncateAndAppend(nameText, name, availableWidth);
        }

        if (relFontSize > 0) {
            const relText = el.append("text")
                .text(relationText)
                .attr("y", nameFontSize * 0.8 + 2)
                .style("font-size", relFontSize + "px")
                .style("fill", "#444")
                .style("pointer-events", "none");

            truncateAndAppend(relText, relationText, availableWidth);
        }
    });

    // Zoom Logic
    const zoom = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
            scene.attr("transform", event.transform);
        });

    svg.call(zoom)
        .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    // Add "Back" button if we are deep (not at true root)
    // --- Navigation Buttons (Back & Reset) ---
    // Render Back Button if history exists
    if (fanHistory.length > 0) {
        const backBtn = svg.append("g")
            .attr("transform", `translate(50, 50)`)
            .style("cursor", "pointer")
            .on("click", () => {
                const prevId = fanHistory.pop();
                initFan(prevId);
            });

        backBtn.append("rect")
            .attr("width", 80)
            .attr("height", 30)
            .attr("rx", 15)
            .attr("fill", "rgba(255, 255, 255, 0.2)")
            .attr("stroke", "#fff");

        backBtn.append("text")
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
        const resetBtn = svg.append("g")
            .attr("transform", `translate(140, 50)`) // Positioned to the right of Back button
            .style("cursor", "pointer")
            .on("click", () => {
                fanHistory = []; // Clear history
                initFan(); // Reset to default
            });

        resetBtn.append("rect")
            .attr("width", 80)
            .attr("height", 30)
            .attr("rx", 15)
            .attr("fill", "rgba(255, 255, 255, 0.2)")
            .attr("stroke", "#ff4444");

        resetBtn.append("text")
            .attr("x", 40)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Reset")
            .style("fill", "white")
            .style("font-size", "12px");
    }
}
