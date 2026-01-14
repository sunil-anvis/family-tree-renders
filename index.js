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
            <p class="modal-info">${d.data.relation} • ${d.data.age} yrs • ${d.data.gender}</p>
            <p class="modal-location">📍 ${d.data.location}</p>
        </div>
    `);
    modal.style("pointer-events", "all")
        .transition().duration(200)
        .style("opacity", 1);
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
            const s = { x: d.source.x, y: d.source.y + cardHeight / 2 };
            const t = { x: d.target.x, y: d.target.y - cardHeight / 2 };
            const midY = (s.y + t.y) / 2;
            return `M ${s.x},${s.y} V ${midY} H ${t.x} V ${t.y}`;
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
// --- 4. Fan Logic ---
function initFan() {
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
        { id: "m1", name: "Mother", age: 48, gender: "Female", location: "Mumbai, India", photo: "https://ui-avatars.com/api/?name=Mother&background=FF69B4&color=fff", relation: "Mother" },
        { id: "mg1", name: "Grandmother", age: 75, gender: "Female", location: "Mumbai, India", photo: "https://ui-avatars.com/api/?name=Grand+Mother&background=random", relation: "Maternal Grandmother" },
        { id: "mgf1", name: "Grandfather", age: 80, gender: "Male", location: "Mumbai, India", photo: "https://ui-avatars.com/api/?name=Grand+Father&background=random", relation: "Maternal Grandfather" },
        { id: "mu1", name: "Mat Uncle", age: 50, gender: "Male", location: "Pune, India", photo: "https://ui-avatars.com/api/?name=Maternal+Uncle&background=random", relation: "Maternal Uncle" },
        { id: "ma1", name: "Mat Aunt", age: 45, gender: "Female", location: "Delhi, India", photo: "https://ui-avatars.com/api/?name=Maternal+Aunt&background=FF69B4&color=fff", relation: "Maternal Aunt" },
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
        { id: "gr_uncle", name: "Great Uncle", age: 80, gender: "Male", location: "Village", photo: "https://ui-avatars.com/api/?name=Great+Uncle&background=random", relation: "Great Uncle" }
    ];

    // --- 2. Build Graph (Adjacency List) ---
    const allNodesMap = new Map();
    const adj = new Map();

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
    });

    // Add Extra Nodes
    extraNodes.forEach(addNode);

    // Helper to add Edge (Undirected)
    const addEdge = (id1, id2) => {
        if (allNodesMap.has(id1) && allNodesMap.has(id2)) {
            adj.get(id1).push(id2);
            adj.get(id2).push(id1);
        }
    };

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



    // --- 3. BFS to Build Hierarchy from "Me" ---
    if (!meNode) {
        console.error("Me node not found!");
        return;
    }

    const newRoot = { ...meNode, children: [] };
    // Map to track new hierarchy nodes to attach children
    const hierMap = new Map();
    hierMap.set(meNode.id, newRoot);

    const visited = new Set([meNode.id]);
    const queue = [{ id: meNode.id, depth: 0, node: newRoot }];

    // We need to reconstruct a tree for D3 pack/tree/partition
    // Level 0: Me
    // Level 1: Neighbors of Me
    // Level 2: Neighbors of Level 1 (excluding visited)

    while (queue.length > 0) {
        const { id, depth, node } = queue.shift();

        const neighbors = adj.get(id) || [];
        neighbors.forEach(nid => {
            if (!visited.has(nid)) {
                visited.add(nid);
                const originalData = allNodesMap.get(nid);
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
                return isTop ? d.color : darken(d.color, 0.5 + (NUM_LAYERS - i) * 0.1);
            })
            .style("stroke", d => isTop ? "#333" : "none")
            .style("stroke-width", "0.5px");

        if (isTop) {
            paths.style("cursor", "pointer")
                .on("click", (event, d) => {
                    event.stopPropagation();
                    showModal(d);
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
            if (d.depth === 0) return `translate(0,0)`;

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
                .text("Me")
                .attr("y", 5)
                .style("font-size", "14px") // Controlled small size
                .style("font-weight", "bold");
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
            if (!d.children && words.length > 1) {
                // Try to split if leaf node? Or just keep simple.
            }
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
}

// --- 5. Isometric 3D Logic ---
function init3DTree() {
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);

    // 4. Set Background for 3D View (Isometric Grids + Darker)
    svg.style("background", "#d1d8e0");

    const bh = 160; // INCREASED DEPTH to fit text
    const extrusion = 60; // INCREASED HEIGHT
    const genColors = ["#FEF3C7", "#FFEDD5", "#FCE7F3", "#EDE9FE", "#DBEAFE"];
    const getGenColor = (d) => genColors[d.depth % genColors.length];

    // Add CSS Grid Pattern using defs
    const defs = svg.append("defs");

    // 2. Shadow Filter (Drop Shadow)
    const filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 4)
        .attr("result", "blur");

    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 15) // Move Right
        .attr("dy", -15) // Move Up (Top-Right)
        .attr("result", "offsetBlur");

    // 3. Contact Shadow Filter (Sharp)
    const contactFilter = defs.append("filter")
        .attr("id", "contact-shadow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");

    contactFilter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 1);

    // Isometric Grid Pattern
    // We want diagonal lines forming diamonds
    const pattern = defs.append("pattern")
        .attr("id", "iso-grid-pattern")
        .attr("width", 60)
        .attr("height", 30) // 2:1 ratio for isometric
        .attr("patternUnits", "userSpaceOnUse");

    // Diagonal Cross
    pattern.append("path")
        .attr("d", "M 0 15 L 30 0 L 60 15 L 30 30 Z")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.5);

    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#iso-grid-pattern)");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, 100)`); // Initial offset

    // Standard Tree Layout First
    const treeLayout = d3.tree()
        .nodeSize([240, 280]) // Increased Y spacing for deeper blocks
        .separation((a, b) => a.parent == b.parent ? 1.2 : 1.5);

    const root = d3.hierarchy(familyData);
    treeLayout(root);

    // Isometric Projection Helper
    const toIso = (x, y) => {
        const isoX = (x - y) * 1;
        const isoY = (x + y) * 0.5;
        return [isoX, isoY];
    };

    // Calculate Iso Coords for all nodes
    root.descendants().forEach(d => {
        [d.isoX, d.isoY] = toIso(d.x, d.y);
    });

    // Calculate Dynamic Widths
    const bw = 120; // Base width
    root.descendants().forEach(d => {
        const nameLen = d.data.name.length;
        d.width = Math.max(bw, nameLen * 8 + 60);
    });

    // --- Shared Sibling Backgrounds ---
    const siblingGroups = d3.group(root.descendants(), d => d.parent);

    // LAYERS: Shadows -> Platforms -> Nodes

    // 0. Shadows Layer
    const shadowsLayer = g.append("g").attr("class", "iso-shadows");

    // 1. Platforms (Shared Backgrounds)
    const platformsLayer = g.append("g").attr("class", "iso-platforms");

    // Helper for Block Geometry (Reused)
    function getBlockCorners(w, h) {
        const c1 = toIso(-w / 2, -h / 2);
        const c2 = toIso(w / 2, -h / 2);
        const c3 = toIso(w / 2, h / 2);
        const c4 = toIso(-w / 2, h / 2);
        return { c1, c2, c3, c4 };
    }

    // Iterate through groups and render platforms + shadows
    siblingGroups.forEach((siblings, parent) => {
        if (!siblings || siblings.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        const commonY = siblings[0].y;

        // For coloring, we use the first sibling's data
        const rep = siblings[0];

        siblings.forEach(node => {
            const left = node.x - node.width / 2;
            const right = node.x + node.width / 2;
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
        });

        const padding = 10;
        minX -= padding;
        maxX += padding;

        const platformWidth = maxX - minX;
        const centerX = (minX + maxX) / 2;

        const [isoCx, isoCy] = toIso(centerX, commonY);

        // --- RENDER SHADOWS ---
        // 1. Soft Drop Shadow (Broader)
        shadowsLayer.append("path")
            .attr("d", () => {
                const { c1, c2, c3, c4 } = getBlockCorners(platformWidth, bh);
                return `M ${c1[0]},${c1[1]} L ${c2[0]},${c2[1]} L ${c3[0]},${c3[1]} L ${c4[0]},${c4[1]} Z`;
            })
            .attr("transform", `translate(${isoCx}, ${isoCy}) scale(1.05)`) // Slightly bigger
            .attr("fill", "black")
            .attr("opacity", 0.3) // Visible opacity
            .attr("filter", "url(#drop-shadow)");

        // 2. Contact Shadow (Tight/Darker)
        shadowsLayer.append("path")
            .attr("d", () => {
                const { c1, c2, c3, c4 } = getBlockCorners(platformWidth, bh);
                return `M ${c1[0]},${c1[1]} L ${c2[0]},${c2[1]} L ${c3[0]},${c3[1]} L ${c4[0]},${c4[1]} Z`;
            })
            .attr("transform", `translate(${isoCx}, ${isoCy})`)
            .attr("fill", "#000") // Pitch black base
            .attr("opacity", 0.5) // High opacity
            .attr("filter", "url(#contact-shadow)");

        // --- RENDER PLATFORM ---

        const platform = platformsLayer.append("g")
            .attr("transform", `translate(${isoCx}, ${isoCy}) translate(0, ${-extrusion})`);

        // Side Faces (Darker)
        // Left Face
        platform.append("path")
            .attr("d", () => {
                const { c3, c4 } = getBlockCorners(platformWidth, bh);
                return `M ${c4[0]},${c4[1]} L ${c3[0]},${c3[1]} L ${c3[0]},${c3[1] + extrusion} L ${c4[0]},${c4[1] + extrusion} Z`;
            })
            .attr("fill", d3.color(getGenColor(rep)).darker(0.6).hex());

        // Right Face
        platform.append("path")
            .attr("d", () => {
                const { c2, c3 } = getBlockCorners(platformWidth, bh);
                return `M ${c3[0]},${c3[1]} L ${c2[0]},${c2[1]} L ${c2[0]},${c2[1] + extrusion} L ${c3[0]},${c3[1] + extrusion} Z`;
            })
            .attr("fill", d3.color(getGenColor(rep)).darker(0.8).hex());

        // Top Face (Lighter)
        platform.append("path")
            .attr("d", () => {
                const { c1, c2, c3, c4 } = getBlockCorners(platformWidth, bh);
                return `M ${c1[0]},${c1[1]} L ${c2[0]},${c2[1]} L ${c3[0]},${c3[1]} L ${c4[0]},${c4[1]} Z`;
            })
            .attr("fill", getGenColor(rep));
    });


    // Links (Rendered AFTER platforms to be on top)
    g.selectAll(".iso-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "iso-link")
        .attr("d", d => {
            // Source (Parent): Connect from Bottom Edge (Logical y + bh/2)
            const startLogX = d.source.x;
            const startLogY = d.source.y + bh / 2;

            // Target (Child): Connect to Top Edge (Logical y - bh/2)
            const endLogX = d.target.x;
            const endLogY = d.target.y - bh / 2;

            const [sx, sy] = toIso(startLogX, startLogY);
            const [tx, ty] = toIso(endLogX, endLogY);

            // Elbow points need to be calculated based on these new edge points
            const midY = (startLogY + endLogY) / 2;
            const p1 = toIso(startLogX, midY);
            const p2 = toIso(endLogX, midY);

            // Connect from the TOP of the blocks
            // Shift up by extrusion amount
            const z = -extrusion;

            return `M${sx},${sy + z} L${p1[0]},${p1[1] + z} L${p2[0]},${p2[1] + z} L${tx},${ty + z}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => {
            // "Second connection" (Gen 1 to Gen 2) -> Dark Green
            if (d.target.depth === 2) return "#2E8B57";
            return d3.interpolateRainbow(d.target.depth / 4);
        })
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round");

    // 3. Nodes (Content Only)
    // Individual items on top of the platforms
    const nodes = g.selectAll(".iso-node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "iso-node")
        .style("cursor", "pointer")
        .attr("transform", d => `translate(${d.isoX},${d.isoY})`) // Position correctly
        .on("click", (event, d) => {
            event.stopPropagation();
            showModal(d);
        });

    // Content Group - Shift UP to sit on top of the platform (-extrusion)
    const block = nodes.append("g")
        .attr("transform", `translate(0, ${-extrusion})`);

    // 1. Standing Avatar Group
    const avatarGroup = block.append("g")
        .attr("transform", d => `translate(0, -10)`);


    // Avatar "Token"
    const avatarSize = 50;
    const tokenThick = 6;

    // Matrix for "Floor Projection" match toIso
    const isoMatrix = "matrix(1, 0.5, -1, 0.5, 0, 0)";

    const tokenGroup = avatarGroup.append("g")
        .classed("heartbeat", d => d.data.isMe)
        .attr("transform", "translate(20, -10)"); // Centered on platform (Logical Y -20)

    const tc = getBlockCorners(avatarSize, avatarSize);

    // Token Shadows (Individual)
    // Dark Contact Shadow (Tight)
    tokenGroup.append("ellipse")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("rx", 32)
        .attr("ry", 16)
        .attr("fill", "black")
        .attr("opacity", 0.4)
        .attr("filter", "url(#contact-shadow)");

    // Left Face (c4 -> c3)
    tokenGroup.append("path")
        .attr("d", `M ${tc.c4[0]},${tc.c4[1]} L ${tc.c3[0]},${tc.c3[1]} L ${tc.c3[0]},${tc.c3[1] + tokenThick} L ${tc.c4[0]},${tc.c4[1] + tokenThick} Z`)
        .attr("fill", "#999");

    // Right Face (c3 -> c2)
    tokenGroup.append("path")
        .attr("d", `M ${tc.c3[0]},${tc.c3[1]} L ${tc.c2[0]},${tc.c2[1]} L ${tc.c2[0]},${tc.c2[1] + tokenThick} L ${tc.c3[0]},${tc.c3[1] + tokenThick} Z`)
        .attr("fill", "#777");

    // 2. Token Top (Diamond) - White Border
    tokenGroup.append("rect")
        .attr("x", -avatarSize / 2 - 2)
        .attr("y", -avatarSize / 2 - 2)
        .attr("width", avatarSize + 4)
        .attr("height", avatarSize + 4)
        .attr("fill", "#fff")
        .attr("stroke", d => d.data.isMe ? "#FFD700" : "#ccc")
        .attr("stroke-width", d => d.data.isMe ? 4 : 1)
        .attr("transform", isoMatrix);

    // 3. Image (Projected)
    const clipId = d => `iso-clip-${d.data.id}`;

    tokenGroup.append("clipPath")
        .attr("id", clipId)
        .append("rect")
        .attr("x", -avatarSize / 2)
        .attr("y", -avatarSize / 2)
        .attr("width", avatarSize)
        .attr("height", avatarSize)
        .attr("transform", isoMatrix);

    tokenGroup.append("image")
        .attr("xlink:href", d => d.data.photo)
        .attr("x", -avatarSize / 2)
        .attr("y", -avatarSize / 2)
        .attr("width", avatarSize)
        .attr("height", avatarSize)
        .attr("clip-path", `url(#${clipId})`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("transform", isoMatrix);

    // Name - Below Avatar (Projected on Floor)
    block.append("text")
        .attr("x", 0)
        .attr("y", 30) // Adjusted up (-20)
        .text(d => d.data.name)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#000")
        .style("pointer-events", "none")
        .style("text-anchor", "middle")
        .attr("transform", isoMatrix);

    // Date/Gen
    block.append("text")
        .attr("x", 0)
        .attr("y", 45) // Adjusted up (-20)
        .text(d => d.data.relation)
        .style("font-size", "12px")
        .style("fill", "#444")
        .style("pointer-events", "none")
        .style("text-anchor", "middle")
        .attr("transform", isoMatrix);


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
        .nodeSize([cardHeight + 40, cardWidth + 50]) // Swapped: Height, Width spacing
        .separation((a, b) => a.parent == b.parent ? 1.1 : 1.25);

    treeLayout(root);

    // Links
    g.selectAll(".tree-link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "tree-link")
        .attr("d", d => {
            // Swap X and Y for Left-to-Right
            const s = { y: d.source.x, x: d.source.y + cardWidth / 2 };
            const t = { y: d.target.x, x: d.target.y - cardWidth / 2 };

            // Straight Orthogonal Line (Horizontal first)
            const midX = (s.x + t.x) / 2;
            // M startX,startY H midX V endY H endX
            return `M ${s.x},${s.y} H ${midX} V ${t.y} H ${t.x}`;
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
        .attr("transform", d => `translate(${d.y},${d.x})`)
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
        .attr("rx", 10)
        .attr("class", "tree-card-bg");

    // Clip Path for Image
    const clipId = (d) => `vclip-${d.data.id}`;

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

    // Ring around image
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

    // Relation
    textGroup.append("text")
        .attr("class", "tree-card-relation")
        .attr("y", 12)
        .text(d => d.data.relation);

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
        initVerticalTree();
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
    } else if (currentView === 'vertical-tree') {
        initVerticalTree();
    } else if (currentView === 'fan') {
        initFan();

    } else if (currentView === 'isometric') {
        init3DTree();
    }
});

// Initial Load
initTree(); 