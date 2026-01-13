// --- 1. Data & Global Setup ---
const familyData = {
    id: "root",
    name: "Grandfather",
    age: 78,
    gender: "Male",
    location: "Mumbai, India",
    coords: [72.8777, 19.0760],
    photo: "https://ui-avatars.com/api/?name=Grand+Father&background=random",
    relation: "Root",
    children: [
        {
            id: "f1",
            name: "Father",
            age: 50,
            gender: "Male",
            location: "Mumbai, India",
            coords: [72.8777, 19.0760],
            photo: "https://ui-avatars.com/api/?name=Father&background=0D8ABC&color=fff",
            relation: "Son",
            children: [
                { id: "c1", name: "Me", isMe: true, age: 25, gender: "Male", location: "Mumbai, India", coords: [72.9, 19.1], photo: "https://ui-avatars.com/api/?name=Me&background=random", relation: "Son" },
                { id: "c2", name: "Brother", age: 22, gender: "Male", location: "London, UK", coords: [-0.1276, 51.5074], photo: "https://ui-avatars.com/api/?name=Brother&background=random", relation: "Son" },
                { id: "c3", name: "Sister", age: 19, gender: "Female", location: "Dubai, UAE", coords: [55.2708, 25.2048], photo: "https://ui-avatars.com/api/?name=Sister&background=FF69B4&color=fff", relation: "Daughter" }
            ]
        },
        {
            id: "u1",
            name: "Uncle",
            age: 48,
            gender: "Male",
            location: "New York, USA",
            coords: [-74.0060, 40.7128],
            photo: "https://ui-avatars.com/api/?name=Uncle&background=random",
            relation: "Son",
            children: [
                {
                    id: "co1",
                    name: "Cousin 1",
                    age: 26,
                    gender: "Female",
                    location: "Chicago, USA",
                    coords: [-87.6298, 41.8781],
                    photo: "https://ui-avatars.com/api/?name=Cousin+One&background=random",
                    relation: "Daughter",
                    children: [
                        { id: "n1", name: "Nephew 1", age: 5, gender: "Male", location: "Chicago, USA", coords: [-87.65, 41.90], photo: "https://ui-avatars.com/api/?name=Nephew&background=random", relation: "Grandson" }
                    ]
                },
                { id: "co2", name: "Cousin 2", age: 24, gender: "Male", location: "Riyadh, Saudi", coords: [46.6753, 24.7136], photo: "https://ui-avatars.com/api/?name=Cousin+Two&background=random", relation: "Son" }
            ]
        },
        {
            id: "a1",
            name: "Aunt",
            age: 45,
            gender: "Female",
            location: "Mumbai, India",
            coords: [72.8, 19.0],
            photo: "https://ui-avatars.com/api/?name=Aunt&background=FF69B4&color=fff",
            relation: "Daughter",
            children: [
                { id: "co3", name: "Cousin 3", age: 20, gender: "Male", location: "Mumbai, India", coords: [72.85, 19.05], photo: "https://ui-avatars.com/api/?name=Cousin+Three&background=random", relation: "Son" },
                { id: "co4", name: "Cousin 4", age: 18, gender: "Female", location: "Mumbai, India", coords: [72.82, 19.02], photo: "https://ui-avatars.com/api/?name=Cousin+Four&background=random", relation: "Daughter" }
            ]
        },
        // --- Mock Data for Full Circle ---
        {
            id: "gu1",
            name: "Great Aunt",
            age: 70,
            gender: "Female",
            location: "Delhi, India",
            coords: [77.2090, 28.6139],
            photo: "https://ui-avatars.com/api/?name=Great+Aunt&background=random",
            relation: "Sister",
            children: [
                { id: "c5", name: "Cousin 5", age: 40, gender: "Male", location: "Pune, India", coords: [73.8567, 18.5204], photo: "https://ui-avatars.com/api/?name=Cousin+Five&background=random", relation: "Nephew" },
                { id: "c6", name: "Cousin 6", age: 38, gender: "Female", location: "Goa, India", coords: [74.1240, 15.2993], photo: "https://ui-avatars.com/api/?name=Cousin+Six&background=random", relation: "Niece" }
            ]
        },
        {
            id: "yu1",
            name: "Young Uncle",
            age: 42,
            gender: "Male",
            location: "Bangalore, India",
            coords: [77.5946, 12.9716],
            photo: "https://ui-avatars.com/api/?name=Young+Uncle&background=random",
            relation: "Brother",
            children: [
                { id: "c7", name: "Cousin 7", age: 15, gender: "Female", location: "Bangalore, India", coords: [77.6, 12.95], photo: "https://ui-avatars.com/api/?name=Cousin+Seven&background=random", relation: "Niece" }
            ]
        }
    ]
};

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
const modalClose = modalContent.append("button").attr("class", "modal-close").text("×");
const modalBody = modalContent.append("div").attr("class", "modal-body");

modalClose.on("click", () => {
    modal.transition().duration(200).style("opacity", 0).style("pointer-events", "none");
});

modal.on("click", (e) => {
    if (e.target.className === "modal-overlay") {
        modal.transition().duration(200).style("opacity", 0).style("pointer-events", "none");
    }
});

function showModal(d) {
    modalBody.html(`
        <div class="modal-profile">
            <img src="${d.data.photo}" alt="${d.data.name}" class="modal-image">
            <h2 class="modal-name">${d.data.name}</h2>
            <p class="modal-info">${d.data.relation} • ${d.data.age} yrs • ${d.data.gender}</p>
            <p class="modal-location">📍 ${d.data.location}</p>
        </div>
    `);
    modal.transition().duration(200).style("opacity", 1).style("pointer-events", "all");
}

// State
let currentView = 'globe'; // 'globe' or 'tree'
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
            return coords ? `translate(${coords[0]},${coords[1]})` : "translate(0,0)";
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
    const treeLayout = d3.tree()
        .nodeSize([cardWidth + 20, cardHeight + 40]) // Width, Height spacing
        .separation((a, b) => a.parent == b.parent ? 1.1 : 1.25);

    treeLayout(root);

    // Links
    g.selectAll(".tree-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "tree-link")
        .attr("d", d => {
            return d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y)({
                    source: { x: d.source.x, y: d.source.y + cardHeight / 2 },
                    target: { x: d.target.x, y: d.target.y - cardHeight / 2 }
                });
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
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    // Card Background
    nodes.append("rect")
        .attr("x", -cardWidth / 2)
        .attr("y", -cardHeight / 2)
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 10) // Rounded corners
        .attr("class", "tree-card-bg");

    // Clip Path for Image
    const clipId = (d) => `clip-${d.data.id}`;

    nodes.append("clipPath")
        .attr("id", clipId)
        .append("circle")
        .attr("r", 20)
        .attr("cx", -cardWidth / 2 + 30)
        .attr("cy", 0);

    // Profile Image
    nodes.append("image")
        .attr("xlink:href", d => d.data.photo)
        .attr("x", -cardWidth / 2 + 10)
        .attr("y", -20)
        .attr("width", 40)
        .attr("height", 40)
        .attr("clip-path", d => `url(#${clipId(d)})`)
        .attr("preserveAspectRatio", "xMidYMid slice");

    // Initial Ring around image
    nodes.append("circle")
        .attr("r", 21)
        .attr("cx", -cardWidth / 2 + 30)
        .attr("cy", 0)
        .attr("fill", "none")
        .attr("stroke", d => d.data.isMe ? "#FFD700" : "#4ecca3")
        .attr("stroke-width", d => d.data.isMe ? 4 : 1.5);

    // Information Group
    const textGroup = nodes.append("g")
        .attr("transform", `translate(${-cardWidth / 2 + 60}, 0)`);

    // Name
    textGroup.append("text")
        .attr("class", "tree-card-name")
        .attr("y", -2)
        .text(d => d.data.name);

    // Relation/Role
    textGroup.append("text")
        .attr("class", "tree-card-relation")
        .attr("y", 12)
        .text(d => d.data.relation);


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
function initFan() {
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 3. Set Background for Fan View (Black)
    svg.style("background", "black");

    // Container Group
    const g = svg.append("g");

    // Reduce radius slightly to fit label
    const radius = Math.min(width, height) * 0.45;

    const root = d3.hierarchy(familyData)
        .sort((a, b) => b.height - a.height || a.data.name.localeCompare(b.data.name));

    // Color Setup: Assign colors based on Gender
    root.descendants().forEach(d => {
        if (d.data.isMe) {
            d.borderColor = "#FFD700"; // Gold for "Me"
        } else if (d.data.gender === "Male") {
            d.borderColor = "#0D8ABC"; // Blue
        } else if (d.data.gender === "Female") {
            d.borderColor = "#FF69B4"; // Pink
        } else {
            d.borderColor = "#ccc"; // Default
        }
    });

    // MANUAL LAYOUT: Equal Sibling Angles + Full Radius
    // 1. Calculate Y (Radial) steps
    // Divide radius by (maxDepth + 1). Root is at center (0).
    // Actually standard partition puts root at center.
    const maxDepth = root.height + 1; // +1 for root level? root depth is 0. height is max depth from root.
    // If root.height is 3, we have levels 0, 1, 2, 3. Total 4 levels.
    const layerDepth = radius / (root.height + 1);

    // 2. Perform Layout (DFS)
    // Root takes full 360 (0 to 2PI)
    root.x0 = 0;
    root.x1 = 2 * Math.PI;
    root.y0 = 0;
    root.y1 = layerDepth; // Root circle

    root.eachBefore(d => {
        // Compute children angles equaly
        if (d.children && d.children.length > 0) {
            const range = d.x1 - d.x0;
            const step = range / d.children.length;

            d.children.forEach((child, i) => {
                child.x0 = d.x0 + i * step;
                child.x1 = d.x0 + (i + 1) * step;

                child.y0 = d.y1;
                // If leaf, go to full radius. Else, next layer.
                if (!child.children || child.children.length === 0) {
                    child.y1 = radius;
                } else {
                    child.y1 = child.y0 + layerDepth;
                }
            });
        }
    });

    const arc = d3.arc()
        .startAngle(d => d.x0) // Start from 0
        .endAngle(d => d.x1)   // Go to 2*PI
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    // Define Drop Shadow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "150%");

    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 3)
        .attr("result", "blur");

    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("result", "offsetBlur");

    filter.append("feFlood")
        .attr("flood-color", "#000")
        .attr("flood-opacity", 0.5)
        .attr("result", "color");

    filter.append("feComposite")
        .attr("in", "color")
        .attr("in2", "offsetBlur")
        .attr("operator", "in")
        .attr("result", "shadow");

    filter.append("feMerge")
        .append("feMergeNode").attr("in", "shadow");
    filter.select("feMerge").append("feMergeNode").attr("in", "SourceGraphic");

    // Paths
    const pathGroup = g.selectAll("path")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "fan-segment")
        .style("transition", "transform 0.2s ease-out") // CSS transition for smooth scale
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    pathGroup.append("path")
        .attr("d", arc)
        .style("fill", "white") // White background
        .style("stroke", d => d.borderColor || "#ddd") // Colored border
        .style("stroke-width", d => d.data.isMe ? "4px" : "2px") // Thicker for Me
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            // 3D Pop-out Effect - Scale from Center (Origin)
            // This ensures consistent "zoom" effect without detachment
            const segment = d3.select(this.parentNode);

            // Just scale! The group is already at (0,0) of the fan.
            segment.attr("transform", "scale(1.05)");

            // Apply drop shadow
            d3.select(this).style("filter", "url(#drop-shadow)");

            // Bring to front
            segment.raise();
        })
        .on("mouseout", function (event, d) {
            const segment = d3.select(this.parentNode);
            segment.attr("transform", null); // Reset transform
            d3.select(this).style("filter", null); // Remove shadow
        });

    // Labels
    pathGroup.append("text")
        .attr("transform", function (d) {
            if (d.depth === 0) return "translate(0,0)"; // Center root horizontally
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(d => d.data.name)
        .style("font-size", "12px")
        .style("fill", "#333")
        .style("pointer-events", "none")
        .each(function (d) {
            // Relation under name
            const el = d3.select(this);
            el.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.2em")
                .text(d.data.relation)
                .style("font-size", "10px")
                .style("fill", "#666");
        });

    // Zoom for Fan
    const zoom = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    // Apply zoom to SVG
    svg.call(zoom);

    // Initial positioning: Center roughly at center
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1);
    svg.call(zoom.transform, initialTransform);
}

// --- 5. Isometric 3D Logic ---
function init3DTree() {
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 4. Set Background for 3D View (Checkered Grid)
    svg.style("background", "#e0e5ec");

    // Add CSS Grid Pattern using defs
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
        .attr("id", "grid-pattern")
        .attr("width", 40)
        .attr("height", 40)
        .attr("patternUnits", "userSpaceOnUse");

    pattern.append("rect")
        .attr("width", 40)
        .attr("height", 40)
        .attr("fill", "#e0e5ec");

    pattern.append("path")
        .attr("d", "M 20 0 L 0 0 0 20")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    pattern.append("path")
        .attr("d", "M 40 20 L 20 20 20 40")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#grid-pattern)");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, 100)`); // Initial offset

    // Standard Tree Layout First
    const treeLayout = d3.tree()
        .nodeSize([120, 100]) // Compact node size
        .separation((a, b) => a.parent == b.parent ? 1.2 : 1.5);

    const root = d3.hierarchy(familyData);
    treeLayout(root);

    // Isometric Projection Helper
    // Projects (x, y) on floor to Screen (x, y)
    // x: horizontal in standard tree
    // y: vertical depth in standard tree
    // Iso rotation: 
    // isoX = (x - y) * cos(30)
    // isoY = (x + y) * sin(30)
    const toIso = (x, y) => {
        // Adjust scales to match the "slanted" look
        // In D3 tree: x is breadth (wide), y is depth (down)
        // We want depth to go "down-right" and breadth "down-left"?
        // Let's try standard isometric
        const isoX = (x - y) * 1;
        const isoY = (x + y) * 0.5;
        return [isoX, isoY];
    };

    // Calculate Iso Coords for all nodes
    root.descendants().forEach(d => {
        [d.isoX, d.isoY] = toIso(d.x, d.y);
    });

    // Links
    // Orthogonal links in 3D: Move along Y axis (depth) then X axis (breadth)
    // We draw them as path segments
    g.selectAll(".iso-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "iso-link")
        .attr("d", d => {
            const s = { x: d.source.isoX, y: d.source.isoY, ox: d.source.x, oy: d.source.y };
            const t = { x: d.target.isoX, y: d.target.isoY, ox: d.target.x, oy: d.target.y };

            // Constructing an "elbow" in 2D space then projecting?
            // Standard elbow: Source -> (Source.x, Target.y) -> Target
            // No, tree is (x,y). Elbow: (sx, sy) -> (sx, ty) -> (tx, ty)? NO.
            // Tree usually: (sx, sy) -> (sx, (sy+ty)/2) -> (tx, (sy+ty)/2) -> (tx, ty)

            // Let's project key points
            const midY = (s.oy + t.oy) / 2;
            const p1 = toIso(s.ox, midY); // Down halfway
            const p2 = toIso(t.ox, midY); // Across

            return `M${s.x},${s.y} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} L${t.x},${t.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");

    // Nodes (3D Blocks)
    const nodes = g.selectAll(".iso-node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "iso-node")
        .style("cursor", "pointer")
        .attr("transform", d => `translate(${d.isoX},${d.isoY})`) // z-index sorting by y?
        // Sort by depth (y) and then x to ensure correct overlap?
        // In isometric painter's algorithm: draw furthest back first.
        // lowest (x+y) first?
        // tree y increases, so root (0) is top. children are bottom.
        // We render typically top-down in DOM order. 
        // Root is at top of screen? No, isoY increases. Root is top.
        // Children (larger y) are lower on screen. They should be ON TOP of parents if overlapping vertical?
        // Usually lower on screen = closer to camera = paint last.
        // D3 renders preorder. Parents first.
        // So parents (background) rendered first, children (foreground) rendered last. Perfect.
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    // Block Dimensions
    const bw = 80;
    const bh = 50; // Top face dimensions
    const depth = 15; // Extrusion height

    // Colors
    const colorScale = d3.scaleOrdinal(d3.schemeSet3);

    // Shadow (Bottom/Floor shadow)
    nodes.append("ellipse")
        .attr("cx", 0)
        .attr("cy", depth * 1.5)
        .attr("rx", bw * 0.6)
        .attr("ry", bh * 0.6)
        .attr("fill", "rgba(0,0,0,0.1)");

    // 3D Block Group - Shift UP so (0,0) is "on the floor"
    const block = nodes.append("g")
        .attr("transform", `translate(0, ${-depth})`);

    // Side Faces (Darker)
    // Left Face
    // path: Bottom-mid -> Left-mid -> Left-mid-up -> Bottom-mid-up
    // Let's draw a simple "Right" and "Front" extrusion
    // Assuming "Diamond" shape for top?
    // Let's draw "Rounded Rect" in perspective

    // Simplification: Rectangle with rounded corners
    const w = 80, h = 50;

    // Front Face (Thick edge)
    block.append("path")
        .attr("d", `
            M ${-w / 2}, 0 
            L ${w / 2}, 0 
            L ${w / 2}, ${depth} 
            L ${-w / 2}, ${depth} Z
        `)
        .attr("fill", d => d3.color(colorScale(d.depth)).darker(0.7).hex())
        .attr("transform", `translate(0, ${h / 2})`); // Shift to bottom edge of top face?

    // But that's flat. Isometric block:
    //      / \
    //     | T |
    //     \ /
    //     | | 
    //     \_/

    // Let's simulate the visual from image: 
    // It looks like a "slab" with rounded corners.

    // Extrusion Layer (Darker)
    block.append("rect")
        .attr("x", -w / 2)
        .attr("y", -h / 2 + depth)
        .attr("width", w)
        .attr("height", h)
        .attr("rx", 10)
        .attr("fill", d => d3.color(colorScale(d.depth)).darker(0.5).hex());

    // Top Face (Lighter)
    block.append("rect")
        .attr("x", -w / 2)
        .attr("y", -h / 2)
        .attr("width", w)
        .attr("height", h)
        .attr("rx", 10)
        //.attr("stroke", "white")
        //.attr("stroke-width", 2)
        .attr("fill", d => colorScale(d.depth));

    // Content on top
    // Image
    const clipId = d => `iso-clip-${d.data.id}`;
    block.append("clipPath")
        .attr("id", clipId)
        .append("circle")
        .attr("r", 15)
        .attr("cx", -w / 2 + 25)
        .attr("cy", 0);

    block.append("image")
        .attr("xlink:href", d => d.data.photo)
        .attr("x", -w / 2 + 10)
        .attr("y", -15)
        .attr("width", 30)
        .attr("height", 30)
        .attr("clip-path", `url(#${clipId})`)
        .attr("preserveAspectRatio", "xMidYMid slice");

    // Name
    block.append("text")
        .attr("x", -w / 2 + 45)
        .attr("y", -5)
        .text(d => d.data.name)
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .style("pointer-events", "none");

    // Date/Gen
    block.append("text")
        .attr("x", -w / 2 + 45)
        .attr("y", 8)
        .text(d => d.data.relation)
        .style("font-size", "8px")
        .style("fill", "#666")
        .style("pointer-events", "none");


    // Zoom Behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
    // Center logic
    const initialTransform = d3.zoomIdentity.translate(width / 2, 50).scale(1);
    svg.call(zoom.transform, initialTransform);
}

// --- 6. Switcher & Event Listeners ---

function switchView(view) {
    currentView = view;
    if (view === "globe") {
        initGlobe();
    } else if (view === "tree") {
        initTree();
    } else if (view === "fan") {
        initFan();
    } else if (view === "isometric") {
        init3DTree();
    }
}

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
    } else if (currentView === 'fan') {
        initFan();
    } else if (currentView === 'isometric') {
        init3DTree();
    }
});

// Initial Load
initGlobe();