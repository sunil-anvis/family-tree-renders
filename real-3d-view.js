// ─── State ────────────────────────────────────────────────────────────────────
let scene, camera, renderer, controls;
let nodes3D = [];
let links3D = [];
let frameId;

// Navigation history (like fan view)
let real3dHistory = [];         // stack of focusIds
let real3dCurrentFocusId = null; // null = "Me" / full tree

// Drag-detection helpers
let _mouseDownX = 0, _mouseDownY = 0;

// Held-key state
const keysPressed = {};

// ─── Init ─────────────────────────────────────────────────────────────────────
function initReal3DView(focusId) {
    const container = document.getElementById('tree-container');
    if (!container) return;

    if (typeof THREE === 'undefined') {
        console.error('[Real3D] Three.js not loaded!');
        return;
    }

    // Cleanup old instance
    closeTrue3D();

    // Hide D3 SVG
    const svgEl = document.querySelector('#tree-container svg');
    if (svgEl) svgEl.style.display = 'none';

    // Pick the right data slice
    real3dCurrentFocusId = focusId || null;

    let activeData = familyData;
    if (focusId && typeof transformToIndividualFamilyTree === 'function') {
        const filtered = transformToIndividualFamilyTree(rawFamilyData, focusId);
        if (filtered) activeData = filtered;
    }

    if (!activeData) { console.error('[Real3D] No familyData'); return; }

    // ── Scene ─────────────────────────────────────────────────────────────────
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020a10);
    scene.fog = new THREE.FogExp2(0x020a10, 0.0008);

    const W = window.innerWidth, H = window.innerHeight;

    // ── Camera ────────────────────────────────────────────────────────────────
    camera = new THREE.PerspectiveCamera(60, W / H, 1, 10000);
    camera.position.set(0, 500, 1000);

    // ── Renderer ──────────────────────────────────────────────────────────────
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // ── OrbitControls ─────────────────────────────────────────────────────────
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.05;
    controls.minDistance    = 10;
    controls.maxDistance    = Infinity;

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(500, 1000, 500);
    scene.add(sun);
    const fill = new THREE.PointLight(0x00f2ea, 1, 1000);
    fill.position.set(0, 0, 0);
    scene.add(fill);

    // ── Stars ─────────────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(9000);
    for (let i = 0; i < 9000; i++) starPos[i] = (Math.random() - 0.5) * 4000;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2 })));

    // ── Build hierarchy ───────────────────────────────────────────────────────
    const root = d3.hierarchy(activeData);
    d3.tree().nodeSize([500, 600])(root); // Increased center-to-center spacing

    const texLoader  = new THREE.TextureLoader();
    const defaultPic = 'https://ui-avatars.com/api/?background=00f2ea&color=fff&name=?';

    root.descendants().forEach(d => {
        const x = d.x;
        const z = d.y * 1.5 - 500;
        const y = -d.depth * 250 + 400;

        // Main node group
        const nodeGrp = new THREE.Group();
        nodeGrp.position.set(x, y, z);
        scene.add(nodeGrp);

        const texLoader  = new THREE.TextureLoader();
        const defaultPic = 'https://ui-avatars.com/api/?background=00f2ea&color=fff&name=?';

        // Helper to render a person node
        const renderPerson = (person, offsetX) => {
            const pGrp = new THREE.Group();
            pGrp.position.x = offsetX;
            nodeGrp.add(pGrp);

            // Highlighting: Use gold for 'Me' OR the person we are currently focusing on
            const isFocalPerson = !!person.isMe || (real3dCurrentFocusId && String(person.id) === String(real3dCurrentFocusId));
            
            const genderColor = person.gender === 'f' ? 0xff69b4 : 0x00f2ea;
            const sphereMat = new THREE.MeshPhongMaterial({
                color:   isFocalPerson ? 0xffd700 : genderColor,
                emissive: isFocalPerson ? 0x221100 : 0x002222,
                shininess: 90
            });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(35, 32, 32), sphereMat);
            sphere.userData = person;
            pGrp.add(sphere);
            nodes3D.push(sphere);

            // Photo
            const photoUrl = person.photo || defaultPic;
            texLoader.load(photoUrl, tex => {
                const plane = new THREE.Mesh(
                    new THREE.CircleGeometry(30, 32),
                    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
                );
                plane.position.z = 36;
                pGrp.add(plane);
            });

            // Name
            pGrp.add(createTextSprite(person.name || '?', 28, isFocalPerson ? '#ffd700' : '#ffffff', 0, 60));

            // Relation
            if (person.relation) {
                pGrp.add(createTextSprite(person.relation, 20, '#aaaaaa', 0, -60));
            }
        };

        if (d.data.spouse) {
            renderPerson(d.data, -70);
            renderPerson(d.data.spouse, 70);
            // Spouse connection line (Marriage line)
            const curve = new THREE.LineCurve3(new THREE.Vector3(-70, 0, 0), new THREE.Vector3(70, 0, 0));
            const tube = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 1, 3, 8, false),
                new THREE.MeshPhongMaterial({ color: 0x444444, transparent: true, opacity: 0.5 })
            );
            nodeGrp.add(tube);

            // Vertical stem downwards to the point where children's branch starts
            // Only show if there are actual children to connect to
            if (d.children && d.children.length > 0) {
                const stemCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -50, 0));
                const stem = new THREE.Mesh(
                    new THREE.TubeGeometry(stemCurve, 1, 2, 8, false),
                    new THREE.MeshPhongMaterial({ color: 0x00f2ea, transparent: true, opacity: 0.4 })
                );
                nodeGrp.add(stem);
            }
        } else {
            renderPerson(d.data, 0);
            
            // Also add stem for single parents if they have children
            if (d.children && d.children.length > 0) {
                const stemCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -50, 0));
                const stem = new THREE.Mesh(
                    new THREE.TubeGeometry(stemCurve, 1, 2, 8, false),
                    new THREE.MeshPhongMaterial({ color: 0x00f2ea, transparent: true, opacity: 0.4 })
                );
                nodeGrp.add(stem);
            }
        }

        // Parent connection
        if (d.parent) {
            const px = d.parent.x;
            const pz = d.parent.y * 1.5 - 500;
            const py = -d.parent.depth * 250 + 400;

            // Target: The child's person node (not the midpoint of child+spouse)
            const childAtX = d.data.spouse ? x - 70 : x;
            const childPos = new THREE.Vector3(childAtX, y, z);

            // Source: Midpoint between parents, offset slightly down by the stem height if a stem exists
            const parentHasChildren = d.parent.children && d.parent.children.length > 0;
            const parentAtY = parentHasChildren ? py - 50 : py;
            const parentPos = new THREE.Vector3(px, parentAtY, pz);

            draw3DConnection(childPos, parentPos);
        }
    });

    // ── Initial camera: focus on Focal Person ────────────────────────────────
    // Prioritize the requested focusId, then "Me", then the tree root
    const focalNode = root.descendants().find(d => 
        (real3dCurrentFocusId && String(d.data.id) === String(real3dCurrentFocusId)) || 
        (!real3dCurrentFocusId && d.data.isMe)
    ) || root;

    const mx = focalNode.x;
    const mz = focalNode.y * 1.5 - 500;
    const my = -focalNode.depth * 250 + 400;

    // Position camera to look at the focal point from a nice angle
    camera.position.set(mx, my + 300, mz + 1000);
    controls.target.set(mx, my, mz);
    controls.update();

    // ── Events ────────────────────────────────────────────────────────────────
    renderer.domElement.addEventListener('mousedown', _onMouseDown, false);
    renderer.domElement.addEventListener('mouseup',   _onMouseUp,   false);
    window.addEventListener('resize', onWindowResize, false);

    // Update Back button state
    _updateReal3DNavButtons();

    animate();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function draw3DConnection(v1, v2) {
    const mid = (v1.y + v2.y) / 2;
    const curve = new THREE.CatmullRomCurve3([
        v1,
        new THREE.Vector3(v1.x, mid, v1.z),
        new THREE.Vector3(v2.x, mid, v2.z),
        v2
    ]);
    const geo  = new THREE.TubeGeometry(curve, 20, 2, 8, false);
    const mat  = new THREE.MeshPhongMaterial({ color: 0x00f2ea, transparent: true, opacity: 0.5, emissive: 0x004444 });
    const tube = new THREE.Mesh(geo, mat);
    scene.add(tube);
    links3D.push(tube);
}

function createTextSprite(text, fontSize, color, offsetX, offsetY) {
    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font         = `Bold ${fontSize}px Poppins, Arial`;
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    sprite.scale.set(200, 50, 1);
    sprite.position.set(offsetX || 0, offsetY || 0, 0);
    return sprite;
}

// ─── Animation loop ───────────────────────────────────────────────────────────
function animate() {
    frameId = requestAnimationFrame(animate);
    applyKeyboardPan();
    controls.update();

    // Gentle pulse
    const t = Date.now() * 0.002;
    nodes3D.forEach((n, i) => { const s = 1 + Math.sin(t + i) * 0.05; n.scale.set(s, s, s); });

    renderer.render(scene, camera);
}

// ─── Click detection (drag-safe) ──────────────────────────────────────────────
function _onMouseDown(e) { _mouseDownX = e.clientX; _mouseDownY = e.clientY; }

function _onMouseUp(e) {
    const dx = e.clientX - _mouseDownX;
    const dy = e.clientY - _mouseDownY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return; // it was a drag, not a click

    // Raycast
    const nx = (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hits = ray.intersectObjects(nodes3D);
    if (hits.length > 0) {
        // Use the app's member-options modal (same as fan/sidebar)
        if (typeof showMemberOptionsModal === 'function') {
            showMemberOptionsModal(hits[0].object.userData);
        }
    }
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function closeTrue3D() {
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    if (renderer) {
        renderer.domElement.removeEventListener('mousedown', _onMouseDown);
        renderer.domElement.removeEventListener('mouseup',   _onMouseUp);
        window.removeEventListener('resize', onWindowResize);
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        renderer.dispose();
        renderer = null;
    }
    if (scene) {
        scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
            }
        });
        scene = null;
    }
    camera = controls = null;
    nodes3D = []; links3D = [];
}

// ─── Navigation: Back & Reset ─────────────────────────────────────────────────
window.backReal3D = function () {
    if (real3dHistory.length === 0) return;
    const prevId = real3dHistory.pop();
    initReal3DView(prevId || undefined);
};

window.resetReal3D = function () {
    real3dHistory = [];
    real3dCurrentFocusId = null;
    initReal3DView();
};

// Called by the "View Their Tree" button (index.js view-tree-btn)
window.focusReal3DOnMember = function (memberId) {
    if (real3dCurrentFocusId !== null) real3dHistory.push(real3dCurrentFocusId);
    else real3dHistory.push(undefined);
    initReal3DView(memberId);
};

function _updateReal3DNavButtons() {
    const btns = document.querySelectorAll('.real3d-back-btn');
    btns.forEach(b => { b.disabled = real3dHistory.length === 0; });
}

// ─── Globals ──────────────────────────────────────────────────────────────────
window.closeTrue3D    = closeTrue3D;
window.initReal3DView = initReal3DView;

// ─── Smooth keyboard pan ──────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
    if (['+', '=', '-', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        keysPressed[e.key] = true;
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => { keysPressed[e.key] = false; });

function applyKeyboardPan() {
    if (!controls || !camera) return;
    const speed = 6, zoomSpeed = 10;
    const fwd   = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const up    = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();

    const mv = (v, s) => { camera.position.addScaledVector(v, s); controls.target.addScaledVector(v, s); };

    if (keysPressed['ArrowLeft'])           mv(right, -speed);
    if (keysPressed['ArrowRight'])          mv(right,  speed);
    if (keysPressed['ArrowUp'])             mv(up,     speed);
    if (keysPressed['ArrowDown'])           mv(up,    -speed);
    if (keysPressed['+'] || keysPressed['=']) mv(fwd,  zoomSpeed);
    if (keysPressed['-'])                   mv(fwd,  -zoomSpeed);
}

// ─── Button pan (on-screen controls) ─────────────────────────────────────────
window.moveReal3D = function (dir) {
    if (!controls || !camera) return;
    const amt  = 200;
    const fwd  = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const up   = new THREE.Vector3(0, 1, 0);
    const right= new THREE.Vector3().crossVectors(fwd, up).normalize();
    const mv   = (v, s) => { camera.position.addScaledVector(v, s); controls.target.addScaledVector(v, s); };

    if (dir === 'left')    mv(right, -amt);
    if (dir === 'right')   mv(right,  amt);
    if (dir === 'up')      mv(up,     amt);
    if (dir === 'down')    mv(up,    -amt);
    if (dir === 'zoomIn')  mv(fwd,   amt);
    if (dir === 'zoomOut') mv(fwd,  -amt);
    controls.update();
};
