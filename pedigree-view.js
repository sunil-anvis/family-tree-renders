/**
 * Pedigree View — Ancestor-only (father/mother) chart.
 * Shows ALL ancestors fully expanded. No '+' collapse feature.
 *
 * Layout: Root on left → Father (above) + Mother (below) → Grandparents → …
 * Cards: blue border for male, pink border for female.
 * Connectors: vertical from card top/bottom, curved bend, horizontal to parent.
 *
 * Uses a slot-based layout: every leaf gets one equal-height slot,
 * parent nodes are centered between their children → equal spacing everywhere.
 */

function initPedigreeView() {
    const svg = d3.select("#tree-container svg");
    svg.selectAll("*").remove();
    svg.on(".drag", null);
    svg.on(".zoom", null);
    svg.style("background", "#f5f7fa");

    const width = +svg.attr("width");
    const height = +svg.attr("height");

    // --- Dimensions ---
    const CARD_W = 170;
    const CARD_H = 50;
    const CARD_R = 10;
    const AVATAR_R = 16;
    const COL_GAP = 50;    // horizontal gap between card edges
    const V_GAP = 14;    // vertical gap between adjacent cards (equal everywhere)
    const BEND_R = 10;    // rounded corner radius for connectors

    const LINE_COLOR = "#e2e8f0";
    const LINE_W = 2.0;
    const MALE_BORDER = "#51d1e3";
    const FEMALE_BORDER = "#f5a3c7";

    // --- Build node map ---
    const flatList = Array.isArray(rawFamilyData) ? rawFamilyData : (rawFamilyData.data || []);
    const nodeMap = new Map();
    flatList.forEach(p => {
        nodeMap.set(String(p.id), {
            id: String(p.id), name: p.name, gender: p.gender,
            photo: p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
            relation: p.relation || "Family Member",
            isMe: p.relation === "Myself" || p.relation === "Me",
            fid: p.fid ? String(p.fid) : null,
            mid: p.mid ? String(p.mid) : null,
            pids: (p.pids || []).map(String),
            location: p.location
        });
    });

    // Root
    const me = [...nodeMap.values()].find(p => p.isMe);
    const rootId = me ? me.id : nodeMap.keys().next().value;
    const rootPerson = nodeMap.get(rootId);
    if (!rootPerson) return;

    // =========================================================
    // PASS 1: Count leaf slots (bottom-up)
    // Each leaf (no parents in view) = 1 slot.
    // A node with both parents = fatherSlots + motherSlots.
    // A node with one parent = that parent's slots.
    // =========================================================
    const slotCache = new Map();

    function countSlots(person, visited) {
        if (!person || visited.has(person.id)) return 1;
        if (slotCache.has(person.id)) return slotCache.get(person.id);
        visited.add(person.id);

        const father = person.fid ? nodeMap.get(person.fid) : null;
        const mother = person.mid ? nodeMap.get(person.mid) : null;

        if (!father && !mother) {
            slotCache.set(person.id, 1);
            return 1;
        }

        const fSlots = father ? countSlots(father, new Set(visited)) : 0;
        const mSlots = mother ? countSlots(mother, new Set(visited)) : 0;

        const total = (father && mother) ? fSlots + mSlots
            : father ? fSlots : mSlots;

        slotCache.set(person.id, total);
        return total;
    }

    const totalSlots = countSlots(rootPerson, new Set());

    // Slot height: each slot = CARD_H + V_GAP (gap is between slots)
    const SLOT_H = CARD_H + V_GAP;
    const totalHeight = totalSlots * CARD_H + (totalSlots - 1) * V_GAP;
    const startY = height / 2 - totalHeight / 2;

    // =========================================================
    // PASS 2: Place nodes (top-down, slot-based)
    // Leaves placed at slot centers. Parents centered between children.
    // Returns the Y center of the person.
    // =========================================================
    const cards = [];
    const lines = [];
    const nextX_offset = CARD_W / 2 + COL_GAP + CARD_W / 2;

    function place(person, cx, slotStart, visited) {
        if (!person || visited.has(person.id)) {
            // Phantom slot — return center of a single slot
            const cy = startY + slotStart * SLOT_H + CARD_H / 2;
            return cy;
        }
        visited.add(person.id);

        const father = person.fid ? nodeMap.get(person.fid) : null;
        const mother = person.mid ? nodeMap.get(person.mid) : null;

        // Leaf node — position at slot center
        if (!father && !mother) {
            const cy = startY + slotStart * SLOT_H + CARD_H / 2;
            cards.push({ person, x: cx, y: cy });
            return cy;
        }

        const nextX = cx + nextX_offset;
        const fSlots = father ? countSlots(father, new Set(visited)) : 0;
        const mSlots = mother ? countSlots(mother, new Set(visited)) : 0;

        let fatherCy, motherCy;
        let cy;

        if (father && mother) {
            // Father gets top slots, mother gets bottom slots
            fatherCy = place(father, nextX, slotStart, new Set(visited));
            motherCy = place(mother, nextX, slotStart + fSlots, new Set(visited));
            cy = (fatherCy + motherCy) / 2;
        } else if (father) {
            fatherCy = place(father, nextX, slotStart, new Set(visited));
            cy = fatherCy;
        } else {
            motherCy = place(mother, nextX, slotStart, new Set(visited));
            cy = motherCy;
        }

        cards.push({ person, x: cx, y: cy });

        // --- Connections: top/bottom of card → vertical → curve right → parent ---
        if (father) {
            lines.push({
                type: 'topbottom',
                startX: cx, startY: cy - CARD_H / 2,
                targetX: nextX - CARD_W / 2, targetY: fatherCy,
                goingUp: true
            });
        }
        if (mother) {
            lines.push({
                type: 'topbottom',
                startX: cx, startY: cy + CARD_H / 2,
                targetX: nextX - CARD_W / 2, targetY: motherCy,
                goingUp: false
            });
        }

        return cy;
    }

    place(rootPerson, 100 + CARD_W / 2, 0, new Set());

    // =========================================================
    // RENDER
    // =========================================================
    const g = svg.append("g");
    const defs = svg.append("defs");

    // Shadow filter
    const shadow = defs.append("filter")
        .attr("id", "ped-shadow")
        .attr("x", "-15%").attr("y", "-15%")
        .attr("width", "130%").attr("height", "140%");
    shadow.append("feDropShadow")
        .attr("dx", 0).attr("dy", 1)
        .attr("stdDeviation", 4)
        .attr("flood-color", "rgba(0,0,0,0.07)");

    const lineG = g.append("g");
    const cardG = g.append("g");

    // --- Draw connectors ---
    lines.forEach(l => {
        if (l.type === 'topbottom') {
            const r = Math.min(BEND_R, Math.abs(l.targetY - l.startY) / 2, Math.abs(l.targetX - l.startX) / 2);

            let path;
            if (l.goingUp) {
                path = `M ${l.startX},${l.startY} ` +
                    `L ${l.startX},${l.targetY + r} ` +
                    `Q ${l.startX},${l.targetY} ${l.startX + r},${l.targetY} ` +
                    `L ${l.targetX},${l.targetY}`;
            } else {
                path = `M ${l.startX},${l.startY} ` +
                    `L ${l.startX},${l.targetY - r} ` +
                    `Q ${l.startX},${l.targetY} ${l.startX + r},${l.targetY} ` +
                    `L ${l.targetX},${l.targetY}`;
            }

            lineG.append("path")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", LINE_COLOR)
                .attr("stroke-width", LINE_W)
                .attr("stroke-linecap", "round");
        }
    });

    // --- Draw cards ---
    cards.forEach(c => {
        const person = c.person;
        const cx = c.x;
        const cy = c.y;
        const isFemale = person.gender === 'f';
        const borderColor = isFemale ? FEMALE_BORDER : MALE_BORDER;
        const ringBg = isFemale ? '#fce4ec' : '#e3f2fd';
        const trunc = (s, n) => s && s.length > n ? s.slice(0, n - 2) + '…' : s;

        const card = cardG.append("g")
            .attr("transform", `translate(${cx}, ${cy})`)
            .style("cursor","pointer")
            .on("click", e => { e.stopPropagation(); showModal({ data: person }); });

        // Card background
        card.append("rect")
            .attr("x", -CARD_W / 2).attr("y", -CARD_H / 2)
            .attr("width", CARD_W).attr("height", CARD_H)
            .attr("rx", CARD_R)
            .attr("fill", "white")
            .attr("stroke", borderColor)
            .attr("stroke-width", 1.5)
            .attr("filter", "url(#ped-shadow)");

        // Avatar clip
        const clipId = `pc${person.id}${Math.random().toString(36).slice(2, 6)}`;
        defs.append("clipPath").attr("id", clipId)
            .append("circle").attr("r", AVATAR_R)
            .attr("cx", -CARD_W / 2 + 28).attr("cy", 0);

        const avX = -CARD_W / 2 + 28;

        // Avatar ring
        card.append("circle")
            .attr("cx", avX).attr("cy", 0).attr("r", AVATAR_R + 2)
            .attr("fill", ringBg)
            .attr("stroke", borderColor).attr("stroke-width", 1.2);

        // Avatar image
        card.append("image")
            .attr("xlink:href", person.photo)
            .attr("x", avX - AVATAR_R).attr("y", -AVATAR_R)
            .attr("width", AVATAR_R * 2).attr("height", AVATAR_R * 2)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");

        // Name
        card.append("text")
            .attr("x", avX + AVATAR_R + 9).attr("y", -3)
            .attr("font-family", "'Poppins', 'Segoe UI', sans-serif")
            .attr("font-size", "12px").attr("font-weight", 600)
            .attr("fill", "#37474f")
            .text(trunc(person.name, 16))
            .append("title").text(person.name);

        // Relation
        card.append("text")
            .attr("x", avX + AVATAR_R + 9).attr("y", 11)
            .attr("font-family", "'Poppins', 'Segoe UI', sans-serif")
            .attr("font-size", "9px").attr("font-weight", 400)
            .attr("fill", "#a0aab0")
            .text(trunc(person.relation || "", 24));
    });

    // --- Title ---
    svg.append("text")
        .attr("x", 22).attr("y", 28)
        .attr("font-family", "'Poppins', sans-serif")
        .attr("font-size", "15px").attr("font-weight", 600)
        .attr("fill", "#546e7a")
        .text("Pedigree View");

    // --- Zoom & Pan ---
    const zoom = d3.zoom()
        .scaleExtent([0.15, 3])
        .on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
}
