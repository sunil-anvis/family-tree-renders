// --- 1. Data & Global Setup ---
let familyData;
let rawFamilyData; // Store raw flat data for Graph Views (Fan)

// Initialize App

// Helper to get "Me" from raw API data
function getMeFromRaw() {
    const list = rawFamilyData?.data || rawFamilyData;
    if (!Array.isArray(list)) return null;
    return list.find(p => p.relation === "Myself" || p.relation === "Me");
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

// Main SVG Container
const svg = d3.select("#tree-container").html("").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "radial-gradient(circle at center, #02111b 0%, #000000 100%)");

// Modal Setup
const modal = d3.select("body").append("div")
    .attr("class", "modal-overlay")
    .style("opacity", 0)
    .style("pointer-events", "none");

const modalContent = modal.append("div").attr("class", "modal-content");
const modalClose = modalContent.append("button").attr("class", "modal-close").html("&times;");
const modalBody = modalContent.append("div").attr("class", "modal-body");

modalClose.on("click", () => {
    modal.transition().duration(200)
        .style("opacity", 0)
        .on("end", () => modal.style("pointer-events", "none"));
});

modal.on("click", (e) => {
    if (e.target.className === "modal-overlay") {
        modal.transition().duration(200)
            .style("opacity", 0)
            .on("end", () => modal.style("pointer-events", "none"));
    }
});

function showModal(d) {
    const isVerticalView = currentView === 'vertical-tree';

    modalBody.html(`
    <div class="modal-profile">
        <img src="${d.data.photo}" alt="${d.data.name}" class="modal-image">
        
        <div class="modal-content-wrapper">
            <h2 class="modal-name">${d.data.name}</h2>
            <p class="modal-info">
                ${d.data.relation} <span style="color:var(--neon-cyan)">•</span> 
                ${d.data.size ? 'Family Size: ' + d.data.size : (d.data.age ? d.data.age + ' years' : 'Age N/A')} 
                <span style="color:var(--neon-cyan)">•</span> ${d.data.gender === 'm' ? 'Male' : (d.data.gender === 'f' ? 'Female' : 'N/A')}
            </p>
            
            <p class="modal-location">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                ${d.data.location || 'Location Unknown'}
            </p>

            ${isVerticalView ? `
                <div class="modal-actions" style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="trace-btn" id="trace-path-btn" style="flex:1;">Trace Path from Me</button>
                </div>
            ` : ''}
        </div>
    </div>
`);
    modal.style("pointer-events", "all")
        .transition().duration(200)
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
                const meNode = currentTreeRoot.descendants().find(n => n.data.isMe);
                console.log("Me node:", meNode);

                // 3. Find path to current node (d)
                const targetNode = currentTreeRoot.descendants().find(n => n.data.id === d.data.id);
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
                console.log("Path nodes:", pathNodes.map(n => n.data.name));

                // Highlight Nodes
                const nodeIds = new Set(pathNodes.map(n => n.data.id));
                d3.selectAll(".tree-node")
                    .filter(n => nodeIds.has(n.data.id))
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
                modal.transition().duration(200)
                    .style("opacity", 0)
                    .on("end", () => modal.style("pointer-events", "none"));

                // Animate the trace sequentially
                // Highlight nodes one by one with delay
                pathNodes.forEach((node, index) => {
                    setTimeout(() => {
                        d3.selectAll(".tree-node")
                            .filter(n => n.data.id === node.data.id)
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

                    setTimeout(() => {
                        d3.selectAll(".tree-link[data-link-type='main-tree']")
                            .filter(function (l) {
                                return linkPairs.has(`${l.source.data.id}-${l.target.data.id}`);
                            })
                            .filter(function (l) {
                                return `${l.source.data.id}-${l.target.data.id}` === linkKey ||
                                    `${l.target.data.id}-${l.source.data.id}` === linkKey;
                            })
                            .classed("trace-active", true)
                            .transition()
                            .duration(400)
                            .attr("stroke-width", 6)
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 4);
                    }, i * 400 + 200); // Start after the source node, offset by 200ms
                }

            });
        }


    }
}

// Global variable to store current hierarchy root for tracing
let currentTreeRoot = null;

// State

let currentView = 'vertical-tree'; // 'tree' or 'vertical-tree'
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
    const cardGradient = defs.append("linearGradient")
        .attr("id", "card-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");

    cardGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#1a1a2e"); // Dark Blue

    cardGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#16213e"); // Slightly lighter

    // Glow Filter
    const filter = defs.append("filter")
        .attr("id", "neon-glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const root = d3.hierarchy(familyData);

    // Increase size for cards
    // Adjust node size to account for potential spouses (Double Width)
    const treeLayout = d3.tree()
        .nodeSize([cardWidth * 2 + 50, cardHeight + 40]) // Width (increased), Height spacing
        .separation((a, b) => a.parent == b.parent ? 1.1 : 1.25);

    treeLayout(root);

    // Links
    g.selectAll(".tree-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "tree-link")
        .attr("d", d => {
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

                    return fatherLine + motherLine + horizontalLine + fixedMainPath + tFatherLine + tMotherLine + tHorizLine;
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
    const nodes = g.selectAll(".tree-node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "tree-node")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    // Render Card (Reusable function?)
    const renderCard = (selection, data, isSpouse = false) => {
        const truncate = (str, n) => (str && str.length > n) ? str.slice(0, n - 3) + "..." : str;
        const xOffset = isSpouse ? (cardWidth + 20) : 0;

        const grp = selection.append("g")
            .attr("transform", `translate(${xOffset}, 0)`);

        // Card Background
        if (familyData.node_style !== "circle") {
            grp.append("rect")
                .attr("x", -cardWidth / 2)
                .attr("y", -cardHeight / 2)
                .attr("width", cardWidth)
                .attr("height", cardHeight)
                .attr("rx", 10)
                .attr("class", "tree-card-bg");
        }

        // Clip Path
        const clipId = `clip-${data.id}`;
        grp.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", 20)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0);

        // Image
        grp.append("image")
            .attr("xlink:href", data.photo)
            .attr("x", -cardWidth / 2 + 10)
            .attr("y", -20)
            .attr("width", 40)
            .attr("height", 40)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");

        // Ring
        grp.append("circle")
            .attr("r", 21)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0)
            .attr("fill", "none")
            .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
            .attr("stroke-width", data.isMe ? 4 : 1.5);
        // Text Group
        const textGroup = grp.append("g")
            .attr("transform", `translate(${- cardWidth / 2 + 60}, 0)`);

        textGroup.append("text")
            .attr("class", "tree-card-name")
            .attr("y", -2)
            .text(truncate(data.name, 15))
            .append("title") // Tooltip
            .text(data.name);

        textGroup.append("text")
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
    const zoom = d3.zoom()
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

        // Dynamic Font Size
        const angle = d.x1 - d.x0; // Radians
        let fontSize = 8; // Reduced base

        // Scale down for smaller slices
        if (angle < 0.25) fontSize = 7;
        if (angle < 0.20) fontSize = 6;
        if (angle < 0.15) fontSize = 5;
        if (angle < 0.10) fontSize = 4;
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

        el.append("text").text(relationText)
            .attr("y", fontSize / 2 + 2)
            .style("font-size", relSize + "px")
            .style("fill", "#444")
            .style("pointer-events", "none");
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

// --- 5. Isometric 3D Logic ---
function init3DTree() {
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 4. Set Background for 3D View (Isometric Grids + Lighter)
    svg.style("background", "#f4f4f5"); // Light Grey Base

    // Config
    const bh = 120; // Block Depth (Y-axis visual)
    const getExtrusion = (depth) => Math.max(10, 50 - (depth * 2)); // Dynamic Extrusion: 50 layers start, -2 per gen
    const cardWidth = 80; // Avatar Card Width
    const cardHeight = 100; // Avatar Card Height
    const tileW = 50; // Size of the square tile - Reverted
    const tileH = 10; // Thickness (Z-height of the button)
    const tileR = 10; // Corner radius

    // New Pastel Palette (Kennedy Style - Soft & Bright)
    const genColors = [
        "#90caf9", // Blue (Me)
        "#f48fb1", // Pink
        "#fff59d", // Yellow
        "#a5d6a7", // Green
        "#ce93d8", // Purple
        "#ffcc80", // Orange
    ];

    const getGenColor = (d) => genColors[d.depth % genColors.length];
    const darken = (c, factor) => d3.color(c).darker(factor).hex();

    // Definitions
    const defs = svg.append("defs");

    // 1. Soft Contact Shadow
    const filter = defs.append("filter")
        .attr("id", "soft-shadow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 8)
        .attr("result", "blur");
    filter.append("feOffset")
        .attr("dx", 5)
        .attr("dy", 5)
        .attr("result", "offsetBlur");
    filter.append("feFlood")
        .attr("flood-color", "rgba(0,0,0,0.2)")
        .attr("result", "color");
    filter.append("feComposite")
        .attr("in2", "offsetBlur")
        .attr("operator", "in");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "SourceGraphic"); // Optional: if applying to group
    // actually, for shadows we separate geometry, so just return the shadow
    // Let's stick to standard Gaussian Blur for separate shadow paths

    const shadowFilter = defs.append("filter")
        .attr("id", "drop-shadow-blur")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    shadowFilter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 6);


    // Glass Gloss Gradient
    const glassGradient = defs.append("linearGradient")
        .attr("id", "glass-gloss")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
    glassGradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0.7)");
    glassGradient.append("stop").attr("offset", "50%").attr("stop-color", "rgba(255,255,255,0.1)");
    glassGradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(255,255,255,0.0)");

    // Isometric Grid (Optional, faint) -- REMOVED per user request

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, 150)`);

    // Standard Tree Layout
    const treeLayout = d3.tree()
        .nodeSize([300, 450]) // Reverted spacing for smaller icons
        .separation((a, b) => a.parent == b.parent ? 1.1 : 1.3);

    const root = d3.hierarchy(familyData);
    treeLayout(root);

    // Iso Projection
    // x, y are screen coords from tree layout. 
    // We map them: tree.x -> iso.x (spread), tree.y -> iso.y (depth)
    const toIso = (x, y) => {
        // Standard Isometric Projection
        const scale = 0.8;
        const ix = (x - y) * scale;
        const iy = (x + y) * 0.5 * scale;
        return [ix, iy];
    };

    // Pre-calculate layouts
    root.descendants().forEach(d => {
        [d.isoX, d.isoY] = toIso(d.x, d.y);
        // Calculate dynamic width based on name
        d.width = Math.max(140, d.data.name.length * 9 + 40);
    });

    // --- Layers ---
    const shadowLayer = g.append("g");
    const blockLayer = g.append("g"); // Blocks
    const linkLayer = g.append("g");  // Links ON TOP
    const avatarLayer = g.append("g");

    // --- Blocks (Platforms) ---
    // Group by parent to create shared platforms
    const siblingGroups = d3.group(root.descendants(), d => d.parent);

    // Helper to get corners
    const getCorners = (cx, cy, w, h) => {
        const c1 = toIso(cx - w / 2, cy - h / 2); // Top
        const c2 = toIso(cx + w / 2, cy - h / 2); // Right
        const c3 = toIso(cx + w / 2, cy + h / 2); // Bottom
        const c4 = toIso(cx - w / 2, cy + h / 2); // Left
        return { c1, c2, c3, c4 };
    };

    siblingGroups.forEach((siblings, parent) => {
        if (!siblings.length) return;

        // Calculate Bounds in Tree Space
        const allX = siblings.map(n => n.x);
        const allY = siblings.map(n => n.y);

        const minX = d3.min(allX);
        // Correct maxX to account for spouse offset (110 is the gap used in renderAvatar)
        const maxX = d3.max(siblings.map(n => n.x + (n.data.spouse ? 110 : 0)));
        const depthY = allY[0];

        // Padding
        const padX = 300; // Increased breadth (width padding)
        const widthT = (maxX - minX) + padX * 2;
        const depthT = 220; // Decreased depth (length)

        // Center
        const cx = (minX + maxX) / 2;
        const cy = depthY;

        // Logical Corners
        const l = cx - widthT / 2;
        const r_edge = cx + widthT / 2;
        const t = cy - depthT / 2;
        const b = cy + depthT / 2;
        const r = 20; // Corner Radius

        // Path Helper
        // z is negative for distinct downward extrusion
        const p = (lx, ly, lz = 0) => {
            const [ix, iy] = toIso(lx, ly);
            return `${ix},${iy - lz} `;
        };

        // Rounded Top Face
        const getRoundedTopPath = (z = 0) => {
            return `M ${p(l + r, t, z)}
                    L ${p(r_edge - r, t, z)}
                    Q ${p(r_edge, t, z)} ${p(r_edge, t + r, z)}
                    L ${p(r_edge, b - r, z)}
                    Q ${p(r_edge, b, z)} ${p(r_edge - r, b, z)}
                    L ${p(l + r, b, z)}
                    Q ${p(l, b, z)} ${p(l, b - r, z)}
                    L ${p(l, t + r, z)}
                    Q ${p(l, t, z)} ${p(l + r, t, z)}
Z`;
        };

        const getSideSkirt = (currentExtrusion) => {
            // Trace Top edge points slightly raised (overlapZ) to tuck under Top Face
            // Increased to 4 to aggressively seal gaps
            const overlapZ = 4;

            // Start: Top Layer (with overlap), Left-Front Tangent
            // Note: Bottom is at z = -currentExtrusion (locally). 
            // WAIT: p(..., z) maps z to screen Y UP.
            // If we want the block to go DOWN from the platform surface (z=0 locally), 
            // the bottom should be a NEGATIVE z value in p()?
            // Let's re-verify p().
            // p = (lx, ly, lz) => iy - lz.
            // visual Y increases downwards.
            // To go DOWN on screen (thickness), we need HIGHER Y.
            // So we need lz to be NEGATIVE?
            // iy - (-val) = iy + val (Down). Correct.
            // So bottom z is -currentExtrusion.

            const bottomZ = -currentExtrusion;

            return `M ${p(l, b - r, overlapZ)}
                     L ${p(l, b - r, bottomZ)}
                     Q ${p(l, b, bottomZ)} ${p(l + r, b, bottomZ)}
                     L ${p(r_edge - r, b, bottomZ)}
                     Q ${p(r_edge, b, bottomZ)} ${p(r_edge, b - r, bottomZ)}
                     L ${p(r_edge, t + r, bottomZ)}
                     L ${p(r_edge, t + r, overlapZ)}
                     L ${p(r_edge, b - r, overlapZ)} // Back to Top Layer Corner
                     Q ${p(r_edge, b, overlapZ)} ${p(r_edge - r, b, overlapZ)}
                     L ${p(l + r, b, overlapZ)}
                     Q ${p(l, b, overlapZ)} ${p(l, b - r, overlapZ)}
Z`;
        };

        const topPath = getRoundedTopPath(0);

        // Calculate extrusion for this generation
        const thisExtrusion = getExtrusion(siblings[0].depth);
        const sidePath = getSideSkirt(thisExtrusion);

        // Color Logic - Corrected per user "Dark at top, Light on side"
        // The Base Color is the VIBRANT color (Top).
        // The Side Wall should be a LIGHTER tint of that base.

        const baseColor = getGenColor(siblings[0]);

        const topColor = baseColor; // Top gets the rich color
        const sideColor = d3.hsl(baseColor);
        sideColor.l += 0.15; // Side is lighter

        // Render Shadow
        shadowLayer.append("path")
            .attr("d", topPath)
            .attr("fill", "black")
            .attr("opacity", 0.1)
            .attr("filter", "url(#drop-shadow-blur)")
            .attr("transform", "translate(0, 0)");

        // Render Block Group
        // Translate UP by extrusion so the bottom sits on 0?
        // No, visual convention: The layout (x,y) is the "Top" surface.
        // If we want them to sit on the same ground plane...
        // Assuming (x,y) is ground. Top is at +Extrusion.
        // Current Code: `transform translate(0, -extrusion)`.
        // This moves the group UP on screen.
        // If (0,0) is origin. `translate(0, -40)` puts origin at -40 (Up).
        // Inside group, we draw Top at 0 (local). So Top is at global -40.
        // Bottom is at local -40. Global -40 -(-40)? No.
        // `p(..., bottomZ)` -> `iy - (-40)` -> `iy + 40`.
        // Group transform: `iy_new = iy_old - 40`.
        // Point in group: `iy_final = (iy_new) + 40` = `iy_old`.
        // So Bottom is at the original Layout Y (Ground).
        // Top is at Layout Y - Extrusion (Air).

        // So we translate by -thisExtrusion.
        const grp = blockLayer.append("g")
            .attr("transform", `translate(0, ${- thisExtrusion})`);

        // Side Wall (Lighter Tint)
        grp.append("path")
            .attr("d", sidePath)
            .attr("fill", sideColor)
            .attr("stroke", sideColor)
            .attr("stroke-width", 3) // Thick stroke to seal seams
            .attr("stroke-linejoin", "round");

        // Top Face (Vibrant)
        const borderColor = darken(baseColor, 0.5); // Darker border for the top face
        grp.append("path")
            .attr("d", topPath)
            .attr("fill", topColor)
            .attr("stroke", borderColor)
            .attr("stroke-width", 2);

        // Generation Label
        const [lblX, lblY] = toIso(l, b);
        grp.append("text")
            .attr("x", lblX - 25) // Shift left
            .attr("y", lblY + 5)  // Center vertically relative to corner
            .text(`Generation ${siblings[0].depth}`)
            .attr("fill", "#666")
            .attr("font-size", "14px")
            .attr("font-family", "sans-serif")
            .attr("font-weight", "bold")
            .style("pointer-events", "none")
            .attr("text-anchor", "end"); // Align end so it sits to the left
        // .attr("transform", `rotate(-30, ${lblX}, ${lblY})`); // Removed rotation per user request
    });

    // --- Links ---
    // Orthogonal Routing in Iso with Rounded Corners
    const linkPathGenerator = (d) => {
        const s = d.source;
        const t = d.target;

        const sx = s.x, sy = s.y;

        // Spouse offset logic (same as 2D tree, adjusted for usage in 3D projection)
        // Check if source has spouse to offset X (since nodes are laid out on X axis in tree layout)
        // Wait, standard tree layout is X-axis spread.
        // We rendered spouse at +offset X in 2D tree.
        // We should replicate that logic here or assume 's.x' is the group center.
        // In 3D, we need to know WHERE the block is.
        // The block is centered on (minX + maxX)/2.
        // Each node group is at d.x.
        // If spouse is present, the node group is wider?
        // We need to render the avatars at offset positions relative to d.x.

        // Let's assume d.x is the center of the MAIN avatar. 
        // If spouse exists, we place spouse at d.x + X_OFFSET.
        // Link source should be d.x + X_OFFSET / 2.

        let linkSx = sx;
        const AVATAR_Gap = 110; // Distance between avatars in 3D (Matched with xOff)
        if (s.data.spouse) linkSx += AVATAR_Gap / 2;

        const tx = t.x, ty = t.y;
        let linkTx = tx;
        if (t.data.spouse && t.data.spouse.id) linkTx += AVATAR_Gap / 2;

        const midY = (sy + ty) * 0.5;

        // Heights (Z)
        // Connect to the SIDE of the button (mid-height of tile)
        // Block Surface = extrusion. Tile = 10 thick. Mid = extrusion + 5.
        const zOffset = 5;
        const sz = getExtrusion(s.depth) + zOffset;
        const tz = getExtrusion(t.depth) + zOffset;

        // Helper to project 3D point to 2D screen
        // using the same toIso logic but returning [x, y]
        const project = (lx, ly, lz) => {
            const [ix, iy] = toIso(lx, ly);
            return [ix, iy - lz];
        };

        // Key Points in 3D Layout Space
        // S -> C1 -> C2 -> T
        // S: Start
        // C1: First Turn (keep X=sx, move Y to midY)
        // C2: Second Turn (move X to tx, keep Y at midY)
        // T: Target

        // Note on Z: We interpolate Z across the horizontal bridge (C1->C2)
        // So C1 is at Z=sz, C2 is at Z=tz (or we can keep C2 at sz and drop later?)
        // The previous simple line slanted Z from C1 to C2. Let's stick to that for smoothness.

        // Offset start/end to be at the block boundary
        // We know links go vertically (Y-axis in Tree space)
        const yOffset = tileW / 2;

        const p0 = project(sx, sy + yOffset, sz);       // Start (Bottom of source block)
        const p1 = project(sx, midY, sz);     // Corner 1
        const p2 = project(tx, midY, tz);     // Corner 2
        const p3 = project(tx, ty - yOffset, tz);       // End (Top of target block)

        // Rounding Radius
        const r = 15;

        // Helper: Simple Vector Math
        const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
        const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
        const len = (v) => Math.hypot(v[0], v[1]);
        const scale = (v, s) => [v[0] * s, v[1] * s];
        const norm = (v) => { const l = len(v); return l === 0 ? [0, 0] : [v[0] / l, v[1] / l]; };

        // Draw Sequence:
        // P0 -> (Approach P1) -> Q P1 -> (Depart P1) -> (Approach P2) -> Q P2 -> (Depart P2) -> P3

        // Safe Radius Check for Segment P0->P1
        // We need 'r' distance from P1 towards P0
        const v10 = sub(p0, p1); // Vector P1->P0
        const d10 = len(v10);
        const r1 = Math.min(r, d10 / 2);

        // Safe Radius Check for Segment P1->P2
        const v12 = sub(p2, p1); // Vector P1->P2
        const d12 = len(v12);

        // We use same radius at P1 and P2 for the middle segment sharing
        // Max radius is half the segment length
        const r_mid = Math.min(r, d12 / 2);

        // Safe Radius Check for Segment P2->P3
        const v23 = sub(p3, p2); // Vector P2->P3
        const d23 = len(v23);
        const r2 = Math.min(r, d23 / 2);

        // Actual radii to use
        const rad1 = Math.min(r1, r_mid);
        const rad2 = Math.min(r2, r_mid);

        // Calculate Start/End points of curves
        // Corner 1
        const c1_start = add(p1, scale(norm(v10), rad1)); // Point on P0-P1
        const c1_end = add(p1, scale(norm(v12), rad1)); // Point on P1-P2

        // Corner 2
        // Vector P2->P1 is -v12
        const v21 = scale(v12, -1);
        const c2_start = add(p2, scale(norm(v21), rad2)); // Point on P2-P1
        const c2_end = add(p2, scale(norm(v23), rad2)); // Point on P2-P3

        // Build Path
        return `M ${p0[0]},${p0[1]}
                L ${c1_start[0]},${c1_start[1]}
                Q ${p1[0]},${p1[1]} ${c1_end[0]},${c1_end[1]}
                L ${c2_start[0]},${c2_start[1]}
                Q ${p2[0]},${p2[1]} ${c2_end[0]},${c2_end[1]}
                L ${p3[0]},${p3[1]} `;
    };

    linkLayer.selectAll(".iso-link")
        .data(root.links())
        .enter().append("path")
        .attr("d", linkPathGenerator)
        .attr("fill", "none")
        .attr("stroke", d => {
            // Darker shade of the target block's color
            const targetColor = getGenColor(d.target);
            return d3.color(targetColor).darker(1.2).hex();
        })
        .attr("stroke-width", 5) // Significantly thicker
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("transform", `translate(0, 0)`) // No global shift needed if Z is correct
        .attr("opacity", 0.9);


    // --- Avatars (Nodes) ---
    // Lying 3D Tiles Logic
    // Tile Config (Moved to top)

    const nodes = avatarLayer.selectAll(".node-group")
        .data(root.descendants().sort((a, b) => a.isoY - b.isoY))
        .enter().append("g")
        .attr("transform", d => {
            const [ix, iy] = toIso(d.x, d.y);
            const z = getExtrusion(d.depth);
            return `translate(${ix}, ${iy - z})`;
        })
        .style("cursor", "pointer")
        .on("click", (e, d) => { e.stopPropagation(); showModal(d); });

    nodes.each(function (d) {
        const g = d3.select(this);

        const renderAvatar = (data, isSpouse) => {
            const xOff = isSpouse ? 110 : 0; // Increased to 110 for text spacing
            // We need to shift the avatar in 3D space?
            // Since 'g' is already transformed to iso(d.x, d.y - z).
            // We need to modify the transform of the internal content or add a child group.
            // But 'toIso' works on screen coords.
            // If we shift X in 'Tree Space' by 60, we need to project that.

            // Let's do it simply: Create a group for the avatar, apply offset in TREE SPACE before projection?
            // No, `g` is already placed.
            // We can calculate the Iso offset for (x+60, y) - (x, y).
            // toIso(x+60, y) = [(x+60-y)*s, (x+60+y)*0.5*s]
            // toIso(x, y) = [(x-y)*s, (x+y)*0.5*s]
            // Diff = [60*s, 60*0.5*s] = [48, 24] with scale=0.8.

            const dx = xOff * 0.8; // 0.8 is scale in toIso
            const dy = xOff * 0.5 * 0.8;

            const avGrp = g.append("g")
                .attr("transform", `translate(${dx}, ${dy})`);

            // ... Render Avatar Content into avGrp ...
            // (Copy existing avatar rendering code here)

            const color = getGenColor(d); // Shared generation color

            // ... Code from below ...
            // Helper for Initials
            const getInitials = (name) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

            // Helper for Avatar Color
            const avatarColors = ["#e57373", "#f06292", "#ba68c8", "#9575cd", "#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1", "#4db6ac", "#81c784", "#aed581", "#dce775", "#fff176", "#ffd54f", "#ffb74d", "#ff8a65"];
            const getAvatarColor = (name) => {
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                return avatarColors[Math.abs(hash) % avatarColors.length];
            };

            // Scale for internal geometry
            const scale = 0.8;
            const localIso = (dx, dy) => [(dx - dy) * scale, (dx + dy) * 0.5 * scale];

            const w = tileW;
            // const h = tileH;
            const r = tileR;

            // Bounds relative to center
            const l = -w / 2, right = w / 2, t = -w / 2, b = w / 2;

            // Helper to project local coord (lx, ly, lz) -> 2D
            const pLoc = (lx, ly, lz) => {
                const [ix, iy] = localIso(lx, ly);
                return [ix, iy - lz];
            };

            const tz = tileH;

            // --- Paths ---
            // --- Paths ---
            // Tangent points for Top Face
            const top_tz = tz;
            const t_l_t = pLoc(l, t + r, top_tz);
            const t_l_b = pLoc(l, b - r, top_tz);
            const t_b_l = pLoc(l + r, b, top_tz);
            const t_b_r = pLoc(right - r, b, top_tz);
            const t_r_b = pLoc(right, b - r, top_tz);
            const t_r_t = pLoc(right, t + r, top_tz);
            const t_t_r = pLoc(right - r, t, top_tz);
            const t_t_l = pLoc(l + r, t, top_tz);

            // Control Points
            const cp_l_t = pLoc(l, t, top_tz);
            const cp_l_b = pLoc(l, b, top_tz);
            const cp_r_b = pLoc(right, b, top_tz);
            const cp_r_t = pLoc(right, t, top_tz);

            const topPathIdx = `M ${t_l_t} L ${t_l_b} Q ${cp_l_b} ${t_b_l} L ${t_b_r} Q ${cp_r_b} ${t_r_b} L ${t_r_t} Q ${cp_r_t} ${t_t_r} L ${t_t_l} Q ${cp_l_t} ${t_l_t} Z`;

            // Side Wall (Simplified to Visible Faces)
            // Visible faces: Bottom edge and Right edge
            // Fix: Use overlapZ to tuck side skirt under top face
            const overlapZ = 1;
            const skirt_tz = tz + overlapZ;

            // Top Edge Points for Skirt (Raised)
            const st_l_b = pLoc(l, b - r, skirt_tz);
            const st_b_l = pLoc(l + r, b, skirt_tz);
            const st_b_r = pLoc(right - r, b, skirt_tz);
            const st_r_b = pLoc(right, b - r, skirt_tz);
            const st_r_t = pLoc(right, t + r, skirt_tz);

            const scp_l_b = pLoc(l, b, skirt_tz);
            const scp_r_b = pLoc(right, b, skirt_tz);

            // Bottom Edge Points (Z=0)
            const bz = 0;
            const b_t_l_b = pLoc(l, b - r, bz);
            const b_cp_l_b = pLoc(l, b, bz);
            const b_t_b_l = pLoc(l + r, b, bz);
            const b_t_b_r = pLoc(right - r, b, bz);
            const b_cp_r_b = pLoc(right, b, bz);
            const b_t_r_b = pLoc(right, b - r, bz);
            const b_t_r_t = pLoc(right, t + r, bz);

            // Construct Loop for Side skirt using Raised Top Points
            const sidePath = `
                 M ${st_r_t}
                 L ${st_r_b} Q ${scp_r_b} ${st_b_r}
                 L ${st_b_l} Q ${scp_l_b} ${st_l_b}
                 L ${st_l_b}
                 L ${b_t_l_b} Q ${b_cp_l_b} ${b_t_b_l}
                 L ${b_t_b_r} Q ${b_cp_r_b} ${b_t_r_b}
                 L ${b_t_r_t}
                 L ${st_r_t} Z`;

            // Draw Side (Solid Block)
            avGrp.append("path")
                .attr("d", sidePath)
                .attr("fill", d3.color(color).darker(0.8)) // Darker side for 3D effect
                .attr("stroke", d3.color(color).darker(1.0))
                .attr("stroke-width", 1)
                .attr("stroke-linejoin", "round");

            // Draw Top (Solid Block)
            const tileColor = data.isMe ? "#0D8ABC" : getAvatarColor(data.name);

            // Solid Color
            avGrp.append("path")
                .attr("id", `tile - path - ${data.id} `)
                .attr("d", topPathIdx)
                .attr("fill", tileColor) // Solid fill
                .attr("stroke", "white")
                .attr("stroke-width", 2);

            // Initials (Native SVG Text)
            const matrix = "0.8, 0.4, -0.8, 0.4, 0, 0";

            avGrp.append("text")
                .text(getInitials(data.name))
                .attr("x", 0)
                .attr("y", 0)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("fill", "rgba(255,255,255, 0.9)")
                .attr("font-size", "22px")
                .attr("font-weight", "bold")
                .style("font-family", "sans-serif")
                .style("pointer-events", "none")
                // Add a subtle drop shadow to initials
                .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.3)")
                .attr("transform", `translate(0, ${- tz}) matrix(${matrix})`);

            // Overlay for "Me" border
            if (data.isMe) {
                avGrp.append("use")
                    .attr("xlink:href", `#tile - path - ${data.id} `)
                    .attr("fill", "none")
                    .attr("stroke", "#FFD700")
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.8);
            }

            // --- Text Below Block (Billboard - Flat 2D) ---
            // We want the text to float underneath the block.
            // The block is centered at (0,0) in avGrp local coords (which is top-face center).
            // We need to move down by the block height + some padding.
            // However, we are in ISOMETRIC VIEW. "Down" on screen is +Y.



            // --- Text Below Block (Isometric - Lying Flat) ---
            // User requested "direction of user icon", implying isometric projection.
            // We use the same matrix as the top face for consistency.
            // Top Face Matrix (basis vectors): X=(0.8, 0.4), Y=(-0.8, 0.4)
            // But we actually want the text to read horizontally-ish? 
            // If we use the exact top-face matrix, text runs along the diagonal.
            // Let's align it with the "Row" axis (Visual X).

            // Revert to "Floor" style but centered and clean (No pill).

            // We need to move it "down" in 3D space.
            // In tree space, +y is "depth/down".
            // So we can just translate in the group transform?
            // But this group is inside `g` which is at (ix, iy).
            // A visual Y offset of +50px moves it down-screen.

            // Matrix to make it look like it's on the plane:
            // Standard Iso: rotate(-30) skewX(30)? 
            // Let's use the explicit matrix for control.
            // We want the text baseline to align with the Row Axis (Down-Right).
            // That vector is (1, 0.5) roughly.

            // Let's use the Top Face matrix:
            const textMatrix = "0.8, 0.4, -0.8, 0.4, 0, 0";

            // Position:
            // We want it centered under the block.
            // The block center in `avGrp` is (0,0).
            // But with the matrix, (0,0) is the origin of the text coordinate system.
            // We need to offset y "visually down".
            // In the transformed space, +x moves Down-Right, +y moves Down-Left.
            // To move Straight Down? (+y visual).
            // (0.8x - 0.8y, 0.4x + 0.4y) = (0, 50).
            // 0.8(x-y) = 0 => x=y.
            // 0.4(2x) = 50 => 0.8x = 50 => x = 62.5.
            // So translate(62.5, 62.5) in local space moves strictly down?

            const textYOffset = 50;

            // Helper to truncate text
            const truncate = (str, n) => (str && str.length > n) ? str.slice(0, n - 3) + "..." : str;

            const textG = avGrp.append("g")
                .attr("transform", `translate(0, ${textYOffset}) matrix(${textMatrix})`);

            // Name
            const nameText = textG.append("text")
                .text(truncate(data.name, 15)) // Truncate name
                .attr("text-anchor", "middle")
                .attr("fill", "#222")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .style("font-family", "sans-serif");

            nameText.append("title").text(data.name); // Tooltip

            // Relation
            if (!data.isMe) {
                const relationText = textG.append("text")
                    .text(truncate(data.relation, 20)) // Truncate relation
                    .attr("text-anchor", "middle")
                    .attr("y", 14)
                    .attr("fill", "#555")
                    .attr("font-size", "10px")
                    .style("font-family", "sans-serif")
                    .style("text-transform", "uppercase");

                relationText.append("title").text(data.relation); // Tooltip
            }
        };

        renderAvatar(d.data, false);
        if (d.data.spouse) {
            renderAvatar(d.data.spouse, true);
        }

    });// Zoom

    const zoom = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    svg.call(zoom);

    // Auto Zoom to Fit (3D)
    // Use timeout to allow layout to settle (calculating BBox of complex paths)
    setTimeout(() => {
        try {
            const bounds = g.node().getBBox();
            if (bounds.width > 0 && bounds.height > 0) {
                const scale = Math.min(1.0, (width - 100) / bounds.width, (height - 100) / bounds.height);
                const midX = bounds.x + bounds.width / 2;
                const midY = bounds.y + bounds.height / 2;

                const t = d3.zoomIdentity
                    .translate(width / 2 - midX * scale, height / 2 - midY * scale)
                    .scale(scale);

                svg.transition().duration(750).call(zoom.transform, t);
            } else {
                // Fallback
                const initialTransform = d3.zoomIdentity.translate(width / 2, 100).scale(0.5);
                svg.call(zoom.transform, initialTransform);
            }
        } catch (e) {
            console.error("Auto-zoom failed", e);
            const initialTransform = d3.zoomIdentity.translate(width / 2, 100).scale(0.5);
            svg.call(zoom.transform, initialTransform);
        }
    }, 50);
}


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

    const treeLayout = d3.tree()
        .nodeSize([cardHeight * 2 + 50, cardWidth + 120]) // Height, Width spacing (Increased width to fix "sticked" connections)
        .separation((a, b) => a.parent == b.parent ? 1.1 : 1.25);

    treeLayout(root);

    // Links
    g.selectAll(".tree-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "tree-link")
        .attr("d", d => {
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
            if (midX - s.x < minGap && (t.x - s.x) > minGap * 2) {
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
    const nodes = g.selectAll(".tree-node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "tree-node")
        // Swap X and Y for translation
        .attr("transform", d => `translate(${d.y}, ${d.x})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    const renderVCard = (selection, data, isSpouse = false) => {
        const yOffset = isSpouse ? (cardHeight + 20) : 0; // Fixed gap
        const grp = selection.append("g")
            .attr("transform", `translate(0, ${yOffset})`);

        // Card Background
        if (familyData.node_style !== "circle") {
            grp.append("rect")
                .attr("x", -cardWidth / 2)
                .attr("y", -cardHeight / 2)
                .attr("width", cardWidth)
                .attr("height", cardHeight)
                .attr("rx", 10)
                .attr("class", "tree-card-bg");
        }

        const clipId = `vclip-${data.id}`;
        grp.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", 20)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0);

        grp.append("image")
            .attr("xlink:href", data.photo)
            .attr("x", -cardWidth / 2 + 10)
            .attr("y", -20)
            .attr("width", 40)
            .attr("height", 40)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");

        grp.append("circle")
            .attr("r", 21)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0)
            .attr("fill", "none")
            .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
            .attr("stroke-width", data.isMe ? 4 : 1.5);

        const textGroup = grp.append("g")
            .attr("transform", `translate(${- cardWidth / 2 + 60}, 0)`);

        textGroup.append("text")
            .attr("class", "tree-card-name")
            .attr("y", -2)
            .text(data.name);

        textGroup.append("text")
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
    const zoom = d3.zoom()
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
    if (view === "tree") {
        initTree();
    } else if (view === "vertical-tree") {
        initVerticalTreeV2();
    }

    if (view === "fan") {
        document.getElementById("fan-controls").style.display = "flex";
        fanHistory = []; // Reset history when entering Fan View
        currentFanRootId = null;
        initFan();
    } else {
        document.getElementById("fan-controls").style.display = "none";

        // Re-run init only if it wasn't handled above? 
        // Wait, switchView logic:
        // if globe -> initGlobe
        // else if tree -> initTree
        // else if vert -> initVert
        // else if fan -> initFan
        // else if iso -> initIso

        // My previous logic was trying to handle visibility toggle AND init.
        // Let's simplify.

        if (view === "isometric") {
            init3DTree();
        }
    }
}

// Checkbox Listener
document.getElementById("ancestor-mode").addEventListener("change", (e) => {
    ancestorMode = e.target.checked;
    if (currentView === "fan") initFan();
});

// Button Listeners
document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const view = e.target.dataset.view;

        // Update Buttons UI
        document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");

        switchView(view);
    });
});

// Resize Listener
window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);

    if (currentView === 'tree') {
        initTree();
    } else if (currentView === 'vertical-tree') {
        initVerticalTreeV2();
    } else if (currentView === 'fan') {
        initFan();

    } else if (currentView === 'isometric') {
        init3DTree();
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
    const maxDepth = d3.max(root.descendants(), d => d.depth);
    const depthStep = cardWidth + 100; // REDUCED Spacing (was 200)
    const totalWidth = maxDepth * depthStep;

    const treeLayout = d3.tree()
        .nodeSize([1, depthStep]) // Unit spacing for custom separation
        .separation((a, b) => {
            // "First Generation" (Depth 1 - Children of Root) specific spacing
            const isGen1 = a.depth === 1 && b.depth === 1;

            let sep = isGen1 ? 65 : 80; // Reduced base Spacing (was 80/110)

            const addSpacing = (d) => {
                let s = 0;
                // Spouse spacing
                if (d.data.spouse) s += isGen1 ? 65 : 80; // Reduced (was 80/100)
                if (d.data.spouse && d.data.spouse.parents && d.data.spouse.parents.length > 0) s += 40; // Reduced (was 60)
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
        "#FF3D00"  // Deep Orange
    ]);

    // REPLACING LINK LOGIC START
    const linkSel = g.selectAll(".tree-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "tree-link")
        .attr("data-link-type", "main-tree") // Mark as main tree link for trace feature
        .attr("d", d => {
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
    const nodes = g.selectAll(".tree-node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "tree-node")
        // Swap X and Y for translation
        .attr("transform", d => `translate(${getX(d)}, ${getY(d)})`)
        // Click removed from here to allow individual card clicks
        .style("cursor", "border");

    const renderVCard = (selection, data, isSpouse = false) => {
        const truncate = (str, n) => (str && str.length > n) ? str.slice(0, n - 3) + "..." : str;
        const yOffset = isSpouse ? (cardHeight + 20) : 0; // Fixed gap
        const grp = selection.append("g")
            .attr("transform", `translate(0, ${yOffset})`);

        // Card Background
        grp.append("rect")
            .attr("x", -cardWidth / 2)
            .attr("y", -cardHeight / 2)
            .attr("width", cardWidth)
            .attr("height", cardHeight)
            .attr("rx", 10)
            .attr("fill", "url(#card-gradient)") // Use SVG Gradient
            .attr("class", "tree-card-bg");

        // Add Click Listener to specific card
        grp.style("cursor", "pointer")
            .on("click", (event) => {
                event.stopPropagation();
                // Wrap data to match showModal expectation (d.data...)
                showModal({ data: data });
            });

        const clipId = `vclip-${data.id}`;
        grp.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", 20)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0);

        grp.append("image")
            .attr("xlink:href", data.photo)
            .attr("x", -cardWidth / 2 + 10)
            .attr("y", -20)
            .attr("width", 40)
            .attr("height", 40)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");

        grp.append("circle")
            .attr("r", 21)
            .attr("cx", -cardWidth / 2 + 30)
            .attr("cy", 0)
            .attr("fill", "none")
            .attr("stroke", data.isMe ? "#FFD700" : "#4ecca3")
            .attr("stroke-width", data.isMe ? 4 : 1.5);

        const textGroup = grp.append("g")
            .attr("transform", `translate(${- cardWidth / 2 + 60}, 0)`);

        textGroup.append("text")
            .attr("class", "tree-card-name")
            .attr("y", -2)
            .text(truncate(data.name, 15))
            .append("title")
            .text(data.name);

        textGroup.append("text")
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
                const p1Grp = el.append("g").attr("transform", `translate(${parentXOffset}, ${p1Y})`);
                renderVCard(p1Grp, p1, false);

                // Render Parent 2 (Mother)
                const p2Y = spouseYOffset + 40;
                const p2Grp = el.append("g").attr("transform", `translate(${parentXOffset}, ${p2Y})`);
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
    const zoom = d3.zoom()
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
    if (currentView === 'vertical-tree') {
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
d3.json("data.json").then(data => {
    // Store Raw Data
    rawFamilyData = data.data || data; // Handle {data: []} or []

    // Transform data if it's in API format
    familyData = transformFamilyData(data);

    if (!familyData) {
        throw new Error("Failed to transform family data");
    }

    initApp();

    // Show Success Toast
    const toast = d3.select("body").append("div")
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
}).catch(error => {
    console.error("Error loading data.json:", error);

    // Show Error on Screen
    d3.select("body").append("div")
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
        .style("z-index", "9999")
        .html(`
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


