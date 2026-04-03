// Globe View using Globe.gl (Wrapper around Three.js)
let myGlobe;

function initThreeGlobe() {
    const mainContainer = document.getElementById("tree-container");
    if (!mainContainer) return;

    // 1. Create/Get Globe Container (Isolated from SVG)
    let globeContainer = document.getElementById("globe-container");
    if (!globeContainer) {
        globeContainer = document.createElement("div");
        globeContainer.id = "globe-container";
        globeContainer.style.position = "absolute";
        globeContainer.style.top = "0";
        globeContainer.style.left = "0";
        globeContainer.style.width = "100%";
        globeContainer.style.height = "100%";
        globeContainer.style.zIndex = "10"; // On top of SVG when active
        mainContainer.appendChild(globeContainer);
    }
    globeContainer.style.display = "block";

    // 2. Hide SVG (D3) explicitly here too, just in case
    const svgEl = mainContainer.querySelector("svg");
    if (svgEl) svgEl.style.display = "none";

    // 3. Initialize Globe
    if (!myGlobe) {
        // Check if library loaded
        if (typeof Globe === 'undefined') {
            console.error("Globe.gl library not found.");
            globeContainer.innerHTML = "<div style='color:white; text-align:center; padding-top:20%; font-family:sans-serif;'>Error: Globe.gl library failed to load.<br>Please check your internet connection.</div>";
            return;
        }

        try {
            myGlobe = Globe({ 
                rendererConfig: { preserveDrawingBuffer: true } 
            })
                (globeContainer)
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
                .pointAltitude(0.01)
                .pointRadius(0.5)
                .pointColor('color')
                .pointsMerge(true)
                .pointLabel('name')
                .arcColor(() => 'rgba(255, 255, 255, 0.4)') // Static semi-transparent white
                .arcStroke(0.2) // Very slim
                .arcAltitude(0.01) // Direct/Surface-hugging
                // .arcDash... removed for static lines
                .onPointClick((point) => {
                    // Keep for backward compat or if we re-enable dots
                })

                // HTML Elements (User Pins)
                .htmlElementsData([]) // Initialize empty
                .htmlLat('lat')
                .htmlLng('lng')
                .htmlAltitude(0.02)
                .htmlElement(d => {
                    const el = document.createElement('div');
                    el.className = `user-pin${d.isMe ? ' is-me' : ''}`;

                    // INLINE STYLES TO FORCE SIZE (CSS Backup)
                    const size = d.isMe ? '22px' : '12px';
                    el.style.width = size;
                    el.style.height = size;
                    el.style.background = (typeof window.isDarkMode !== "undefined" && !window.isDarkMode) ? '#fff' : '#111';
                    el.style.border = d.isMe ? `3px solid ${d.color}` : `2px solid ${d.color}`;
                    el.style.borderRadius = '50% 50% 50% 0';
                    el.style.transform = 'rotate(-45deg)';
                    el.style.display = 'flex';
                    el.style.justifyContent = 'center';
                    el.style.alignItems = 'center';
                    el.style.cursor = 'pointer';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.8)';
                    el.style.pointerEvents = 'auto'; // Ensure clickable
                    el.style.overflow = 'hidden'; // Clip image to pin shape

                    const img = document.createElement('img');
                    img.crossOrigin = "anonymous";
                    const photoUrl = d.originalData.photo || '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
                    img.src = photoUrl;
                    img.onerror = () => { img.src = 'https://api.kintree.com/kintree-assets/images/default-avatars/male.png'; };

                    // Force Image Size to Fill Pin Head + Tail (Zoomed)
                    // 150% covers the diagonal rotation
                    img.style.width = '150%';
                    img.style.height = '150%';
                    img.style.borderRadius = '50%';
                    img.style.transform = 'rotate(45deg)';
                    img.style.objectFit = 'cover';

                    el.appendChild(img);

                    // Interaction
                    el.onclick = (e) => {
                        e.stopPropagation(); // Prevent globe click
                        if (myGlobe.controls) myGlobe.controls().autoRotate = false;

                        if (typeof showModal === 'function' && d.originalData) {
                            showModal({ data: d.originalData });
                        }
                    };

                    el.onmouseenter = () => {
                        el.style.transform = 'rotate(-45deg) scale(2.0)';
                        el.style.zIndex = '100';
                    };

                    el.onmouseleave = () => {
                        el.style.transform = 'rotate(-45deg) scale(1.0)';
                        el.style.zIndex = d.isMe ? '10' : '1';
                    };

                    el.title = d.name;

                    return el;
                });

            // Auto-rotate setup
            if (myGlobe.controls) {
                myGlobe.controls().autoRotate = true;
                myGlobe.controls().autoRotateSpeed = 0.5;
            }

            // Data
            processFamilyDataForGlobe();

        } catch (err) {
            console.error("Critical Globe Error:", err);
            globeContainer.innerHTML = `<div style='color:red; text-align:center;'>Globe Error: ${err.message}</div>`;
        }
    } else {
        // Resume
        if (myGlobe.controls) myGlobe.controls().autoRotate = true;
        processFamilyDataForGlobe();
    }
}


function closeThreeGlobe() {
    try {
        const globeContainer = document.getElementById("globe-container");
        if (globeContainer) {
            globeContainer.style.display = "none";
        }

        if (myGlobe && myGlobe.controls) {
            myGlobe.controls().autoRotate = false;
        }
    } catch (e) {
        console.error("Error closing globe:", e);
    }
}


function processFamilyDataForGlobe() {
    if (!familyData || !myGlobe) return;

    // Safety check for D3
    if (typeof d3 === 'undefined') return;

    try {
        const root = d3.hierarchy(familyData);
        const nodes = root.descendants();
        const links = root.links();

        console.log("Processing Globe Data: ", nodes.length);

        // 1. Points with Jitter
        // Group by coordinate to handle overlaps
        const locMap = new Map();

        nodes.forEach(d => {
            if (!d.data.coords || d.data.coords.length !== 2) return;
            const key = `${d.data.coords[1]},${d.data.coords[0]}`;
            if (!locMap.has(key)) locMap.set(key, []);
            locMap.get(key).push(d);
        });

        const points = [];
        const JITTER_AMOUNT = 0.5; // Degrees spread

        const lightColors = ["#BDD7EF", "#FFACFC", "#FEF28D", "#A8F48D", "#FE96FA"];
        const darkColors = ["#00f2ea", "#ff0055", "#4ecca3", "#FFD700", "#b366ff"];
        const genColors = (typeof window.isDarkMode !== "undefined" && !window.isDarkMode) ? lightColors : darkColors;
        const getGlobeColor = (depth) => genColors[depth % genColors.length];

        locMap.forEach((group, key) => {
            const [baseLat, baseLng] = key.split(',').map(Number);

            if (group.length === 1) {
                // Single person, keep exact
                points.push({
                    lat: baseLat,
                    lng: baseLng,
                    color: getGlobeColor(group[0].depth),
                    isMe: group[0].data.isMe, // Pass isMe for styling
                    name: group[0].data.name,
                    originalData: group[0].data
                });
            } else {
                // Multiple people, spiral/jitter them
                group.forEach((d, i) => {
                    const angle = (i / group.length) * 2 * Math.PI;
                    const radius = JITTER_AMOUNT * Math.sqrt((i + 1) / group.length); // Spiral out

                    const latOffset = radius * Math.cos(angle);
                    const lngOffset = radius * Math.sin(angle);

                    points.push({
                        lat: baseLat + latOffset,
                        lng: baseLng + lngOffset,
                        color: getGlobeColor(d.depth),
                        isMe: d.data.isMe,
                        name: d.data.name,
                        originalData: d.data
                    });
                });
            }
        });

        // Use htmlElementsData for pins
        myGlobe.pointsData([]); // Clear dots
        myGlobe.labelsData([]); // Clear previous labels
        myGlobe.htmlElementsData(points);

        // 2. Arcs (Use modified coordinates if possible, or just exact center)
        // Ideally arcs should go to the exact person, but using city center is cleaner for long distance.
        // Let's stick to city center for arcs to avoid clutter, or map to the new jittered points?
        // Mapping to jittered points is better for consistency.

        // Create a quick lookup for jittered coords
        const nodeLocs = new Map();
        points.forEach(p => {
            // We need a unique ID for the node to map back. 
            // originalData.id is best.
            if (p.originalData && p.originalData.id) {
                nodeLocs.set(p.originalData.id, { lat: p.lat, lng: p.lng });
            }
        });

        const arcs = links
            .filter(l => l.source.data.id && l.target.data.id && nodeLocs.has(l.source.data.id) && nodeLocs.has(l.target.data.id))
            .map(l => {
                const start = nodeLocs.get(l.source.data.id);
                const end = nodeLocs.get(l.target.data.id);
                return {
                    startLat: start.lat,
                    startLng: start.lng,
                    endLat: end.lat,
                    endLng: end.lng,
                    color: '#00FFFF'
                };
            });

        myGlobe.arcsData(arcs);
    } catch (e) {
        console.warn("Data processing error for globe:", e);
    }
}
