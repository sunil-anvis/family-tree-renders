// --- 1. Data & Global Setup ---
let familyData;

// Initialize App


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
    modalBody.html(`
    <div class="modal-profile">
        <img src="${d.data.photo}" alt="${d.data.name}" class="modal-image">
            <h2 class="modal-name">${d.data.name}</h2>
            <p class="modal-info">${d.data.relation} &bull; ${d.data.age} yrs &bull; ${d.data.gender}</p>
            <p class="modal-location">&#x1F4CD; ${d.data.location}</p>
        </div>
`);
    modal.style("pointer-events", "all")
        .transition().duration(200)
        .style("opacity", 1);
}

// State
let currentView = 'globe'; // 'globe' or 'tree'
let ancestorMode = false;
let globeData = { countries: null, states: null, rivers: null, cities: null };

// --- 2. Globe Logic ---
let projection, path, globeGroup, landGroup, stateGroup, riverGroup, cityGroup, linkGroup, nodeGroup, dragBehavior, zoomBehavior;

function initGlobe() {
    svg.selectAll("*").remove(); // Clear SVG
    svg.on(".zoom", null); // Clear global zoom if any

    // Re-create Groups (Order matters for layering)
    // 1. Set Background for Globe View (Space Galaxy)
    svg.style("background", "radial-gradient(circle at center, #02111b 0%, #000000 100%)");

    globeGroup = svg.append("g");  // Water + Graticules
    landGroup = svg.append("g");   // Landmasses (Countries)
    stateGroup = svg.append("g");  // States/Provinces
    riverGroup = svg.append("g");  // Rivers
    linkGroup = svg.append("g");   // Links

    // Cities should be above land/rivers but below nodes
    cityGroup = svg.append("g");   // Cities

    nodeGroup = svg.append("g");   // Family Nodes

    // Projection Setup
    projection = d3.geoOrthographic()
        .scale(300)
        .center([0, 0])
        .rotate([-70, -20])
        .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);
    const graticule = d3.geoGraticule();

    // Background Sphere (Water)
    globeGroup.append("path")
        .datum({ type: "Sphere" })
        .attr("class", "globe-water")
        .attr("d", path)
        .attr("fill", "#0077be") // Ocean Blue
        .attr("stroke", "#005E99")
        .attr("stroke-width", 1);

    // Graticules
    globeGroup.append("path")
        .datum(graticule)
        .attr("class", "globe-graticule")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.3)
        .attr("stroke-opacity", 0.2);

    // Initial Loading State
    const loadingText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "20px")
        .text("Loading Detailed Maps...");

    // Data Fetching
    if (globeData.countries && globeData.states && globeData.rivers && globeData.cities) {
        loadingText.remove();
        renderLayers();
        autoZoomToFamily();
    } else {
        Promise.all([
            // Countries (Base)
            d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
            // States (Admin 1 - 10m)
            d3.json("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson"),
            // Rivers (10m)
            d3.json("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson"),
            // Cities (Populated Places - 10m)
            d3.json("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson")
        ]).then(([countries, states, rivers, cities]) => {
            globeData = { countries, states, rivers, cities };
            loadingText.remove();
            renderLayers();
            autoZoomToFamily();
        }).catch(err => {
            console.error("Map load failed", err);
            loadingText.text("Failed to load maps.");
        });
    }

    function renderLayers() {
        // 1. Countries
        const countryFeatures = globeData.countries.features || globeData.countries;
        landGroup.selectAll(".globe-land")
            .data(countryFeatures)
            .enter().append("path")
            .attr("class", "globe-land")
            .attr("d", path)
            .attr("fill", "#2d6a4f") // Earth Green
            .attr("stroke", "#40916c")
            .attr("stroke-width", 0.5);

        // Country Labels (Base Layer)
        landGroup.selectAll(".country-label")
            .data(countryFeatures)
            .enter().append("text")
            .attr("class", "country-label")
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("font-family", "sans-serif")
            .style("fill", "#fff")
            .style("opacity", 0.5)
            .style("pointer-events", "none")
            .text(d => d.properties.name)
            .style("display", "none");

        // 2. States (Initially empty/hidden handled by updateGlobe, but we render DOM elements here)
        stateGroup.selectAll(".globe-state")
            .data(globeData.states.features)
            .enter().append("path")
            .attr("class", "globe-state")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.3)
            .attr("stroke-opacity", 0.3)
            .style("display", "none"); // Hidden by default

        // 3. Rivers
        riverGroup.selectAll(".globe-river")
            .data(globeData.rivers.features)
            .enter().append("path")
            .attr("class", "globe-river")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#4CC9F0") // River Blue
            .attr("stroke-width", 0.5)
            .style("display", "none"); // Hidden by default

        // 4. Cities
        // Filter to reasonable subset to avoid DOM explosion before culling loop
        // We'll render them all but hide them
        cityGroup.selectAll(".globe-city")
            .data(globeData.cities.features)
            .enter().append("circle")
            .attr("class", "globe-city")
            .attr("r", 1) // Tiny dots
            .attr("fill", "#fff")
            .style("opacity", 0.8)
            .style("display", "none");

        cityGroup.selectAll(".city-label")
            .data(globeData.cities.features)
            .enter().append("text")
            .attr("class", "city-label")
            .attr("text-anchor", "start")
            .attr("dx", 3)
            .attr("dy", 1)
            .style("font-size", "6px")
            .style("font-family", "sans-serif")
            .style("fill", "#ddd")
            .style("pointer-events", "none")
            .text(d => d.properties.NAME)
            .style("display", "none");
    }

    // Process Hierarchy for Globe Nodes (On top of everything)
    const root = d3.hierarchy(familyData);
    const nodes = root.descendants();
    const links = root.links();

    // Links
    const linkElements = linkGroup.selectAll(".geo-link")
        .data(links)
        .enter().append("path")
        .attr("class", "geo-link")
        .attr("fill", "none")
        .attr("stroke", "#FFD700")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);

    // Nodes
    const nodeElements = nodeGroup.selectAll(".geo-node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "geo-node")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    nodeElements.append("circle")
        .attr("r", d => d.data.isMe ? 8 : 6)
        .classed("heartbeat", d => d.data.isMe)
        .attr("fill", d => d.data.isMe ? "#FFD700" : "#ff0000")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    nodeElements.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("text-shadow", "0 2px 4px black")
        .style("font-family", "sans-serif")
        .text(d => d.data.name);

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
            landGroup.selectAll(".country-label")
                .each(function (d) {
                    const el = d3.select(this);
                    const centroid = d3.geoCentroid(d);
                    const dist = d3.geoDistance(center, centroid);

                    if (dist > 1.57) {
                        el.style("display", "none");
                    } else {
                        const coords = projection(centroid);
                        if (coords) {
                            el.attr("transform", `translate(${coords[0]}, ${coords[1]})`);
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
                stateGroup.selectAll("path")
                    .style("display", null) // Show
                    .attr("d", currentPath);
            } else {
                stateGroup.selectAll("path").style("display", "none");
            }
        }

        // 3. Rivers (LOD: Scale > 800)
        if (riverGroup.selectAll("path").size() > 0) {
            if (scale > 800) {
                riverGroup.selectAll("path")
                    .style("display", null)
                    .attr("d", currentPath);
            } else {
                riverGroup.selectAll("path").style("display", "none");
            }
        }

        // 4. Cities (LOD: Scale > 1000)
        if (cityGroup.selectAll("circle").size() > 0) {
            if (scale > 1000) {
                cityGroup.selectAll(".globe-city")
                    .each(function (d) {
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

                cityGroup.selectAll(".city-label")
                    .each(function (d) {
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
        linkElements.attr("d", d => {
            const source = d.source.data.coords;
            const target = d.target.data.coords;
            return currentPath({
                type: "LineString",
                coordinates: [source, target]
            });
        });

        nodeElements.attr("transform", d => {
            const coords = projection(d.data.coords);
            return coords ? `translate(${coords[0]}, ${coords[1]})` : "translate(0,0)";
        });

        nodeElements.style("display", d => {
            const dist = d3.geoDistance(center, d.data.coords);
            return dist > 1.57 ? "none" : "block";
        });
    }

    // Interaction
    dragBehavior = d3.drag()
        .on("drag", (event) => {
            const rotate = projection.rotate();
            const k = 75 / projection.scale();
            projection.rotate([
                rotate[0] + event.dx * k,
                rotate[1] - event.dy * k
            ]);
            updateGlobe();
        });

    zoomBehavior = d3.zoom()
        .scaleExtent([200, 10000]) // Allow SUPER deep zoom (10k)
        .on("zoom", (event) => {
            projection.scale(event.transform.k);
            updateGlobe();
        });

    svg.call(dragBehavior);
    svg.call(zoomBehavior).call(zoomBehavior.transform, d3.zoomIdentity.scale(projection.scale()));

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
            coordinates: coords
        });

        // Rotate to center
        projection.rotate([-center[0], -center[1]]);

        // Super Zoom to show details!
        const targetScale = 2500; // Deep zoom to see cities
        projection.scale(targetScale);

        // Update view
        svg.call(zoomBehavior.transform, d3.zoomIdentity.scale(targetScale));
        updateGlobe();
    }
}

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
            .text(data.name);

        textGroup.append("text")
            .attr("class", "tree-card-relation")
            .attr("y", 12)
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

// --- 4. Fan Logic ---
// --- 4. Fan Logic ---
// --- 4. Fan Logic ---
function initFan(startNodeId = null) {
    // 1. Update Dimensions on Init (Fixes centering if resized)
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);

    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 3. Set Background for Fan View (Black)
    svg.style("background", "black");

    const radius = Math.min(width, height) * 0.45;

    // --- 1. Define Extra Data (Virtual Nodes for Fan View) ---
    // These are not in the main tree but needed for the "Me-centric" view
    const extraNodes = [
        // Mother's Side
        /* Moved Mother to Spouse of Father */
        { id: "mg1", name: "Grandmother", age: 75, gender: "Female", location: "Mumbai, India", photo: "https://ui-avatars.com/api/?name=Grand+Mother&background=random", relation: "Maternal Grandmother" },
        { id: "mgf1", name: "Grandfather", age: 80, gender: "Male", location: "Mumbai, India", photo: "https://ui-avatars.com/api/?name=Grand+Father&background=random", relation: "Maternal Grandfather" },
        { id: "mu1", name: "Mat Uncle", age: 50, gender: "Male", location: "Pune, India", photo: "https://ui-avatars.com/api/?name=Maternal+Uncle&background=random", relation: "Maternal Uncle" },
        { id: "ma1", name: "Mat Aunt", age: 45, gender: "Female", location: "Delhi, India", photo: "https://ui-avatars.com/api/?name=Maternal+Aunt&background=FF69B4&color=fff", relation: "Maternal Aunt" },
        // Cousins from Mother's side
        // Cousins from Mother's side
        { id: "mc1", name: "Mat Cousin", age: 20, gender: "Male", location: "Pune, India", photo: "https://ui-avatars.com/api/?name=Mat+Cousin&background=random", relation: "Cousin" },
        // Uneven Additions (Ring 3)
        { id: "mc2", name: "Mat Cousin 2", age: 18, gender: "Female", location: "Delhi, India", photo: "https://ui-avatars.com/api/?name=Mat+Cousin+2&background=random", relation: "Cousin" },
        { id: "mu_wife", name: "Mat Aunt In Law", age: 45, gender: "Female", location: "Pune, India", photo: "https://ui-avatars.com/api/?name=Aunt+Law&background=random", relation: "Aunt-in-Law" },

        // Brother's Side
        { id: "sil1", name: "Sister-in-Law", age: 22, gender: "Female", location: "London, UK", photo: "https://ui-avatars.com/api/?name=Sis+In+Law&background=FF69B4&color=fff", relation: "Sister-in-Law" },
        { id: "nep1", name: "Nephew", age: 2, gender: "Male", location: "London, UK", photo: "https://ui-avatars.com/api/?name=Nephew&background=random", relation: "Nephew" },
        // Uneven (Ring 3)
        { id: "sil_dad", name: "Sarah's Dad", age: 55, gender: "Male", location: "London, UK", photo: "https://ui-avatars.com/api/?name=Sarah+Dad&background=random", relation: "In-Law" },

        // Sister's Side
        { id: "bil1", name: "Brother-in-Law", age: 24, gender: "Male", location: "London, UK", photo: "https://ui-avatars.com/api/?name=Bro+In+Law&background=random", relation: "Brother-in-Law" },
        { id: "nie1", name: "Niece", age: 1, gender: "Female", location: "Dubai, UAE", photo: "https://ui-avatars.com/api/?name=Niece&background=FF69B4&color=fff", relation: "Niece" },
        // Uneven (Ring 3)
        { id: "bil_mom", name: "John's Mom", age: 50, gender: "Female", location: "Dubai, UAE", photo: "https://ui-avatars.com/api/?name=John+Mom&background=random", relation: "In-Law" },
        { id: "bil_bro", name: "John's Bro", age: 20, gender: "Male", location: "Dubai, UAE", photo: "https://ui-avatars.com/api/?name=John+Bro&background=random", relation: "In-Law" },

        // Father's Side Uneven
        { id: "gr_uncle", name: "Great Uncle", age: 80, gender: "Male", location: "Village", photo: "https://ui-avatars.com/api/?name=Great+Uncle&background=random", relation: "Great Uncle" },
        /* Paternal Grandmother moved to Spouse of Root */
    ];

    // --- 2. Build Graph (Adjacency List) ---
    const allNodesMap = new Map();
    const adj = new Map();

    // Helper to add Edge (Undirected)
    const addEdge = (id1, id2) => {
        if (allNodesMap.has(id1) && allNodesMap.has(id2)) {
            adj.get(id1).push(id2);
            adj.get(id2).push(id1);
        }
    };

    // Helper to add node
    const addNode = (n) => {
        if (!allNodesMap.has(n.id)) {
            allNodesMap.set(n.id, n);
            adj.set(n.id, []);
        }
    };

    // Add Main Tree Nodes
    const mainRoot = d3.hierarchy(familyData);
    mainRoot.descendants().forEach(d => {
        // Flatten data structure (we just need the data object)
        addNode(d.data);
        // Also add spouse if exists
        if (d.data.spouse) {
            // Ensure spouse has an ID if not present
            if (!d.data.spouse.id) d.data.spouse.id = d.data.id + "_spouse";
            addNode(d.data.spouse);
            addEdge(d.data.id, d.data.spouse.id); // Connect spouses
        }
    });

    // Add Extra Nodes
    extraNodes.forEach(addNode);

    // A. Add Tree Edges (Parent-Child)
    mainRoot.links().forEach(link => {
        addEdge(link.source.data.id, link.target.data.id);
    });

    // B. Add Sibling Edges (Virtual)
    // Connect all children of the same parent
    mainRoot.descendants().forEach(d => {
        if (d.children) {
            for (let i = 0; i < d.children.length; i++) {
                for (let j = i + 1; j < d.children.length; j++) {
                    addEdge(d.children[i].data.id, d.children[j].data.id);
                }
            }
        }
    });

    // C. Add Custom Edges (The "Me" centering logic)
    // Find "Me"
    const meNode = mainRoot.descendants().find(d => d.data.name === "Me")?.data;
    const fatherNode = mainRoot.descendants().find(d => d.data.name === "Father")?.data;
    const brotherNode = mainRoot.descendants().find(d => d.data.name === "Brother")?.data;
    const sisterNode = mainRoot.descendants().find(d => d.data.name === "Sister")?.data;
    // Grandfather linked to Great Uncle
    const grandFatherNode = mainRoot.descendants().find(d => d.data.name === "Grandfather")?.data;


    if (meNode) {
        // Me <-> Mother
        addEdge(meNode.id, "m1"); // Mother
    }

    // Mother Setup
    // Mother <-> Father (Spouses)
    if (fatherNode) addEdge("m1", fatherNode.id);
    // Mother <-> Parents (Maternal Grandparents)
    addEdge("m1", "mg1");
    addEdge("m1", "mgf1");
    // Mother <-> Siblings (Maternal Uncle/Aunt)
    addEdge("m1", "mu1");
    addEdge("m1", "ma1");
    // Maternal Uncle <-> Mat Cousin
    addEdge("mu1", "mc1");
    addEdge("mu1", "mu_wife"); // Wife
    // Maternal Aunt <-> Mat Cousin 2
    addEdge("ma1", "mc2");


    // Brother Link
    if (brotherNode) {
        addEdge(brotherNode.id, "sil1"); // Wife
        addEdge(brotherNode.id, "nep1"); // Child
        addEdge("sil1", "sil_dad"); // Wife's Dad (Ring 3)
    }

    // Sister <-> Brother-in-Law
    if (sisterNode) {
        addEdge(sisterNode.id, "bil1"); // Husband
        addEdge(sisterNode.id, "nie1"); // Child
        addEdge("bil1", "bil_mom"); // Husband's Mom (Ring 3)
        addEdge("bil1", "bil_bro"); // Husband's Brother (Ring 3)
    }

    // Father Side
    if (grandFatherNode) {
        addEdge(grandFatherNode.id, "gr_uncle"); // Sibling
    }
    // Father <-> Paternal Grandmother (Already Handled by Spouse Logic above)
    // Removed old manual link code




    // --- 3. BFS to Build Hierarchy from "Me" ---
    // Start BFS from "Me" or selected Start Node
    const rootId = startNodeId || (ancestorMode ? "root" : "root");
    const rootNode = allNodesMap.get(rootId);

    if (!rootNode) {
        console.error("Fan Root not found:", rootId);
        return;
    }

    const newRoot = { ...rootNode, children: [] };
    // Map to track new hierarchy nodes to attach children
    const hierMap = new Map();
    hierMap.set(rootNode.id, newRoot);

    const visited = new Set([rootNode.id]);
    const queue = [{ id: rootNode.id, depth: 0, node: newRoot }];

    // We need to reconstruct a tree for D3 pack/tree/partition
    // Level 0: Me
    // Level 1: Neighbors of Me
    // Level 2: Neighbors of Level 1 (excluding visited)

    // --- 3. Ancestor Mode Filter ---
    // Create ancestor-only adjacency list
    const ancestorAdj = new Map();
    if (ancestorMode) {
        // Only Add Child->Parent links
        // Main Tree: children -> parent
        mainRoot.descendants().forEach(d => {
            if (d.parent) {
                // Direction: Child (d.data.id) -> Parent (d.parent.data.id)
                if (!ancestorAdj.has(d.data.id)) ancestorAdj.set(d.data.id, []);
                ancestorAdj.get(d.data.id).push(d.parent.data.id);
            }
        });

        // Extra Nodes: Manually defined
        // Me -> Mother
        if (meNode) {
            if (!ancestorAdj.has(meNode.id)) ancestorAdj.set(meNode.id, []);
            ancestorAdj.get(meNode.id).push("m1");
        }
        // Mother -> Grandparents
        if (!ancestorAdj.has("m1")) ancestorAdj.set("m1", []);
        ancestorAdj.get("m1").push("mg1");
        ancestorAdj.get("m1").push("mgf1");

        // Paternal Line (Ancestors)
        // Me -> Father
        if (meNode && fatherNode) {
            if (!ancestorAdj.has(meNode.id)) ancestorAdj.set(meNode.id, []);
            ancestorAdj.get(meNode.id).push(fatherNode.id);
        }

        // Father -> Grandfather
        if (fatherNode && grandFatherNode) {
            if (!ancestorAdj.has(fatherNode.id)) ancestorAdj.set(fatherNode.id, []);
            ancestorAdj.get(fatherNode.id).push(grandFatherNode.id);
        }

        // Father -> Paternal Grandmother (Spouse of Grandfather)
        if (fatherNode && grandFatherNode && grandFatherNode.spouse) {
            if (!ancestorAdj.has(fatherNode.id)) ancestorAdj.set(fatherNode.id, []);
            ancestorAdj.get(fatherNode.id).push(grandFatherNode.spouse.id);
        }

        // Note: adj is undirected. BFS uses adj. We replace adj access.
    }

    while (queue.length > 0) {
        const { id, depth, node } = queue.shift();

        if (depth >= 4) continue; // Limit Depth (BFS layer limit)

        // Select neighbors based on mode
        let neighbors = [];
        if (ancestorMode) {
            neighbors = ancestorAdj.get(id) || [];
        } else {
            neighbors = adj.get(id) || [];
        }

        neighbors.forEach(nid => {
            if (!visited.has(nid)) {
                visited.add(nid);
                const originalData = allNodesMap.get(nid);
                // In Ancestor Mode, verify we aren't adding non-ancestors?
                // The ancestorAdj should strictly only contain parents.

                const newNode = { ...originalData, children: [], dist: depth + 1 };

                // Attach to parent in new hierarchy
                node.children.push(newNode);

                queue.push({ id: nid, depth: depth + 1, node: newNode });
            }
        });
    }

    // --- 4. Layout & Rendering ---
    const fanRoot = d3.hierarchy(newRoot)
        .sort((a, b) => (a.data.dist - b.data.dist) || a.data.name.localeCompare(b.data.name));

    // Color Scale based on Distance
    const colorScale = d3.interpolateRainbow; // or custom

    // Color Setup: Exact Palettes from Image (Inner -> Middle -> Outer)
    const palettes = [
        ["#fcfbdc", "#e3f0af", "#a5d296"], // Yellow-Green
        ["#e3f9f3", "#98e6d6", "#45cbb6"], // Teal/Cyan
        ["#e0f2fe", "#9ad7fe", "#4fc3f7"], // Light Blue
        ["#f0f4ff", "#c7d2fe", "#818cf8"], // Periwinkle/Blue
        ["#f5f3ff", "#ddd6fe", "#a78bfa"], // Purple
        ["#fdf2f8", "#fbcfe8", "#f472b6"], // Pink
        ["#fff1f2", "#fecdd3", "#fb7185"], // Red/Salmon
        ["#fff7ed", "#fed7aa", "#fb923c"], // Orange
    ];

    fanRoot.each(d => {
        if (d.depth === 0) {
            d.color = "#fefceb"; // Me is Off-White
            return;
        }

        // Determine Branch
        let ancestor = d;
        while (ancestor.depth > 1) {
            ancestor = ancestor.parent;
        }

        // Branch Index
        const branchIndex = fanRoot.children.indexOf(ancestor);
        const palette = palettes[branchIndex % palettes.length];

        // Assign Color based on Depth
        // Depth 1 -> Index 0
        // Depth 2 -> Index 1
        // Depth 3+ -> Index 2 (or cycle if more depth)
        const colorIndex = Math.min(d.depth - 1, 2);
        d.color = palette[colorIndex];
    });

    // Custom Partition/Fan Layout

    // 1. Calculate dynamic thickness per ring based on content
    const ringThickness = {};
    const CHAR_WIDTH = 6.5; // Approx px per char
    const BASE_DEPTH = radius / (fanRoot.height + 1); // Distribute equally by default

    // Initialize with Base Depth
    for (let i = 0; i <= fanRoot.height; i++) {
        ringThickness[i] = BASE_DEPTH;
    }

    fanRoot.each(d => {
        const depth = d.depth;
        let required = BASE_DEPTH;

        if (depth === 0) {
            // Me Node: Keep base or ensure min size
            required = Math.max(BASE_DEPTH, 60);
        } else if (depth === 1) {
            // Inner Ring: Tangential text, stacked lines. 
            // Needs height for ~3 lines of text.
            required = Math.max(BASE_DEPTH, 75);
        } else {
            // Outer Rings: Radial text. Length matters!
            const nameLen = (d.data.name.length) * CHAR_WIDTH;
            // Relation usually adds ~20-30px if brief, or more. 
            // Let's add padding + relation estimate
            const relLen = (d.data.relation?.length || 0) * CHAR_WIDTH * 0.7; // smaller font
            // Total radial length required
            required = Math.max(nameLen, relLen) + 30; // 30px padding
        }

        // Update max required for this ring
        if (required > ringThickness[depth]) {
            ringThickness[depth] = required;
        }
    });

    // 2. Determine Start Radius for each depth
    const depthStartRadius = [0];
    let currentR = 0;
    for (let i = 0; i <= fanRoot.height; i++) {
        depthStartRadius[i] = currentR;
        currentR += ringThickness[i];
    }

    // NOTE: currentR is the new Total Radius. It might exceed 'radius'.
    // That is acceptable to avoid overflow.

    fanRoot.x0 = 0;
    fanRoot.x1 = 2 * Math.PI;

    // Set Root Geometry
    fanRoot.y0 = 0;
    fanRoot.y1 = ringThickness[0] - 5;

    // Partition logic manual override for concentric rings
    fanRoot.eachBefore(d => {
        // Ancestor Mode Split Override (Root Level)
        if (ancestorMode && d.depth === 0 && d.children) {
            const father = d.children.find(c => c.data.id === 'f1' || c.data.name.includes('Father'));
            const mother = d.children.find(c => c.data.id === 'm1' || c.data.name.includes("Mother"));

            // Father: Top Semicircle (-PI/2 to PI/2)
            if (father) {
                father.x0 = -Math.PI / 2;
                father.x1 = Math.PI / 2;
            }

            // Mother: Bottom Semicircle (PI/2 to 3PI/2)
            if (mother) {
                mother.x0 = Math.PI / 2;
                mother.x1 = 3 * Math.PI / 2;
            }

            // Set Radial Positions for all children of Root
            d.children.forEach(c => {
                const rStart = depthStartRadius[c.depth];
                const rThick = ringThickness[c.depth];
                c.y0 = rStart + 5;
                c.y1 = rStart + rThick - 5;
            });

            // Skip standard distribution for Root
            return;
        }

        if (d.children && d.children.length > 0) {
            const range = d.x1 - d.x0; // Full circle for root, segment for others
            // Distribute children evenly in their sector
            const step = range / d.children.length;

            d.children.forEach((child, i) => {
                child.x0 = d.x0 + i * step;
                child.x1 = d.x0 + (i + 1) * step;

                // Radius: Dynamic based on calculated array
                const rStart = depthStartRadius[child.depth];
                const rThick = ringThickness[child.depth];

                child.y0 = rStart + 5;
                child.y1 = rStart + rThick - 5;
            });
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
    // This creates the "Angle" the user requested without changing the global camera
    const TILT_SCALE = 1;
    const fanGroup = scene.append("g")
        .attr("class", "fan-3d-container")
        .attr("transform", `scale(1, ${TILT_SCALE})`);

    // 2. Render Layers (Bottom to Top) for Thickness
    const NUM_LAYERS = 8;
    const LAYER_OFFSET = 2; // Pixels per layer (total depth = 16px)

    // Helper: Darken color for sides
    const darken = (c, factor) => d3.color(c).darker(factor).hex();

    for (let i = 0; i < NUM_LAYERS; i++) {
        const isTop = i === NUM_LAYERS - 1;
        // Stack downwards: Bottom layer is at y + offset
        const yOffset = (NUM_LAYERS - 1 - i) * LAYER_OFFSET;

        const layer = fanGroup.append("g")
            .attr("transform", `translate(0, ${yOffset})`);

        const paths = layer.selectAll(".fan-segment")
            .data(fanRoot.descendants())
            .enter().append("path")
            .attr("class", "fan-segment")
            .attr("d", arc)
            .style("fill", d => {
                if (d.depth === 4) return "#333"; // Expand Button Color
                return isTop ? d.color : darken(d.color, 0.5 + (NUM_LAYERS - i) * 0.1);
            })
            .style("stroke", d => isTop ? "#333" : "none")
            .style("stroke-width", "0.5px");

        if (isTop) {
            paths.style("cursor", "pointer")
                .on("click", (event, d) => {
                    event.stopPropagation();
                    if (d.depth === 4) {
                        initFan(d.data.id);
                    } else {
                        showModal(d.data);
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
    // Labels sit on top (offset 0)
    const labelGroup = fanGroup.append("g")
        .attr("class", "fan-labels")
        .attr("transform", `translate(0, 0)`);

    const labels = labelGroup.selectAll(".fan-label")
        .data(fanRoot.descendants())
        .enter().append("g")
        .attr("class", "fan-label")
        .attr("transform", d => {
            const centroid = arc.centroid(d);
            const midAngle = (d.x0 + d.x1) / 2;
            const deg = midAngle * 180 / Math.PI;

            // 1. Me Node: Center
            if (d.depth === 0) return `translate(0, 0)`;

            // 2. Others: Rotate to align with slice
            let rotate = 0;
            if (d.depth === 1) {
                // Tangential
                rotate = (deg > 90 && deg < 270) ? deg + 180 : deg;
            } else {
                // Radial
                rotate = (deg < 180) ? (deg - 90) : (deg + 90);
            }
            return `translate(${centroid}) rotate(${rotate})`;
        })
        .style("pointer-events", "none");

    labels.each(function (d) {
        const el = d3.select(this);

        // Me Node (Text Mode)
        if (d.depth === 0) {
            el.attr("text-anchor", "middle")
                .style("font-family", "sans-serif")
                .style("fill", "#333") // Dark text for contrast
                .style("pointer-events", "none");

            el.append("text")
                .text(d.data.name)
                .attr("y", 5)
                .style("font-size", "14px") // Controlled small size
                .style("font-weight", "bold");
            return;
        }

        // Expand Button Text
        if (d.depth === 4) {
            el.attr("text-anchor", "middle")
                .style("pointer-events", "none");
            el.append("text").text("+")
                .attr("y", 5)
                .style("font-size", "20px")
                .style("font-weight", "bold")
                .style("fill", "white");
            return;
        }

        // Text
        const relationText = d.data.relation;
        const name = d.data.name;

        el.attr("text-anchor", "middle")
            .style("font-family", "sans-serif")
            .style("fill", "#000");

        // Name
        el.append("text")
            .text(name)
            .attr("y", -5)
            .style("font-size", d.depth === 1 ? "12px" : "10px")
            .style("font-weight", "bold");

        // Relation
        if (d.depth === 1) {
            el.select("text").attr("y", -8);
            el.append("text").text(relationText)
                .attr("y", 8)
                .style("font-size", "9px");
        } else {
            // Simplify text for outer rings
            const words = name.split(" ");
            el.append("text").text(relationText)
                .attr("y", 7)
                .style("font-size", "8px")
                .style("fill", "#444");
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
    if (startNodeId && startNodeId !== "root" && startNodeId !== "root") {
        const backBtn = svg.append("g")
            .attr("transform", `translate(50, 50)`)
            .style("cursor", "pointer")
            .on("click", () => initFan()); // Reset to default root

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
            .text("Reset View")
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
    const tileW = 50; // Size of the square tile
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
        .nodeSize([240, 400]) // Wider x, deeper y (Increased for link visibility)
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
        const maxX = d3.max(allX);
        const depthY = allY[0];

        // Padding
        const padX = 100;
        const widthT = (maxX - minX) + padX * 2;
        const depthT = 180;

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
            .attr("x", lblX - 20)
            .attr("y", lblY - 10)
            .text(`Generation ${siblings[0].depth} `)
            .attr("fill", "#888")
            .attr("font-size", "12px")
            .attr("font-family", "sans-serif")
            .attr("font-weight", "500")
            .style("pointer-events", "none")
            .attr("text-anchor", "end")
            .attr("transform", `rotate(-30, ${lblX}, ${lblY})`);
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
        const AVATAR_Gap = 60; // Distance between avatars in 3D
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
        .data(root.descendants())
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
            const xOff = isSpouse ? 60 : 0; // Offset for spouse
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

            // --- Text on Floor ---
            // Position at the bottom corner (visually below)
            const textG = avGrp.append("g")
                .attr("transform", `translate(0, 0) matrix(${matrix}) translate(${tileW / 2 + 15}, ${tileW / 2 + 15})`);

            // Name
            textG.append("text")
                .text(data.name)
                .attr("text-anchor", "middle")
                .attr("fill", "#222")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .style("font-family", "sans-serif");

            // Relation
            if (!data.isMe) {
                textG.append("text")
                    .text(data.relation)
                    .attr("text-anchor", "middle")
                    .attr("y", 12)
                    .attr("fill", "#666")
                    .attr("font-size", "10px")
                    .style("font-family", "sans-serif")
                    .style("text-transform", "uppercase");
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

    // Initial Center
    const initialTransform = d3.zoomIdentity.translate(width / 2, 100).scale(1);
    svg.call(zoom.transform, initialTransform);
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
    if (view === "globe") {
        initGlobe();
    } else if (view === "tree") {
        initTree();
    } else if (view === "vertical-tree") {
        initVerticalTreeV2();
    }

    if (view === "fan") {
        document.getElementById("fan-controls").style.display = "flex";
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

    if (currentView === 'globe') {
        initGlobe();
    } else if (currentView === 'tree') {
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

    // --- Data Transformation for Vertical Tree (Grandfather Rooted) ---
    // 1. Deep Copy
    const deepMe = JSON.parse(JSON.stringify(familyData));

    // 2. Find Key Nodes
    const deepFather = deepMe.children.find(d => d.id === 'f1' || d.name === 'Father');
    const deepBrother = deepMe.children.find(d => d.id === 'c2' || d.name === 'Brother');
    const deepSister = deepMe.children.find(d => d.id === 'c3' || d.name === 'Sister');

    // Grandfather is child of Father in original data
    const deepGrandfather = deepFather ? deepFather.children.find(d => d.id === 'gf1' || d.name === 'Grandfather') : null;

    let vTreeRootData = deepMe; // Fallback

    if (deepGrandfather && deepFather) {
        // 3. Re-link Hierarchy

        // A. Clean up Me (Remove Father, Brother, Sister from Me's children)
        // Keep any other children Me might have (none in current data, but safeguards)
        deepMe.children = deepMe.children.filter(d => d.id !== 'f1' && d.id !== 'c2' && d.id !== 'c3');

        // B. Clean up Father (Remove Grandfather from Father's children)
        deepFather.children = deepFather.children.filter(d => d.id !== 'gf1');

        // C. Clean up Grandfather (Keep Uncles/Aunts, Add Father)
        // Grandfather already has Uncles/Aunts as children
        if (!deepGrandfather.children) deepGrandfather.children = [];
        deepGrandfather.children.push(deepFather);

        // D. Add Me + Siblings to Father
        if (!deepFather.children) deepFather.children = [];
        deepFather.children.push(deepMe);
        if (deepBrother) deepFather.children.push(deepBrother);
        if (deepSister) deepFather.children.push(deepSister);

        // E. Set New Root
        vTreeRootData = deepGrandfather;
    }

    const root = d3.hierarchy(vTreeRootData);

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
        grp.append("rect")
            .attr("x", -cardWidth / 2)
            .attr("y", -cardHeight / 2)
            .attr("width", cardWidth)
            .attr("height", cardHeight)
            .attr("rx", 10)
            .attr("class", "tree-card-bg");

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
                const parentXOffset = -300;
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

// Initialize App
// Load Data and Initialize
d3.json("data.json").then(data => {
    familyData = data;
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
