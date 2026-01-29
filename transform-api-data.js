/**
 * Transform flat API response into hierarchical family tree structure
 * 
 * API Format:
 * - Flat array of family members
 * - Relationships defined by: mid (mother ID), fid (father ID), pids (partner IDs array)
 * 
 * Output Format:
 * - Hierarchical structure with nested children arrays
 * - Spouse objects embedded in person objects
 */

function transformApiDataToHierarchy(apiResponse) {
    // Extract data array from API response
    const apiData = apiResponse.data || apiResponse;

    if (!Array.isArray(apiData)) {
        console.error("Invalid API response format");
        return null;
    }

    // Step 1: Create lookup map
    const personMap = new Map();

    apiData.forEach(person => {
        personMap.set(person.id, {
            id: person.id.toString(),
            name: person.name,
            gender: person.gender === 'm' ? 'Male' : person.gender === 'f' ? 'Female' : 'Other',
            age: calculateAge(person.dob),
            dob: person.dob,
            photo: person.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`,
            relation: person.relation || 'Family Member',
            location: 'Unknown', // API doesn't provide location
            coords: [0, 0], // Will be set based on location or default
            isMe: person.relation === 'Myself',
            mid: person.mid,
            fid: person.fid,
            pids: person.pids || [],
            children: []
        });
    });

    // Step 2: Find root person (the one with relation "Myself")
    let rootPerson = null;
    for (const [id, person] of personMap) {
        if (person.isMe) {
            rootPerson = person;
            break;
        }
    }

    if (!rootPerson) {
        console.error("Could not find root person (Myself)");
        return null;
    }

    // Step 3: Build parent-child relationships
    // For each person, if they have parents (mid/fid), add them as children of those parents
    const processedParents = new Set();

    for (const [id, person] of personMap) {
        // Skip if this person is the root (Wait, no, we want to process root too if they have parents in the tree)
        // Actually, logic below handles linking person to their parents.

        // If person has a father, add person as child of father
        if (person.fid && personMap.has(person.fid)) {
            const father = personMap.get(person.fid);
            if (!father.children.some(c => c.id === person.id)) {
                father.children.push(person);
            }
        }

        // If person has a mother but no father, add as child of mother
        if (person.mid && !person.fid && personMap.has(person.mid)) {
            const mother = personMap.get(person.mid);
            if (!mother.children.some(c => c.id === person.id)) {
                mother.children.push(person);
            }
        }
    }

    // Step 4: Handle spouse relationships
    for (const [id, person] of personMap) {
        if (person.pids && person.pids.length > 0) {
            // Get first partner (spouse)
            const spouseId = person.pids[0];
            if (personMap.has(spouseId)) {
                const spouse = personMap.get(spouseId);

                // Create spouse object (shallow copy to avoid circular references)
                person.spouse = {
                    id: spouse.id,
                    name: spouse.name,
                    age: spouse.age,
                    gender: spouse.gender,
                    location: spouse.location,
                    photo: spouse.photo,
                    relation: spouse.relation
                };

                // If spouse has parents, add them to spouse object
                if (spouse.mid || spouse.fid) {
                    person.spouse.parents = [];

                    if (spouse.fid && personMap.has(spouse.fid)) {
                        const spouseFather = personMap.get(spouse.fid);
                        // Avoid adding if they are already in the tree (e.g., Uncle/Cousin)
                        const isExistingRelative = ['Uncle', 'Aunt', 'Cousin', 'Brother', 'Sister', 'Grandfather', 'Grandmother'].some(r => spouseFather.relation && spouseFather.relation.includes(r));

                        if (!isExistingRelative) {
                            person.spouse.parents.push({
                                id: spouseFather.id,
                                name: spouseFather.name,
                                age: spouseFather.age,
                                gender: spouseFather.gender,
                                photo: spouseFather.photo,
                                relation: 'Father-in-law'
                            });
                        }
                    }

                    if (spouse.mid && personMap.has(spouse.mid)) {
                        const spouseMother = personMap.get(spouse.mid);
                        const isExistingRelative = ['Uncle', 'Aunt', 'Cousin', 'Brother', 'Sister', 'Grandfather', 'Grandmother'].some(r => spouseMother.relation && spouseMother.relation.includes(r));

                        if (!isExistingRelative) {
                            person.spouse.parents.push({
                                id: spouseMother.id,
                                name: spouseMother.name,
                                age: spouseMother.age,
                                gender: spouseMother.gender,
                                photo: spouseMother.photo,
                                relation: 'Mother-in-law'
                            });
                        }
                    }
                }
            }
        }
    }

    // Step 5: Build the hierarchy starting from root
    // We need to restructure so that the tree flows from ancestors down
    // The API gives us: root (Me) with parents above
    // We need to invert this for the visualization

    // Find the oldest ancestor by traversing up from Me
    let oldestAncestor = rootPerson;

    // Helper to find parent in map
    const findParent = (person, type) => {
        const parentId = type === 'fid' ? person.fid : person.mid;
        if (parentId && personMap.has(parentId)) {
            return personMap.get(parentId);
        }
        return null;
    };

    // Traverse up to find the absolute root (e.g., Grandfather)
    // We prioritize Father's line, then Mother's line
    let current = rootPerson;
    while (true) {
        const father = findParent(current, 'fid');
        const mother = findParent(current, 'mid');

        if (father) {
            current = father;
        } else if (mother) {
            current = mother;
        } else {
            // No more parents found
            break;
        }
    }
    oldestAncestor = current;

    // Clean up temporary fields
    function cleanPerson(person) {
        const cleaned = { ...person };
        delete cleaned.mid;
        delete cleaned.fid;
        delete cleaned.pids;

        // Recursively clean children
        if (cleaned.children && cleaned.children.length > 0) {
            cleaned.children = cleaned.children.map(cleanPerson);
        }

        return cleaned;
    }

    // Return cleaned oldest ancestor (Root of the entire family tree)
    return cleanPerson(oldestAncestor);
}

/**
 * Calculate age from date of birth
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
 * Detect if data is in API format (flat array) or old format (hierarchical)
 */
function isApiFormat(data) {
    // API format has a 'data' array or is an array itself with 'mid', 'fid' fields
    if (data.data && Array.isArray(data.data)) {
        return data.data.length > 0 && ('mid' in data.data[0] || 'fid' in data.data[0]);
    }

    if (Array.isArray(data)) {
        return data.length > 0 && ('mid' in data[0] || 'fid' in data[0]);
    }

    return false;
}

/**
 * Main transformation function - handles both formats
 */
function transformFamilyData(data) {
    if (isApiFormat(data)) {
        console.log("Detected API format - transforming to hierarchical structure");
        return transformApiDataToHierarchy(data);
    } else {
        console.log("Detected hierarchical format - using as-is");
        return data;
    }
}
