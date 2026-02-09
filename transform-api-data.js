/**
 * Transform flat API response into hierarchical family tree structure
 *
 * Supports:
 * - Ancestor-based trees
 * - Dynamic focus switching (maternal / spouse / external)
 * - No virtual root
 * - No duplicates
 */

let _personMap = null;   // internal graph cache

function transformApiDataToHierarchy(apiResponse, focusId = null) {
    const apiData = apiResponse.data || apiResponse;
    if (!Array.isArray(apiData)) return null;

    // Build graph only once
    if (!_personMap) {
        _personMap = new Map();

        // 1️⃣ Create person nodes
        apiData.forEach(p => {
            const id = String(p.id);
            _personMap.set(id, {
                id,
                name: p.name,
                gender: p.gender,
                dob: p.dob,
                age: calculateAge(p.dob),
                photo: p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`,
                relation: p.relation || "Family Member",
                isMe: p.relation === "Myself",
                fid: p.fid ? String(p.fid) : null,
                mid: p.mid ? String(p.mid) : null,
                pids: (p.pids || []).map(String),
                coords: p.coords,
                location: p.location,
                children: []
            });
        });

        // 2️⃣ Parent → child linking (TREE safe)
        const attached = new Set();

        _personMap.forEach(person => {
            let parent = null;

            if (person.fid && _personMap.has(person.fid)) {
                parent = _personMap.get(person.fid);
            } else if (person.mid && _personMap.has(person.mid)) {
                parent = _personMap.get(person.mid);
            }

            if (parent) {
                const key = `${parent.id}-${person.id}`;
                if (!attached.has(key)) {
                    parent.children.push(person);
                    attached.add(key);
                }
            }
        });

        // 3️⃣ Attach spouse info (visual only)
        _personMap.forEach(person => {
            if (person.pids.length) {
                const sid = person.pids[0];
                if (_personMap.has(sid)) {
                    const s = _personMap.get(sid);
                    person.spouse = {
                        id: s.id,
                        name: s.name,
                        gender: s.gender,
                        age: s.age,
                        photo: s.photo,
                        relation: s.relation || "Spouse"
                    };
                }
            }
        });
    }

    // 4️⃣ Determine focus person
    let focusPerson = null;

    if (focusId && _personMap.has(String(focusId))) {
        focusPerson = _personMap.get(String(focusId));
    } else {
        focusPerson = [..._personMap.values()].find(p => p.isMe);
    }

    if (!focusPerson) {
        console.error("Focus person not found");
        return null;
    }

    // 5️⃣ Find eldest ancestor for this focus
    function findEldestAncestor(person) {
        let current = person;
        while (true) {
            let next = null;
            if (current.fid && _personMap.has(current.fid)) {
                next = _personMap.get(current.fid);
            } else if (current.mid && _personMap.has(current.mid)) {
                next = _personMap.get(current.mid);
            }
            if (!next) break;
            current = next;
        }
        return current;
    }

    const ancestorRoot = findEldestAncestor(focusPerson);

    // 6️⃣ Build focused subtree (DFS)
    function buildSubtree(node, visited = new Set()) {
        if (visited.has(node.id)) return null;
        visited.add(node.id);

        return {
            ...node,
            children: node.children
                .map(c => buildSubtree(c, visited))
                .filter(Boolean)
        };
    }

    return cleanTree(buildSubtree(ancestorRoot));
}

/**
 * Clean tree for D3
 */
function cleanTree(node, seen = new Set()) {
    if (!node || seen.has(node.id)) return null;
    seen.add(node.id);

    node.children = node.children
        .map(c => cleanTree(c, seen))
        .filter(Boolean);

    delete node.fid;
    delete node.mid;
    delete node.pids;

    return node;
}

/**
 * Calculate age from DOB
 */
function calculateAge(dob) {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age > 0 ? age : 0;
}

/**
 * Detect API format
 */
function isApiFormat(data) {
    if (data?.data && Array.isArray(data.data)) {
        return data.data.length && ("mid" in data.data[0] || "fid" in data.data[0]);
    }
    if (Array.isArray(data)) {
        return data.length && ("mid" in data[0] || "fid" in data[0]);
    }
    return false;
}

/**
 * Main transformer
 */
function transformFamilyData(data, focusId = null) {
    if (isApiFormat(data)) {
        return transformApiDataToHierarchy(data, focusId);
    }
    return data;
}
