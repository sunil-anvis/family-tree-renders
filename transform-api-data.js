/**
 * Transform flat API response into hierarchical family tree structure
 *
 * This file handles the conversion of flat data (list of people) into a nested tree structure
 * suitable for D3.js or other hierarchy visualizers.
 *
 * MAIN STEPS:
 * 1. Ingest Data: Convert array -> Map for quick lookup
 * 2. Link Nodes: Connect parents to children (fid/mid -> children)
 * 3. Enhance: Add spouse info
 * 4. Focus: Determine who to center the tree around
 * 5. Root: Find the top-most ancestor of the focus person
 * 6. Build: Recursively create the nested tree object
 */

// Global cache to store processed people nodes. 
// NOTE: This prevents rebuilding the graph if called multiple times.
let _personMap = null;

/**
 * Main Transformation Function
 * @param {Object} apiResponse - The raw data from API
 * @param {string|null} focusId - The ID of the person to focus the tree on (optional)
 * @returns {Object|null} - The root of the hierarchical tree
 */
function transformApiDataToHierarchy(apiResponse, focusId = null) {
    const apiData = apiResponse.data || apiResponse;
    if (!Array.isArray(apiData)) return null;

    // ---------------------------------------------------------
    // PHASE 1: Build the Graph (Nodes & Edges)
    // We only do this once and cache it in _personMap
    // ---------------------------------------------------------
    if (!_personMap) {
        _personMap = new Map();

        // 1️⃣ Create person nodes (The "Mode" / Node creation)
        // We iterate through the raw list and create a clean object for each person.
        apiData.forEach(p => {
            const id = String(p.id);
            _personMap.set(id, {
                id,
                name: p.name,
                gender: p.gender,
                dob: p.dob,
                age: calculateAge(p.dob),
                // Generate avatar if missing
                photo: p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`,
                relation: p.relation || "Family Member",
                isMe: p.relation === "Myself",
                fid: p.fid ? String(p.fid) : null, // Father ID
                mid: p.mid ? String(p.mid) : null, // Mother ID
                pids: (p.pids || []).map(String),  // Partner IDs
                coords: p.coords,
                location: p.location,
                children: [] // Initialize empty children array
            });
        });

        // 2️⃣ Parent → Child Linking
        // Iterate again to link children to their parents.
        // This builds the parent-child relationships in the graph.
        const attached = new Set();

        _personMap.forEach(person => {
            let parent = null;

            // Priority: Link to Father first, then Mother
            if (person.fid && _personMap.has(person.fid)) {
                parent = _personMap.get(person.fid);
            } else if (person.mid && _personMap.has(person.mid)) {
                parent = _personMap.get(person.mid);
            }

            // If a parent is found, add this person to the parent's children list
            if (parent) {
                const key = `${parent.id}-${person.id}`;
                // Avoid duplicate links
                if (!attached.has(key)) {
                    parent.children.push(person);
                    attached.add(key);
                }
            }
        });

        // 3️⃣ Attach Spouse Info
        // Enhance person nodes with spouse details for display purposes.
        _personMap.forEach(person => {
            if (person.pids.length) {
                const sid = person.pids[0]; // Take the first spouse
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

    // ---------------------------------------------------------
    // PHASE 2: Select Focus & Root
    // Determine where to start building the tree from.
    // ---------------------------------------------------------

    // 4️⃣ Determine focus person
    // If a focusId is provided, use it. Otherwise, look for "Me" (isMe === true).
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

    // 5️⃣ Find Eldest Ancestor
    // Walk up the tree from the focus person to find the root.
    // This allows us to show the full lineage.
    function findEldestAncestor(person) {
        let current = person;
        while (true) {
            let next = null;
            // Check Father then Mother
            if (current.fid && _personMap.has(current.fid)) {
                next = _personMap.get(current.fid);
            } else if (current.mid && _personMap.has(current.mid)) {
                next = _personMap.get(current.mid);
            }
            if (!next) break; // No more parents, current is the root
            current = next;
        }
        return current;
    }

    const ancestorRoot = findEldestAncestor(focusPerson);

    // ---------------------------------------------------------
    // PHASE 3: Build & Clean Tree
    // Create the recursive structure for the visualizer.
    // ---------------------------------------------------------

    // 6️⃣ Build focused subtree (DFS)
    // Recursively build the tree structure starting from the ancestor.
    function buildSubtree(node, visited = new Set()) {
        if (visited.has(node.id)) return null; // Prevent infinite loops
        visited.add(node.id);

        return {
            ...node,
            children: node.children
                .map(c => buildSubtree(c, visited))
                .filter(Boolean) // Remove nulls
        };
    }

    // 7️⃣ Final Cleanup
    // Build the tree and remove temporary fields (ids, circular references)
    return cleanTree(buildSubtree(ancestorRoot));
}

/**
 * Helper: Clean tree for D3 consumption
 * Removes 'fid', 'mid', 'pids' to avoid circular JSON issues if necessary,
 * and recursively cleans children.
 */
function cleanTree(node, seen = new Set()) {
    if (!node || seen.has(node.id)) return null;
    seen.add(node.id);

    node.children = node.children
        .map(c => cleanTree(c, seen))
        .filter(Boolean);

    // Remove raw relational IDs as they are now structural
    delete node.fid;
    delete node.mid;
    delete node.pids;

    return node;
}

/**
 * Helper: Calculate age from DOB
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
 * Helper: Detect API format
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
 * Entry Point: Main transformer function
 */
function transformFamilyData(data, focusId = null) {
    if (isApiFormat(data)) {
        return transformApiDataToHierarchy(data, focusId);
    }
    return data;
}

/**
 * Filtered Transformation: Individual Family View
 * "Individual Family" = Root (Me) + Parents + Siblings + Wife + Kids
 * 
 * Logic:
 * 1. Find Me (Focus)
 * 2. Find Parents (Ancestor Root for this view)
 * 3. Construct Tree: Parent -> [Siblings, Me -> [Kids]]
 */
function transformToIndividualFamily(apiResponse, focusId = null) {
    const apiData = apiResponse.data || apiResponse;
    if (!Array.isArray(apiData)) return null;

    // 1. Ensure Map is Built (Reuse logic or rebuild)
    // We force a rebuild/check by calling the internal builder if map is empty
    // But since _personMap is global, we can check it. 
    // If null, we run the standard transform first to populate it.
    if (!_personMap) {
        transformApiDataToHierarchy(apiResponse);
    }

    // 2. Identify Focus Person
    let focusPerson = null;
    if (focusId && _personMap.has(String(focusId))) {
        focusPerson = _personMap.get(String(focusId));
    } else {
        focusPerson = [..._personMap.values()].find(p => p.isMe);
    }
    if (!focusPerson) return null;

    // 3. Identify Root of this specific view (The Father/Mother)
    // If no parents, the Focus Person is the root.
    let viewRoot = null;
    if (focusPerson.fid && _personMap.has(focusPerson.fid)) {
        viewRoot = _personMap.get(focusPerson.fid);
    } else if (focusPerson.mid && _personMap.has(focusPerson.mid)) {
        viewRoot = _personMap.get(focusPerson.mid);
    } else {
        viewRoot = focusPerson;
    }

    // 4. Construct the Filtered Tree (Clone nodes to avoid breaking global cache)
    // Helper to shallow clone and reset children
    const clone = (n) => ({ ...n, children: [] });

    const newRoot = clone(viewRoot);

    // If Root is Parent, add all their children (Siblings + Me)
    // We need to look up the ORIGINAL children from the map to get siblings
    // The _personMap nodes already have 'children' array populated by Phase 1 of standard transform.
    // So we iterate viewRoot.children

    // Check if viewRoot is actually the Parent (not Me)
    if (viewRoot.id !== focusPerson.id) {
        // We are at Parent Level
        // Add Spouse (Mother) - already in 'spouse' property from standard transform? 
        // Yes, Phase 1 step 3 attaches spouse. We just cloned it, so newRoot.spouse exists.

        if (viewRoot.children && viewRoot.children.length) {
            viewRoot.children.forEach(child => {
                // This child is either Me or a Sibling
                const newChild = clone(child);

                if (child.id === focusPerson.id) {
                    // It's ME!
                    // Add My Spouse (Keep existing spouse prop)
                    // Add My Children
                    if (child.children && child.children.length) {
                        child.children.forEach(grandChild => {
                            newChild.children.push(clone(grandChild));
                        });
                    }
                } else {
                    // It's a Sibling
                    // "Thats it" -> No children for siblings.
                    // Also maybe no spouse? User said "siblings, wife and kids". Wife of Root (Me). 
                    // So we probably strip spouse from siblings to be strict?
                    // "siblings" usually implies just the person.
                    // Let's keep it simple: Delete spouse from sibling clone if we want to be strict.
                    // Use 'delete newChild.spouse' if needed. 
                    // For now, I'll leave spouse if it exists, as it explains the sibling better, 
                    // but definitely NO children.
                }

                newRoot.children.push(newChild);
            });
        }
    } else {
        // Me is Root (No Parents found)
        // Just add My Children
        if (viewRoot.children && viewRoot.children.length) {
            viewRoot.children.forEach(child => {
                newRoot.children.push(clone(child));
            });
        }
    }

    return cleanTree(newRoot, new Set()); // Clean up ids/circular refs usually, but our clones are fresh. 
    // cleanTree removes 'fid', 'mid', 'pids'. Useful for D3.
}
