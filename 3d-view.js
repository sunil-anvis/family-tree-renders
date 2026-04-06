// Global State for ISO Angle
let currentIsoAngle = "iso";

window.setIsoAngle = function (angle) {
  currentIsoAngle = angle;
  init3DTree();
};

function init3DTree() {
  svg.selectAll("*").remove();
  svg.on(".drag", null);
  svg.on(".zoom", null);

  // 4. Set Background for 3D View based on Theme
  const bgColor = (typeof window.isDarkMode !== "undefined" && !window.isDarkMode) ? "white" : "black";
  svg.style("background", bgColor);

  // Config
  const bh = 120; // Block Depth (Y-axis visual)
  const getExtrusion = (depth) => {
    if (depth === 0) return 100;
    if (depth === 1) return 60;
    return 30;
  };

  const cardWidth = 70; // Reduced width
  const cardHeight = 90; // Reduced height
  const tileW = 50;
  const tileH = 10;
  const tileR = 10;

  // Projection Parameters
  // Tuned for Aesthetics and Readability
  const getParams = () => {
    switch (currentIsoAngle) {
      case "top":
        return {
          angle: 0,
          tilt: 1.0,
          zScale: 0,
          billboard: false,
          labels: "flat",
        }; // Max Flat (with slight Z for layering)
      case "front":
        return {
          angle: 0,
          tilt: 1.0,
          zScale: 1,
          billboard: false,
          labels: "flat",
        }; // Max Flat (with slight Z for layering)
      case "iso":
      default:
        return {
          angle: Math.PI / 4,
          tilt: 0.5,
          zScale: 1.0,
          billboard: false,
          labels: "iso",
        }; // Standard Iso
    }
  };
  const params = getParams();

  // Derived Matrix for Text/Nodes
  const scale = 0.8;
  const cos = Math.cos(params.angle);
  const sin = Math.sin(params.angle);

  // Basis Vectors for Matrix: [sx, sy, tx, ty, 0, 0]
  // x-axis: (cos, sin*tilt)
  // y-axis: (-sin, cos*tilt)
  const mx = cos * scale;
  const my = sin * params.tilt * scale;
  const nx = -sin * scale;
  const ny = cos * params.tilt * scale;

  // Standard ISO Matrix string
  const matrixStr = `${mx}, ${my}, ${nx}, ${ny}, 0, 0`;

  // Billboard Matrix (for text standing up/facing camera)
  const billboardMatrixStr = `${scale}, 0, 0, ${scale}, 0, 0`;

  // Selected Theme Color Mapping provided by user
  const genColorThemes = [
    { bg: "#2F70B1", male: "#DABB64", female: "#FFB9CF" },
    { bg: "#FFAFAF", male: "#D0005A", female: "#8C00A8" },
    { bg: "#FFE078", male: "#E2A500", female: "#DD5F96" },
  ];
  
  const getGenTheme = (d) => genColorThemes[d.depth % genColorThemes.length];
  // maintain backwards compatibility for the platform blocks/lines
  const getGenColor = (d) => getGenTheme(d).bg;
  const darken = (c, factor) => d3.color(c).darker(factor).hex();

  // Definitions
  const defs = svg.append("defs");

  // 1. Soft Contact Shadow
  const filter = defs
    .append("filter")
    .attr("id", "soft-shadow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 8)
    .attr("result", "blur");
  filter
    .append("feOffset")
    .attr("dx", 5)
    .attr("dy", 5)
    .attr("result", "offsetBlur");
  filter
    .append("feFlood")
    .attr("flood-color", "rgba(0,0,0,0.2)")
    .attr("result", "color");
  filter.append("feComposite").attr("in2", "offsetBlur").attr("operator", "in");
  const merge = filter.append("feMerge");
  merge.append("feMergeNode").attr("in", "SourceGraphic"); // Optional: if applying to group
  // actually, for shadows we separate geometry, so just return the shadow
  // Let's stick to standard Gaussian Blur for separate shadow paths

  const shadowFilter = defs
    .append("filter")
    .attr("id", "drop-shadow-blur")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  shadowFilter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 6);

  // Glass Gloss Gradient
  const glassGradient = defs
    .append("linearGradient")
    .attr("id", "glass-gloss")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");
  glassGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgba(255,255,255,0.7)");
  glassGradient
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "rgba(255,255,255,0.1)");
  glassGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(255,255,255,0.0)");

  // Isometric Grid (Optional, faint) -- REMOVED per user request

  const g = svg.append("g").attr("transform", `translate(${width / 2}, 150)`);

  // Standard Tree Layout
  // Adapt layout to view angle
  let xSpacing = 400; // Default wide spacing
  let ySpacing = 450;

  // If viewing from Side/Front, we might want deeper separation?
  // Side view compress X visually.
  if (currentIsoAngle === "left" || currentIsoAngle === "right") {
    ySpacing = 600; // More vertical gap
  }

  const treeLayout = d3
    .tree()
    .nodeSize([xSpacing, ySpacing])
    .separation((a, b) => (a.parent == b.parent ? 1.1 : 2.2)); // Increased cousin separation

  const root = d3.hierarchy(familyData);
  treeLayout(root);

  // Iso Projection
  // x, y are screen coords from tree layout.
  // We map them: tree.x -> iso.x (spread), tree.y -> iso.y (depth)
  const toIso = (x, y) => {
    // Rotation
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    // Tilt
    return [rx * scale, ry * params.tilt * scale];
  };

  // Pre-calculate layouts
  root.descendants().forEach((d) => {
    [d.isoX, d.isoY] = toIso(d.x, d.y);
    // Calculate dynamic width based on name
    d.width = Math.max(140, d.data.name.length * 9 + 40);
  });

  // --- Layers ---
  const shadowLayer = g.append("g");
  const blockLayer = g.append("g"); // Blocks
  const linkLayer = g.append("g"); // Links on top of blocks to connect members
  const avatarLayer = g.append("g");



  // --- Blocks (Platforms) ---
  // Group by parent to create shared platforms
  const siblingGroups = d3.group(root.descendants(), (d) => d.parent);

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
    const allX = siblings.map((n) => n.x);
    const allY = siblings.map((n) => n.y);

    const minX = d3.min(allX);
    // Correct maxX to account for spouse offset (110 is the gap used in renderAvatar)
    const maxX = d3.max(siblings.map((n) => n.x + (n.data.spouse ? 110 : 0)));
    const depthY = allY[0];

    // Padding
    const padX = 250; // Reduced from 300 to create gaps between cousins
    const widthT = maxX - minX + padX * 2;
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
    // Apply zScale from params
    const p = (lx, ly, lz = 0) => {
      const [ix, iy] = toIso(lx, ly);
      return `${ix},${iy - lz * params.zScale} `;
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
      const overlapZ = 0;

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
    const sideColor = d3.color(baseColor).darker(0.5); // Darker side for 3D depth


    // Render Shadow (Initially Hidden)
    shadowLayer
      .append("path")
      .attr("d", topPath)
      .attr("fill", "black")
      .attr("opacity", 0) // Hidden
      .attr("class", `shadow-d-${siblings[0].depth}`)
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

    // So we translate by -thisExtrusion scaled by Z factor
    // So we translate by -thisExtrusion scaled by Z factor
    const grp = blockLayer
      .append("g")
      .attr("transform", `translate(0, ${-thisExtrusion * params.zScale})`)
      .attr("opacity", 0) // Hidden
      .attr("class", `block-d-${siblings[0].depth}`);

    // Side Wall (Lighter Tint)
    grp
      .append("path")
      .attr("d", sidePath)
      .attr("fill", sideColor)
      .attr("stroke", sideColor)
      .attr("stroke-width", 1) // Thick stroke to seal seams
      .attr("stroke-linejoin", "round");

    // Top Face (Vibrant)
    const borderColor = darken(baseColor, 0.5); // Darker border for the top face
    grp
      .append("path")
      .attr("d", topPath)
      .attr("fill", topColor)
      .attr("fill-opacity", 1.0) // No transparency to prevent see-through lines
      .attr("stroke", borderColor)
      .attr("stroke-width", 2);


    // High-End Shine Effect (Pseudo-Glass)
    grp.append("path")
      .attr("d", topPath)
      .attr("fill", "url(#glass-gradient)")
      .attr("fill-opacity", 0.35)
      .attr("pointer-events", "none");


    // Generation Label (On Top Surface)
    grp
      .append("text")
      .attr("x", l + 30) // Left padding
      .attr("y", b - 25) // Near front edge
      .text(`Generation ${siblings[0].depth}`)
      .attr("fill", d3.color(baseColor).darker(1.5)) // Darker shade
      .attr("font-size", "24px")
      .attr("font-family", "sans-serif")
      .attr("font-family", "bold")
      .style("pointer-events", "none")
      .attr("transform", `matrix(${matrixStr})`); // Dynamic Matrix
  });

  // --- Links ---
  // Orthogonal Routing in Iso with Rounded Corners
  // Cleaned up for Top View alignment
  const linkPathGenerator = (d) => {
    const s = d.source;
    const t = d.target;

    const sx = s.x,
      sy = s.y;
    const tx = t.x,
      ty = t.y;

    const midY = (sy + ty) * 0.5;

    // Block & Link Heights (Z)
    // Connect to the SIDE of the button (mid-height of tile)
    // Block Surface = extrusion. Tile = 10 thick. Mid = extrusion + 5.
    const zOffset = 5;
    const sz = getExtrusion(s.depth) + zOffset;
    const tz = getExtrusion(t.depth) + zOffset;

    // Helper to project 3D point to 2D screen
    const project = (lx, ly, lz) => {
      const [ix, iy] = toIso(lx, ly);
      return [ix, iy - lz * params.zScale];
    };

    // Helper: Simple Vector Math
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const len = (v) => Math.hypot(v[0], v[1]);
    const scale = (v, s) => [v[0] * s, v[1] * s];
    const norm = (v) => {
      const l = len(v);
      return l === 0 ? [0, 0] : [v[0] / l, v[1] / l];
    };

    const generateSinglePath = (linkSx, linkTx, customYOffset = null) => {
      // Offset start/end to be at the exact icon position (0 offset)
      const yOffset = customYOffset !== null ? customYOffset : 0;
      
      const linkZOffset = 7.5; // Use half-height for vertical center
      const sz_adj = sz + linkZOffset;
      const tz_adj = tz + linkZOffset;

      const p0 = project(linkSx, sy + yOffset, sz_adj); // Start (at parent center)
      const p1 = project(linkSx, midY, sz_adj); // Corner 1 (Turn at top)
      const p1_drop = project(linkSx, midY, tz_adj); // Vertical Drop (Drop between z levels)
      const p2 = project(linkTx, midY, tz_adj); // Corner 2 (Turn at bottom level)
      const p3 = project(linkTx, ty, tz_adj); // End (at child center)

      return `M ${p0[0]},${p0[1]} L ${p1[0]},${p1[1]} L ${p1_drop[0]},${p1_drop[1]} L ${p2[0]},${p2[1]} L ${p3[0]},${p3[1]}`;
    };

    if (s.data.spouse) {
      const AVATAR_Gap = 180;
      const midSx = sx + AVATAR_Gap / 2;
      const h_adj = sz + 7.5; // Shared height for bar and child link
      
      // Points for parent connector bar (vertical centers of icons)
      const pParent1 = project(sx, sy, h_adj);
      const pParent2 = project(sx + AVATAR_Gap, sy, h_adj);
      
      const barPath = `M ${pParent1[0]},${pParent1[1]} L ${pParent2[0]},${pParent2[1]} `;
      
      // Start child branch from the SAME h_adj and midSx
      return barPath + generateSinglePath(midSx, tx, 0);
    }

    return generateSinglePath(sx, tx, 0);


  };

  linkLayer
    .selectAll(".iso-link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("d", linkPathGenerator)
    .attr("fill", "none")
    .attr("stroke", (d) => {
      // Darker shade of the target block's color
      const targetColor = getGenColor(d.target);
      return d3.color(targetColor).darker(1.2).hex();
    })
    .attr("stroke-width", 5) // Slightly clearer premium stroke

    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("transform", `translate(0, 0)`) // No global shift needed if Z is correct
    .attr("opacity", 0) // Hidden
    .attr(
      "class",
      (d) =>
        `link-source-${d.source.data.id} link-target-${d.target.data.id} iso-link`,
    );

  // --- Avatars (Nodes) ---
  // Lying 3D Tiles Logic
  // Tile Config (Moved to top)

  const nodes = avatarLayer
    .selectAll(".node-group")
    .data(root.descendants().sort((a, b) => a.isoY - b.isoY))
    .enter()
    .append("g")
    .attr("transform", (d) => {
      const [ix, iy] = toIso(d.x, d.y);
      const z = getExtrusion(d.depth);
      return `translate(${ix}, ${iy - z * params.zScale})`;
    })
    .attr("opacity", 0) // Hidden initially via Attribute
    .attr(
      "class",
      (d) => `node-group node-d-${d.depth} ${d.data.isMe ? "node-me" : ""}`,
    )
    .style(
      "cursor",
      "url('https://cdn-icons-png.flaticon.com/32/1442/1442300.png'), auto",
    );

  nodes.each(function (d) {
    const g = d3.select(this);

    const renderAvatar = (data, isSpouse) => {
      const xOff = isSpouse ? 180 : 0; 
      const dx = xOff * cos * scale;
      const dy = xOff * sin * params.tilt * scale;

      const avGrp = g
        .append("g")
        .attr("transform", `translate(${dx}, ${dy})`)
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          d3.select(this)
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("transform", `translate(${dx}, ${dy - 20}) scale(1.1)`);
          d3.select(this.parentNode).raise();
          d3.select(this).raise();
        })
        .on("mouseout", function (event) {
          d3.select(this)
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("transform", `translate(${dx}, ${dy}) scale(1)`);
        })
        .on("click", (e) => {
          e.stopPropagation();
          showModal({ data: data });
        });

      const currentTheme = getGenTheme(d);
      const isFemale = data.gender === 'f' || data.gender === 'F';
      const themeColor = isFemale ? currentTheme.female : currentTheme.male;

      const avatarW = 55; 
      const avatarR = 6;
      const chipH = 15; 

      // 1. Precise 3D Projection Helper
      // (Uses the same math as matrixStr to ensure perfect seams)
      const p3d = (lx, ly, lz) => [
        lx * mx + ly * nx,
        lx * my + ly * ny - lz
      ];
      
      const l = -avatarW/2, r = avatarW/2, t = -avatarW/2, b = avatarW/2;
      const sideColorLeft = d3.color(themeColor).darker(1.2);
      const sideColorRight = d3.color(themeColor).darker(0.8);

      // --- Side Walls (Drawn FIRST so they stay behind) ---
      // Front-Right Wall
      avGrp.append("path")
        .attr("d", `M ${p3d(r, t, 0)} L ${p3d(r, t, chipH)} L ${p3d(r, b, chipH)} L ${p3d(r, b, 0)} Z`)
        .attr("fill", sideColorRight);
      
      // Front-Left Wall
      avGrp.append("path")
        .attr("d", `M ${p3d(l, b, 0)} L ${p3d(l, b, chipH)} L ${p3d(r, b, chipH)} L ${p3d(r, b, 0)} Z`)
        .attr("fill", sideColorLeft);

      // --- Top Face (Raised) ---
      const topGrp = avGrp.append("g")
        .attr("transform", `translate(0, -${chipH}) matrix(${matrixStr})`);

      topGrp.append("rect")
        .attr("x", -avatarW/2)
        .attr("y", -avatarW/2)
        .attr("width", avatarW)
        .attr("height", avatarW)
        .attr("rx", avatarR)
        .attr("fill", data.isMe ? "#FFD700" : themeColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("filter", "url(#soft-shadow)");

      // Image Clip
      const clipId = `clip-iso-cube-v3-${data.id}-${isSpouse?'s':''}`;
      defs.append("clipPath")
        .attr("id", clipId)
        .append("rect")
        .attr("x", -avatarW/2 + 1)
        .attr("y", -avatarW/2 + 1)
        .attr("width", avatarW - 2)
        .attr("height", avatarW - 2)
        .attr("rx", avatarR - 1);

      topGrp.append("image")
        .attr("xlink:href", data.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png")
        .attr("x", -avatarW/2 + 1)
        .attr("y", -avatarW/2 + 1)
        .attr("width", avatarW - 2)
        .attr("height", avatarW - 2)
        .attr("clip-path", `url(#${clipId})`)
        .attr("preserveAspectRatio", "xMidYMid slice");

      // --- Name Label (Aligned with Generation Text - Front-Left) ---
      // We use base matrixStr and move to the front-left spot
      const labelG = avGrp.append("g")
        .attr("transform", `translate(-60, ${avatarW/2 - 20}) matrix(${matrixStr})`);





      labelG.append("text")
        .text(data.name)
        .attr("text-anchor", "start")

        .attr("fill", "#fff")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .style("font-family", "sans-serif")
        .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.8)");

      if (!data.isMe) {
        labelG.append("text")
          .text(data.relation)
          .attr("y", 14)
          .attr("text-anchor", "start")

          .attr("fill", "#ccc")
          .attr("font-size", "10px")
          .style("font-family", "sans-serif")
          .style("text-transform", "uppercase")
          .attr("opacity", 0.9);
      }


    };

    renderAvatar(d.data, false);
    if (d.data.spouse) {
      renderAvatar(d.data.spouse, true);
    }
  });

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);

  // --- ANIMATION SEQUENCE ---

  // Replaces static auto-zoom

  const playStartupAnimation = () => {
    // 1. Initial State: Hide all components
    d3.selectAll("[class*='block-d-']").style("opacity", 0);
    d3.selectAll("[class*='shadow-d-']").style("opacity", 0);
    d3.selectAll(".node-group").style("opacity", 0);
    linkLayer.selectAll(".iso-link").attr("opacity", 0);

    // 2. Set Initial Zoom Config (Close to Me)
    const meNode = root.descendants().find((d) => d.data.isMe) || root;
    const [mx, my] = toIso(meNode.x, meNode.y);
    const mz = getExtrusion(meNode.depth);
    const centerPos = [mx, my - mz * params.zScale];

    const startScale = 1.2;
    const startX = width / 2 - centerPos[0] * startScale;
    const startY = height / 2 - centerPos[1] * startScale;

    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(startX, startY).scale(startScale),
    );

    const maxDepth = d3.max(root.descendants(), (d) => d.depth);

    // --- PHASE 1: Reveal Bases First ---
    for (let d = 0; d <= maxDepth; d++) {
      d3.selectAll(`.block-d-${d}`)
        .transition()
        .delay(d * 400) // Cascading bases
        .duration(800)
        .style("opacity", 1);
      d3.selectAll(`.shadow-d-${d}`)
        .transition()
        .delay(d * 400)
        .duration(800)
        .style("opacity", 0.1);
    }

    const basePhaseTime = maxDepth * 400 + 800; // Time when all bases are visible

    // Wait for all bases to show up, then start connections & nodes
    setTimeout(() => {
      try {
        const bounds = g.node().getBBox();
        let endTransform = d3.zoomIdentity
          .translate(startX, startY)
          .scale(startScale);

        if (bounds.width > 0) {
          const fitScale = Math.min(
            0.9,
            (width - 100) / bounds.width,
            (height - 100) / bounds.height,
          );
          const midX = bounds.x + bounds.width / 2;
          const midY = bounds.y + bounds.height / 2;

          const endX = width / 2 - midX * fitScale;
          const endY = height / 2 - midY * fitScale;

          endTransform = d3.zoomIdentity.translate(endX, endY).scale(fitScale);
        }

        // --- PHASE 2: Zoom Out Smoothly ---
        svg
          .transition()
          .duration(4000)
          .ease(d3.easeCubicInOut)
          .call(zoom.transform, endTransform);

        // --- PHASE 3: Connections leading to users ---
        linkLayer
          .selectAll(".iso-link")
          .transition()
          .delay((d) => d.source.depth * 800) // connections ripple outwards
          .duration(1500) // takes time to "draw" to the user
          .attr("opacity", 1)
          .attrTween("stroke-dasharray", function () {
            const len = this.getTotalLength();
            return function (t) {
              return d3.interpolateString("0," + len, len + "," + len)(t);
            };
          })
          .on("end", function () {
            d3.select(this).attr("stroke-dasharray", null);
          });

        // --- PHASE 4: Reveal Users (Nodes) ---
        // Nodes pop in exactly when the connection drawing reaches their depth
        d3.selectAll(".node-group")
          .transition()
          .delay((d) => {
            // Depth 0 (Me/Spouse) appear immediately
            // Others appear after connection finishes drawing towards them
            return d.depth === 0 ? 0 : (d.depth - 1) * 800 + 1500;
          })
          .duration(800)
          .style("opacity", 1);

        // Safety Catch
        setTimeout(
          () => {
            d3.selectAll(".node-group").style("opacity", 1);
            d3.selectAll(".iso-link")
              .attr("opacity", 1)
              .attr("stroke-dasharray", null);
          },
          maxDepth * 800 + 3000,
        );
      } catch (e) {
        console.error("Animation error", e);
      }
    }, basePhaseTime + 400); // 400ms pause after all bases loaded before zooming/connections
  };

  // Trigger
  playStartupAnimation();
}
