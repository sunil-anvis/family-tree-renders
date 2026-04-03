# Family Tree Renders — Full Project Documentation

> **Project:** Interactive Family Tree Visualizer
> **Stack:** Vanilla HTML/CSS/JS · D3.js v7 · Three.js · Bootstrap 5 · Globe.gl
> **Entry Point:** `index.html`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Data Model (`data.json`)](#3-data-model-datajson)
4. [Application Boot Flow](#4-application-boot-flow)
5. [Core Modules](#5-core-modules)
   - [transform-api-data.js — Data Pipeline](#51-transform-api-datajs--data-pipeline)
   - [index.js — Main Application Controller](#52-indexjs--main-application-controller)
6. [View Modules — Detailed Walkthrough](#6-view-modules--detailed-walkthrough)
   - [Tree View (`initTree`)](#61-tree-view-inittree)
   - [Vertical Tree View (`initVerticalTreeV2`)](#62-vertical-tree-view-initverticaltreev2)
   - [Fan View (`initFan`)](#63-fan-view-initfan)
   - [Pedigree View (`initPedigreeView`)](#64-pedigree-view-initpedigreeview)
   - [3D Isometric View (`init3DTree`)](#65-3d-isometric-view-init3dtree)
   - [Globe View (`initThreeGlobe`)](#66-globe-view-initthreeglobe)
7. [Shared UI Components](#7-shared-ui-components)
   - [Modal (Person Details)](#71-modal-person-details)
   - [Trace Path Feature](#72-trace-path-feature)
   - [Family Focus Filters](#73-family-focus-filters)
8. [Styling System (`index.css`)](#8-styling-system-indexcss)
9. [State Management](#9-state-management)
10. [Event Flow & Interactions](#10-event-flow--interactions)
11. [Key Algorithms](#11-key-algorithms)
12. [Data → View: Complete End-to-End Flow](#12-data--view-complete-end-to-end-flow)

---

## 1. Project Overview

This project renders a family tree using multiple interactive visualization views. A single flat JSON dataset (`data.json`) describes all family members and their relationships. The application transforms this flat data into hierarchical structures and renders them through six distinct views, all switchable at runtime without page reload.

**Core capabilities:**
- Six switchable visualization modes (Tree, Vertical Tree, Fan/Sunburst, Pedigree, 3D Isometric, Globe)
- Glassmorphism modal with member details on click
- "Trace Path from Me" animation in Vertical Tree
- Family focus filters (My Family, Maternal, Wife/External, Individual)
- Full zoom & pan across all views
- Auto-generated avatar images for members without photos

---

## 2. File Structure

```
family-tree-renders/
│
├── index.html              ← Entry point: HTML shell, loads all scripts
├── index.css               ← Global styles, design tokens, animations
│
├── data.json               ← Raw flat family member data (API format)
├── transform-api-data.js   ← Converts flat data → D3 hierarchy tree
│
├── index.js                ← Main controller: views, events, modal, trace
│
├── pedigree-view.js        ← Pedigree (ancestor-only) chart view
├── fanview.js              ← Fan/Sunburst view (currently overridden by index.js initFan)
├── 3d-view.js              ← Isometric 3D view using D3 SVG transforms
├── globe_view.js           ← Globe view (Three.js / Globe.gl)
│
├── add_coords.js           ← Script to add geographic coordinates to data
├── globe_code.txt          ← Reference globe code (not loaded)
├── globe_code_clean.txt    ← Cleaned globe reference code (not loaded)
├── temp_globe_code.js      ← Temporary globe experimentation (not loaded)
│
└── index.js_backup         ← Backup of index.js
```

**Load order in `index.html` (critical):**
1. Bootstrap CSS/JS
2. D3.js v7
3. Three.js Core + OrbitControls + GLTFLoader
4. Globe.gl
5. TopoJSON
6. `transform-api-data.js` ← Must load before `index.js`
7. `globe_view.js`
8. `3d-view.js`
9. `pedigree-view.js`
10. `index.js` ← Runs last; bootstraps everything

---

## 3. Data Model (`data.json`)

The data is a **flat array** of person objects. Relationships are encoded through ID references (not nested).

### Person Object Schema

```json
{
  "id": 1,                        // Unique numeric ID
  "name": "Hashir Ansari",        // Full name
  "gender": "m",                  // "m" = male, "f" = female
  "dob": "1992-12-25",            // Date of birth (nullable)
  "fid": 26,                      // Father's ID (nullable / empty string)
  "mid": 101,                     // Mother's ID (nullable / empty string)
  "pids": [3642],                 // Partner/Spouse IDs (array)
  "photo": "https://...",         // Avatar URL
  "relation": "Myself",           // Relation label (e.g., "Father", "Uncle")
  "relation_id": null,            // Numeric relation type code
  "tags": ["kintree"],            // Source/group tags
  "status": true,                 // Account active status
  "is_system_password": 0,
  "is_user_added_by_me": 0,
  "is_godfather": false,
  "has_godfather": false
}
```

### Relationship Encoding

| Field | Meaning |
|-------|---------|
| `fid` | ID of this person's **father** |
| `mid` | ID of this person's **mother** |
| `pids` | Array of **partner/spouse** IDs |

The root person (the user, "Me") is identified by `"relation": "Myself"` or `"relation": "Me"`.

Empty strings (`""`) in `fid`/`mid` mean "no parent known" — these are treated as `null`.

### Example Family Chain

```
Abdul Aziz (id:108) ──married── Zaiton (id:109)
       └── Monis (id:103, fid:108, mid:109) ──married── Zaheda (id:105)
                └── Shahzad (id:26, fid:103, mid:105) ──married── (id:101)
                         └── Hashir Ansari (id:1, fid:26, mid:101)  ← "Myself"
```

---

## 4. Application Boot Flow

```
index.html loads
     │
     ├── Scripts load in order
     │
     └── index.js executes immediately:
              │
              ├── Creates global SVG canvas on #tree-container
              ├── Creates modal overlay (hidden)
              ├── Sets currentView = 'vertical-tree' (default from active button)
              │
              └── Fetches data.json
                       │
                       ├── rawFamilyData = parsed JSON array (saved globally)
                       │
                       ├── familyData = transformFamilyData(rawFamilyData)
                       │     └── Converts flat array → nested hierarchy object
                       │
                       └── initApp()
                                └── switchView('vertical-tree')
                                         └── initVerticalTreeV2()
```

### Data Fetch (in `index.js`)

```javascript
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    rawFamilyData = data;                              // Flat array kept globally
    familyData = transformFamilyData(rawFamilyData);  // Hierarchy for tree views
    initApp();
  });
```

Two global variables are maintained:
- **`rawFamilyData`** — the original flat array (used by Fan View, Pedigree, Globe for graph traversal)
- **`familyData`** — the transformed D3 hierarchy tree object (used by Tree View, Vertical Tree)

---

## 5. Core Modules

### 5.1 `transform-api-data.js` — Data Pipeline

This file converts the flat `data.json` into a D3-compatible nested hierarchy.

#### Phase 1: Graph Construction (`_personMap`)

```
Flat Array → Map<id, Person>
                  │
                  ├── Each person gets: id, name, gender, age, photo, 
                  │   relation, isMe, fid, mid, pids, children:[]
                  │
                  ├── Parent→Child Linking:
                  │     For each person, find their father (fid) or mother (mid)
                  │     and push this person into that parent's children[] array.
                  │
                  └── Spouse Attachment:
                        For each person with pids[], attach first spouse's 
                        data as person.spouse = { id, name, gender, photo, relation }
```

The `_personMap` is **cached globally** — it's only built once even if called multiple times.

#### Phase 2: Focus & Root Selection

```
1. Find focus person: 
   - Use provided focusId, OR
   - Find person where isMe === true

2. Walk up to eldest ancestor (findEldestAncestor):
   - Follow fid → fid → fid... until no more parents
   - This gives us the tree's topmost root
```

#### Phase 3: Tree Building

```
buildSubtree(ancestorRoot)
  └── Recursively walks node.children[]
      Returns nested { ...person, children: [...] }
      Uses visited Set to prevent circular loops

cleanTree(node)
  └── Removes fid, mid, pids (now structural, not needed)
      Prevents circular JSON serialization issues
```

#### Supporting Transforms

| Function | Purpose |
|----------|---------|
| `transformFamilyData(data, focusId)` | Entry point; detects format and dispatches |
| `isApiFormat(data)` | Checks if data has `fid`/`mid` fields (API format) |
| `calculateAge(dob)` | Converts DOB string to numeric age |
| `transformToIndividualFamily(data, focusId)` | Builds a trimmed view: Parents → Siblings + Me → My Children |

---

### 5.2 `index.js` — Main Application Controller

This is the largest file (~2,500 lines). It manages:

1. **Global SVG canvas** — one shared canvas, cleared on each view switch
2. **Modal** — glassmorphism person detail popup
3. **Six view initializer functions**
4. **View switcher (`switchView`)** — orchestrates cleanup + init
5. **Family filter buttons**
6. **Event listeners** (buttons, resize, checkbox)

#### Global State Variables

```javascript
let familyData;           // D3 hierarchy tree (nested)
let rawFamilyData;        // Original flat array
let currentView;          // Active view name string
let currentTreeRoot;      // D3 hierarchy root node (for Trace feature)
let ancestorMode;         // Boolean: Parents-only mode in Fan View
let fanHistory;           // Stack for Fan View navigation history
let currentFanRootId;     // ID of current Fan View root
```

---

## 6. View Modules — Detailed Walkthrough

### 6.1 Tree View (`initTree`)

**Layout:** Top-down tree. Root at top, descendants cascade downward.

**Algorithm:**
1. Clear SVG, set teal gradient background
2. Create D3 hierarchy from `familyData`
3. Apply `d3.tree()` layout with `nodeSize([cardWidth*2+50, cardHeight+40])`
4. Draw connector **paths** between nodes using orthogonal elbow paths
5. Draw **card nodes** — each card has: background rect, avatar circle, photo image, name, relation
6. Couples (nodes with `.spouse`) render two cards side-by-side with a bracket connector
7. Apply zoom/pan behavior

**Link Drawing:**
- If source has spouse: draws a **bracket** — two verticals from Father/Mother, horizontal bar between them, then a vertical drop to the child
- If target has spouse: draws an **upward bracket** from the child line up to both parents
- Otherwise: simple orthogonal L-shape (`V midY H targetX V targetY`)

**Card Rendering (`renderCard`):**
```
Group (translated to node position)
 ├── rect (.tree-card-bg) — rounded rectangle, gradient fill
 ├── clipPath → circle — for avatar clipping
 ├── image — person's photo, clipped to circle
 ├── circle — avatar ring (gold if isMe, teal otherwise)
 └── text group
      ├── .tree-card-name — truncated to 15 chars
      └── .tree-card-relation — truncated to 20 chars
```

---

### 6.2 Vertical Tree View (`initVerticalTreeV2`)

**Layout:** Left-to-right tree. Root on left (eldest ancestor), descendants flow rightward.

**Key difference from Tree View:** The x and y axes are swapped — D3's `d.y` (depth) becomes horizontal position, and `d.x` (breadth) becomes vertical position.

```javascript
const getX = (d) => d.y;   // Maps depth → horizontal (left-right)
const getY = (d) => d.x;   // Maps breadth → vertical (up-down)
```

**Algorithm:**
1. Clear SVG, set blue gradient background
2. Build D3 hierarchy and apply `d3.tree()` with custom separator
3. The separator gives extra space when a node has a spouse (so both cards fit)
4. Draw links with custom orthogonal paths considering spouse presence
5. Draw cards with `renderVCard` (same as `renderCard` but offset vertically for spouse)
6. Apply zoom/pan

**This is the default view when the app loads.**

**Trace Feature is only active in this view** — clicking a node in the modal shows "Trace Path from Me" button.

**Spouse Rendering:**
- Main node card renders at y=0
- Spouse card renders at `y = cardHeight + 20` (directly below, same x)
- A gap connector line is drawn between them in the link paths

---

### 6.3 Fan View (`initFan`)

**Layout:** Radial sunburst chart. "Me" in the center, relatives radiate outward in concentric rings.

**Algorithm:**

#### Step 1: Build the Graph (Adjacency List)
```
rawFamilyData (flat array)
  → For each person, add bidirectional edges:
      person ↔ father (fid)
      person ↔ mother (mid)
      person ↔ spouse (pids)
  → Result: adj Map<id, [neighbor ids]>
```

#### Step 2: BFS from Root ("Me")
```
Start at "Me" node
BFS outward through adjacency list
→ Build a new tree structure centered on Me
→ Parents, children, siblings, spouses all become "children" in this new tree

Depth limit: 15 levels
Optional: ancestorMode = true → only traverse fid/mid edges (parents only)
```

#### Step 3: D3 Partition Layout
```
d3.hierarchy(newRoot)
  .count()         ← sets .value = number of leaves
fanRoot.eachBefore(d => {
  // Assign x0, x1 (angles in radians 0..2π)
  // Assign y0, y1 (radii)
  // Ring thickness: 80px for depth 1-4, 60px for deeper
})
```

#### Step 4: Draw Arcs
```
d3.arc() → SVG path for each segment
Color: cyclic palette by depth [blue, pink, yellow, green, purple, orange]
```

#### Step 5: '+' Overflow Node
- Segments smaller than `MIN_ANGLE_THRESHOLD (0.08 rad ≈ 4.5°)` become "+" nodes
- Clicking "+" re-centers the fan on that person

#### Step 6: Labels
- Names rendered as rotated text inside each arc segment
- Wrapped using custom `wrap()` function if too long

#### Navigation
- Click any segment → `initFan(clickedId)` (re-roots the fan)
- Back button → pops `fanHistory` stack
- Reset button → clears history, returns to "Me"
- "Parents Mode" checkbox → `ancestorMode = true`

---

### 6.4 Pedigree View (`initPedigreeView`)

**Defined in:** `pedigree-view.js`

**Layout:** Ancestor-only chart. Root ("Me") on the far **left**, parents branch to the **right**, grandparents further right, and so on.

**Key design principle:** No collapsing — all ancestors always fully visible.

#### Pass 1: Count Leaf Slots (`countSlots`)

```
countSlots(person)
  ├── If no parents → 1 slot (leaf)
  ├── If has father only → fatherSlots
  ├── If has mother only → motherSlots
  └── If has both → fatherSlots + motherSlots
```

This bottom-up count determines how much vertical space each sub-branch needs.

**Slot height:** `CARD_H (50px) + V_GAP (14px) = 64px` per slot

#### Pass 2: Place Nodes (`place`)

```
place(person, cx, slotStart, visited)
  ├── Leaf → cy = startY + slotStart × SLOT_H + CARD_H/2
  ├── Has parents:
  │     Father → place(father, cx + nextX_offset, slotStart)
  │     Mother → place(mother, cx + nextX_offset, slotStart + fatherSlots)
  │     cy = (fatherCy + motherCy) / 2  ← centered between parents
  │
  ├── Push { person, x:cx, y:cy } to cards[]
  └── Push connector data to lines[]
```

#### Connector Geometry (SVG path)

```
For father connector (going UP):
  M cx, cy-CARD_H/2          ← bottom of current card center (top edge upward)
  L cx, fatherCy+r           ← vertical down/up to near target row
  Q cx, fatherCy   cx+r, fatherCy   ← rounded corner
  L targetX, fatherCy        ← horizontal to father's card left edge
```

The `BEND_R = 10px` creates smooth rounded corners at the turn.

#### Rendering
- Each card: white rounded rect with blue (male) or pink (female) border
- Avatar: circle with gender-colored ring bg  
- Shadow filter (`ped-shadow`) for subtle card depth
- Light gray background (`#f5f7fa`) — intentionally minimal/clean vs. other dark views

---

### 6.5 3D Isometric View (`init3DTree`)

**Defined in:** `3d-view.js`

**Layout:** Isometric projection of the family tree using pure SVG transforms (no WebGL). Nodes appear as 3D blocks on a tilted grid.

**Algorithm:**
1. Applies CSS `transform: rotateX(45deg) rotateZ(-45deg)` to the SVG group or uses manual isometric coordinate transforms
2. Each person is rendered as a pseudo-3D box
3. The tree hierarchy is maintained — parent blocks are higher up
4. Angle can be changed via "Default / Top / Front" buttons (`setIsoAngle()`)

---

### 6.6 Globe View (`initThreeGlobe`)

**Defined in:** `globe_view.js`

**Renders family members on an interactive 3D globe** using Three.js / Globe.gl.

**Layout:** Each member with geographic coordinates (`coords` field) appears as a pin on the globe. Family connections are drawn as arcs.

**Algorithm:**
1. Creates a Three.js WebGL renderer on the `#tree-container` div
2. Uses Globe.gl library to render Earth (land boundaries, countries)
3. Places person nodes at coordinates using `projection([lng, lat])`
4. Level-of-detail (LOD) system:
   - Scale > 400: state borders appear
   - Scale > 800: rivers appear
   - Scale > 1000: city labels appear
5. Links drawn as `d3.geoPath` geodesic curves between connected members
6. Drag to rotate globe (updates `projection.rotate()`)
7. Scroll/zoom changes `projection.scale()`
8. `autoZoomToFamily()` calculates centroid of all member coords and centers the globe there

---

## 7. Shared UI Components

### 7.1 Modal (Person Details)

Created once in `index.js`, reused across all views.

```
.modal-overlay (fixed, full-screen, blur backdrop)
  └── .modal-content (glassmorphism card)
       ├── .modal-close (× button)
       └── .modal-body (dynamic HTML injection)
            ├── img.modal-image (person photo)
            ├── h2.modal-name
            ├── p.modal-info (relation • age • gender)
            ├── p.modal-location (📍 location)
            └── [only in vertical-tree] button#trace-path-btn
```

**`showModal(d)`** — called from any view on node click:
```javascript
showModal(d)  // d = D3 datum with d.data = { name, photo, relation, ... }
```

Opens with fade-in transition. Closes on × click or clicking backdrop.

---

### 7.2 Trace Path Feature

**Only available in Vertical Tree view.**

When "Trace Path from Me" is clicked inside the modal:

```
1. Clear all .trace-active classes

2. Find "Me" node in currentTreeRoot.descendants()

3. Find target node (the clicked person) in descendants

4. Call meNode.path(targetNode)
   → D3 built-in: returns array of nodes from Me → LCA → Target

5. For each node in path:
   → setTimeout(() => {
       Add .trace-active class
       Pulse circle: r 25 → r 21 (shrink animation)
   }, index × 400ms)

6. For each link in path:
   → setTimeout(() => {
       Add .trace-active class to matching .tree-link[data-link-type='main-tree']
       Animate stroke-width 4 → 6 → 4
   }, i × 400ms + 200ms)
```

Active styles (from CSS):
- Links: `stroke: #FFD700` (gold), `stroke-width: 4px`, drop-shadow
- Nodes: `stroke: #FFD700` on the avatar circle

---

### 7.3 Family Focus Filters

Four buttons in the top bar filter which family members are shown:

| Button | Function |
|--------|---------|
| **My Family** | Full tree: all data via `transformFamilyData()`, re-run `initVerticalTreeV2` |
| **Maternal Side** | `transformApiDataToHierarchy(data, maternalAncestorId)` — focuses on maternal lineage |
| **Wife / External** | `transformApiDataToHierarchy(data, wifeId)` — focuses on wife's family branch |
| **Individual Family** | `transformToIndividualFamily()` — shows only Parents + Siblings + Me + Kids |

Each call:
1. Resets `_personMap = null` (clears the cache if switching focus)
2. Calls the appropriate transform function
3. Updates `familyData` global
4. Calls `switchView(currentView)` to re-render

The **3D view** automatically defaults to Individual Family mode when switched to.

---

## 8. Styling System (`index.css`)

### Design Tokens (CSS Variables)

```css
:root {
  --neon-cyan:    #00f2ea;   /* Primary accent — buttons, borders, traces */
  --neon-purple:  #ff0055;   /* Secondary accent — trace active links */
  --glass-bg:     rgba(255,255,255, 0.05);
  --glass-border: rgba(255,255,255, 0.1);
  --card-bg:      #1a1a2e;
}
```

### Key Style Groups

| Selector | Purpose |
|----------|---------|
| `body` | `overflow: hidden`, black bg, Poppins font |
| `#tree-container` | Full viewport canvas |
| `.modal-overlay` | Fixed fullscreen dim + blur |
| `.modal-content` | Glassmorphism card with gradient |
| `.view-btn` | Semi-transparent navbar pills |
| `.view-btn.active` | Neon cyan fill |
| `.tree-card-bg` | Dark card background with teal border |
| `.tree-card-name` | White bold text |
| `.tree-card-relation` | Muted gray label |
| `.trace-active circle` | Gold border + drop shadow |
| `.trace-active.tree-link` | Gold stroke, wide, drop shadow |
| `.trace-btn` | Gold bordered cta button |
| `.geo-node` | Globe view person pin |

### Animations

| Animation | Usage |
|-----------|-------|
| `@keyframes twinkle` | Globe star nodes pulsing effect |
| `@keyframes heartbeat` | Vertical translateY bounce (used on pins) |

---

## 9. State Management

The app uses simple module-level global variables — no framework, no store:

```javascript
// Data
let familyData;            // D3 hierarchy (nested)
let rawFamilyData;         // Flat array from data.json
let _personMap;            // Internal cache in transform-api-data.js

// View
let currentView;           // 'tree' | 'vertical-tree' | 'fan' | 'pedigree' | 'isometric' | 'globe'
let currentTreeRoot;       // d3.hierarchy root — set in initVerticalTreeV2 for trace

// Fan-specific
let ancestorMode;          // true = parents-only mode
let fanHistory;            // [{id, label}] navigation stack
let currentFanRootId;      // currently displayed center node id

// Globe
let globeData;
let projection, path, ...  // D3 geo globals
```

---

## 10. Event Flow & Interactions

```
User clicks "Fan View" button
        │
        ├── .view-btn click listener (index.js L1516)
        │       ├── Removes 'active' from all buttons
        │       ├── Adds 'active' to clicked button
        │       └── Calls switchView('fan')
        │
        └── switchView('fan')
                ├── Tries closeThreeGlobe() / closeTrue3D() (cleanup)
                ├── Shows D3 svg element
                ├── Shows #fan-controls div (checkbox)
                ├── Hides #iso-controls
                ├── Resets fanHistory = [], currentFanRootId = null
                └── Calls initFan()
```

```
User clicks a person node (any view)
        │
        ├── .on('click', (event, d) => showModal(d))
        │
        └── showModal(d)
                ├── Injects HTML with name, photo, relation, location
                ├── In vertical-tree: also injects "Trace Path" button
                └── Fades modal in (opacity 0→1)
```

```
User clicks "Trace Path from Me"
        │
        ├── Triggers trace logic (see Section 7.2)
        └── Closes modal, then animates path sequentially
```

```
Window resize
        │
        └── Updates width/height globals
            Updates SVG dimensions
            Re-calls current view initializer
```

---

## 11. Key Algorithms

### Slot-Based Layout (Pedigree View)

The pedigree doesn't use D3's `tree()` layout. Instead, it implements a custom 2-pass algorithm:

1. **Bottom-up `countSlots`:** Each leaf = 1 slot. Each parent = sum of children's slots.
2. **Top-down `place`:** Distributes slots top-to-bottom. A parent's Y is the average of its children's Y positions.

This guarantees **equal vertical spacing between all leaf nodes** regardless of tree depth.

### BFS Re-rooting (Fan View)

Standard D3 `hierarchy()` only traverses downward. The Fan View needs to go in all directions (to show parents, aunts, etc). The solution:

1. Build a **bidirectional adjacency list** from the flat data
2. BFS from "Me" outward through all edges
3. Construct a new tree hierarchy centered on "Me" — everyone reachable becomes a "child" in this new tree

### Eldest Ancestor Walking (transform-api-data.js)

```javascript
function findEldestAncestor(person) {
  let current = person;
  while (true) {
    let next = _personMap.get(current.fid) || _personMap.get(current.mid);
    if (!next) break;
    current = next;
  }
  return current;
}
```

Walks up `fid → fid → fid` until a node has no known parent. That node becomes the visual root of the tree views.

### D3 Trace Path (`meNode.path(targetNode)`)

D3's `node.path(other)` finds the path between two nodes in a hierarchy by:
1. Computing ancestors of both nodes
2. Finding the Lowest Common Ancestor (LCA)
3. Returning: Me → ... → LCA → ... → Target

This works correctly even if the two nodes are on different branches (e.g., Me and a cousin share a grandparent as LCA).

---

## 12. Data → View: Complete End-to-End Flow

```
data.json
    │
    │  fetch()
    ▼
rawFamilyData (flat array, kept as-is)
    │
    │  transformFamilyData()
    │    → transformApiDataToHierarchy()
    │       Phase 1: Build _personMap (id → enriched person objects)
    │       Phase 2: Find "Myself", walk up to eldest ancestor
    │       Phase 3: buildSubtree() DFS → nested hierarchy object
    │       cleanTree() → remove raw ID fields
    ▼
familyData (nested hierarchy: { id, name, children: [...] })
    │
    │  initApp() → switchView(currentView)
    │
    ├──────────────── Tree View ─────────────────────────────────────┐
    │  d3.hierarchy(familyData)                                      │
    │  d3.tree().nodeSize([...])                                     │
    │  Draw links (orthogonal elbow paths)                           │
    │  Draw cards (rect + image + text)                              │
    └────────────────────────────────────────────────────────────────┘
    │
    ├──────────────── Vertical Tree ─────────────────────────────────┐
    │  d3.hierarchy(familyData)  [currentTreeRoot = root]            │
    │  d3.tree() with custom separation                              │
    │  Swap x↔y for LR layout                                       │
    │  Draw bracket connectors                                       │
    │  Draw cards (renderVCard, spouse below)                        │
    │  Trace feature enabled                                         │
    └────────────────────────────────────────────────────────────────┘
    │
    ├──────────────── Fan View ──────────────────────────────────────┐
    │  rawFamilyData → bidirectional adjacency list                  │
    │  BFS from "Me" → new tree hierarchy centered on Me            │
    │  d3.hierarchy(newRoot).count()                                 │
    │  Custom angular + radial assignment (eachBefore)               │
    │  d3.arc() → arcs per segment                                   │
    │  Click segment → initFan(newId) [re-root]                     │
    └────────────────────────────────────────────────────────────────┘
    │
    ├──────────────── Pedigree View ─────────────────────────────────┐
    │  rawFamilyData → nodeMap (flat Map)                            │
    │  Find "Myself" → rootPerson                                    │
    │  Pass 1: countSlots(root) [bottom-up leaf count]               │
    │  Pass 2: place(root, cx, 0) [top-down Y assignment]            │
    │  Draw connectors: M → V → Q (rounded bend) → H                │
    │  Draw cards: white rect + gender-colored border/ring           │
    └────────────────────────────────────────────────────────────────┘
    │
    ├──────────────── 3D Isometric ──────────────────────────────────┐
    │  familyData (or individualFamily subset)                       │
    │  SVG isometric transforms (3d-view.js)                         │
    │  Pseudo-3D box nodes                                           │
    │  setIsoAngle() rotates projection                              │
    └────────────────────────────────────────────────────────────────┘
    │
    └──────────────── Globe View ────────────────────────────────────┐
       rawFamilyData → nodes with coords field                       │
       Three.js WebGL renderer + Globe.gl                            │
       d3.geoOrthographic projection                                 │
       Land/state/river/city layers (LOD by zoom level)              │
       Person pins at geographic coordinates                         │
       Geodesic arcs between related members                         │
       Drag to rotate, scroll to zoom                                │
       autoZoomToFamily() centers on family geographic centroid      │
       ────────────────────────────────────────────────────────────────
```

---

*Documentation generated for the `family-tree-renders` project.*
*All view initializers are functions within `index.js` (or separate view files), called by `switchView()`.*
