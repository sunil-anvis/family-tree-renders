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
  const getExtrusion = (depth) => Math.max(10, 50 - depth * 2); // Dynamic Extrusion: 50 layers start, -2 per gen
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
  const linkLayer = g.append("g"); // Links ON TOP
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
    const sideColor = d3.hsl(baseColor);
    sideColor.l += 0.15; // Side is lighter

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
      .attr("stroke", borderColor)
      .attr("stroke-width", 2);

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

    const generateSinglePath = (linkSx, linkTx) => {
      // Offset start/end to be at the block boundary_
      const yOffset = 30; // Closer to avatar

      const p0 = project(linkSx, sy + yOffset, sz); // Start (Bottom of source block)
      const p1 = project(linkSx, midY, sz); // Corner 1 vertical

      const p2 = project(linkTx, midY, tz); // Corner 2 horizontal end
      const p3 = project(linkTx, ty - yOffset, tz); // End (Top of target block)

      // Rounding Radius
      const r = 15;

      // 1. Segment P0 -> P1
      const v01 = sub(p1, p0);
      const d01 = len(v01);

      // 2. Segment P1 -> P2 (Bridge)
      const v12 = sub(p2, p1);
      const d12 = len(v12);

      // 3. Segment P2 -> P3
      const v23 = sub(p3, p2);
      const d23 = len(v23);

      if (d01 < r || d12 < r || d23 < r) {
        // Too short for curves, draw straight
        return `M ${p0[0]},${p0[1]} L ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]} L ${p3[0]},${p3[1]}`;
      }

      // Calculate Start/End points of curves
      // Corner 1 (at P1)
      const c1_start = add(p1, scale(norm(sub(p0, p1)), r)); // Back towards P0
      const c1_end = add(p1, scale(norm(sub(p2, p1)), r)); // Fwd towards P2

      // Corner 2 (at P2)
      const c2_start = add(p2, scale(norm(sub(p1, p2)), r)); // Back towards P1
      const c2_end = add(p2, scale(norm(sub(p3, p2)), r)); // Fwd towards P3

      // Build Path
      return `M ${p0[0]},${p0[1]}
                  L ${c1_start[0]},${c1_start[1]}
                  Q ${p1[0]},${p1[1]} ${c1_end[0]},${c1_end[1]}
                  L ${c2_start[0]},${c2_start[1]}
                  Q ${p2[0]},${p2[1]} ${c2_end[0]},${c2_end[1]}
                  L ${p3[0]},${p3[1]} `;
    };

    let path = generateSinglePath(sx, tx);

    if (s.data.spouse) {
      const AVATAR_Gap = 110;
      path += " " + generateSinglePath(sx + AVATAR_Gap, tx);
    }

    return path;
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
    .attr("stroke-width", 4) // Slightly clear stroke
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
      const xOff = isSpouse ? 110 : 0; // Increased to 110 for text spacing

      // CRITICAL FIX: Use current projection for offset
      // Calculate offset in ISO space relative to (0,0)
      // We want to move +xOff in Tree X Axis.
      // toIso(x, y) = [rx * scale, ry * tilt * scale]
      // where rx = x*cos - y*sin, ry = x*sin + y*cos

      // Delta X offset:
      // rx_d = xOff * cos - 0 * sin = xOff * cos
      // ry_d = xOff * sin + 0 * cos = xOff * sin

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

          // Bring entire family group to front to avoid clipping by row below
          d3.select(this.parentNode).raise();
          // Bring this specific person to front of the pair
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
          // Construct a mock node object for showModal if needed,
          // or just pass { data: data } since showModal reads d.data
          showModal({ data: data });
        });

      // ... Render Avatar Content into avGrp ...
      // (Copy existing avatar rendering code here)

      const color = getGenColor(d); // Shared generation color

      // ... Code from below ...
      // Helper for Initials
      const getInitials = (name) =>
        name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

      // Helper for Avatar Color based on Gen Theme & Gender
      const getAvatarThemeColor = (nodeData, theme) => {
        // Evaluate by checking if explicit female tag exists, else fall back to male logic
        const isFemale = nodeData.gender === 'f' || nodeData.gender === 'F';
        return isFemale ? theme.female : theme.male;
      };

      // Scale for internal geometry
      const avatarScale = 0.8;
      const localIso = (dx, dy) => [
        (dx - dy) * avatarScale,
        (dx + dy) * 0.5 * avatarScale,
      ];

      const w = tileW;
      // const h = tileH;
      const r = tileR;

      // Bounds relative to center
      const l = -w / 2,
        right = w / 2,
        t = -w / 2,
        b = w / 2;

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
      const overlapZ = 0;
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
      const st_t_r = pLoc(right - r, t, skirt_tz);
      const scp_r_t = pLoc(right, t, skirt_tz);
      const b_t_t_r = pLoc(right - r, t, bz);
      const b_cp_r_t = pLoc(right, t, bz);

      const sidePath = `
                 M ${st_t_r}
                 Q ${scp_r_t} ${st_r_t}
                 L ${st_r_b} Q ${scp_r_b} ${st_b_r}
                 L ${st_b_l} Q ${scp_l_b} ${st_l_b}
                 L ${st_l_b}
                 L ${b_t_l_b} Q ${b_cp_l_b} ${b_t_b_l}
                 L ${b_t_b_r} Q ${b_cp_r_b} ${b_t_r_b}
                 L ${b_t_r_t} Q ${b_cp_r_t} ${b_t_t_r}
                 L ${st_t_r} Z`;

      // Draw Side (Solid Block)
      avGrp
        .append("path")
        .attr("d", sidePath)
        .attr("fill", d3.color(color).darker(0.8)) // Darker side for 3D effect
        .attr("stroke", d3.color(color).darker(1.0))
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round");

      // Draw Top (Solid Block)
      const currentTheme = getGenTheme(d);
      const tileColor = data.isMe ? "#0D8ABC" : getAvatarThemeColor(data, currentTheme);

      // Solid Color
      avGrp
        .append("path")
        .attr("id", `tile - path - ${data.id} `)
        .attr("d", topPathIdx)
        .attr("fill", tileColor) // Solid fill
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      // Initials (Native SVG Text)
      // Use dynamic matrix based on 'labels' param
      const activeMatrix =
        params.labels === "billboard" ? billboardMatrixStr : matrixStr;

      avGrp
        .append("text")
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
        .attr("transform", `translate(0, ${-tz}) matrix(${activeMatrix})`);

      // Overlay for "Me" border
      if (data.isMe) {
        avGrp
          .append("use")
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

      let textTransform;
      if (params.labels === "billboard") {
        // Simple offset down in screen Y
        textTransform = `translate(0, ${30 + tz * params.zScale}) matrix(${billboardMatrixStr})`;
      } else {
        // Iso Mode (On floor)
        textTransform = `translate(0, 30) matrix(${matrixStr})`; // +30 units in Local Floor Y?
      }

      // Helper to truncate text
      const truncate = (str, n) =>
        str && str.length > n ? str.slice(0, n - 3) + "..." : str;

      const textG = avGrp.append("g").attr("transform", textTransform);

      // Name
      const nameText = textG
        .append("text")
        .text(truncate(data.name, 15)) // Truncate name
        .attr("text-anchor", "middle")
        .attr("fill", "#222")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .style("font-family", "sans-serif");

      nameText.append("title").text(data.name); // Tooltip

      // Relation
      if (!data.isMe) {
        const relationText = textG
          .append("text")
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
  }); // Zoom

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);

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
