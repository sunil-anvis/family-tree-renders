const initialFamilyData = {
    "id": "root",
    "node_style": "circle",
    "name": "Rajesh Gupta",
    "age": 78,
    "gender": "Male",
    "location": "Mumbai, India",
    "coords": [72.8777, 19.0760],
    "photo": "https://ui-avatars.com/api/?name=Rajesh+Gupta&background=0D8ABC&color=fff",
    "relation": "Grandfather",
    "spouse": {
        "name": "Sunita Gupta",
        "age": 76,
        "gender": "Female",
        "location": "Mumbai, India",
        "photo": "https://ui-avatars.com/api/?name=Sunita+Gupta&background=FF69B4&color=fff",
        "relation": "Grandmother"
    },
    "children": [
        {
            "id": "f1",
            "name": "Amit Gupta",
            "spouse": {
                "id": "m1",
                "name": "Priya Gupta",
                "age": 48,
                "gender": "Female",
                "location": "Mumbai, India",
                "photo": "https://ui-avatars.com/api/?name=Priya+Gupta&background=FF69B4&color=fff",
                "relation": "Mother",
                "parents": [
                    {
                        "id": "mg1",
                        "name": "Vikram Sharma",
                        "age": 75,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=Vikram+Sharma&background=random",
                        "relation": "Maternal Grandfather"
                    },
                    {
                        "id": "mg2",
                        "name": "Anjali Sharma",
                        "age": 70,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Anjali+Sharma&background=random",
                        "relation": "Maternal Grandmother"
                    }
                ]
            },
            "age": 50,
            "gender": "Male",
            "location": "Mumbai, India",
            "coords": [72.8777, 19.0760],
            "photo": "https://ui-avatars.com/api/?name=Amit+Gupta&background=0D8ABC&color=fff",
            "relation": "Father",
            "children": [
                {
                    "id": "c1",
                    "name": "Rohan Gupta",
                    "isMe": true,
                    "age": 25,
                    "gender": "Male",
                    "location": "Mumbai, India",
                    "coords": [72.9, 19.1],
                    "photo": "https://ui-avatars.com/api/?name=Rohan+Gupta&background=0D8ABC&color=fff",
                    "relation": "Me"
                },
                {
                    "id": "c2",
                    "name": "Rahul Gupta",
                    "spouse": {
                        "id": "c2s",
                        "name": "Emily Gupta",
                        "age": 21,
                        "gender": "Female",
                        "location": "London, UK",
                        "photo": "https://ui-avatars.com/api/?name=Emily+Gupta&background=FF69B4&color=fff",
                        "relation": "Sister-in-Law"
                    },
                    "age": 22,
                    "gender": "Male",
                    "location": "London, UK",
                    "coords": [-0.1276, 51.5074],
                    "photo": "https://ui-avatars.com/api/?name=Rahul+Gupta&background=random",
                    "relation": "Brother",
                    "children": [
                        {
                            "id": "n2",
                            "name": "Arjun Gupta",
                            "age": 1,
                            "gender": "Male",
                            "location": "London, UK",
                            "coords": [-0.1, 51.5],
                            "photo": "https://ui-avatars.com/api/?name=Arjun+Gupta&background=random",
                            "relation": "Nephew"
                        }
                    ]
                },
                {
                    "id": "c3",
                    "name": "Sneha Khan",
                    "spouse": {
                        "id": "c3s",
                        "name": "Zaid Khan",
                        "age": 20,
                        "gender": "Male",
                        "location": "Dubai, UAE",
                        "photo": "https://ui-avatars.com/api/?name=Zaid+Khan&background=random",
                        "relation": "Brother-in-Law"
                    },
                    "age": 19,
                    "gender": "Female",
                    "location": "Dubai, UAE",
                    "coords": [55.2708, 25.2048],
                    "photo": "https://ui-avatars.com/api/?name=Sneha+Khan&background=FF69B4&color=fff",
                    "relation": "Sister",
                    "children": [
                        {
                            "id": "ni1",
                            "name": "Alya Khan",
                            "age": 1,
                            "gender": "Female",
                            "location": "Dubai, UAE",
                            "coords": [55.3, 25.2],
                            "photo": "https://ui-avatars.com/api/?name=Alya+Khan&background=random",
                            "relation": "Niece"
                        }
                    ]
                }
            ]
        },
        {
            "id": "u1",
            "name": "Suresh Gupta",
            "spouse": {
                "id": "ua1",
                "name": "Linda Gupta",
                "age": 45,
                "gender": "Female",
                "location": "New York, USA",
                "photo": "https://ui-avatars.com/api/?name=Linda+Gupta&background=FF69B4&color=fff",
                "relation": "Aunt",
                "parents": [
                    {
                        "id": "ap1",
                        "name": "John Smith",
                        "age": 70,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=John+Smith&background=random",
                        "relation": "Linda's Father"
                    },
                    {
                        "id": "ap2",
                        "name": "Mary Smith",
                        "age": 68,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Mary+Smith&background=random",
                        "relation": "Linda's Mother"
                    }
                ]
            },
            "age": 48,
            "gender": "Male",
            "location": "New York, USA",
            "coords": [-74.0060, 40.7128],
            "photo": "https://ui-avatars.com/api/?name=Suresh+Gupta&background=random",
            "relation": "Uncle",
            "children": [
                {
                    "id": "co1",
                    "name": "Pooja Gupta",
                    "spouse": {
                        "id": "co1s",
                        "name": "Michael Ross",
                        "age": 28,
                        "gender": "Male",
                        "location": "Chicago, USA",
                        "photo": "https://ui-avatars.com/api/?name=Michael+Ross&background=random",
                        "relation": "Pooja's Husband"
                    },
                    "age": 26,
                    "gender": "Female",
                    "location": "Chicago, USA",
                    "coords": [-87.6298, 41.8781],
                    "photo": "https://ui-avatars.com/api/?name=Pooja+Gupta&background=random",
                    "relation": "Cousin",
                    "children": [
                        {
                            "id": "n1",
                            "name": "Sam Ross",
                            "age": 5,
                            "gender": "Male",
                            "location": "Chicago, USA",
                            "coords": [-87.65, 41.90],
                            "photo": "https://ui-avatars.com/api/?name=Sam+Ross&background=random",
                            "relation": "First Cousin Once Removed"
                        }
                    ]
                },
                {
                    "id": "co2",
                    "name": "Rajiv Gupta",
                    "age": 24,
                    "gender": "Male",
                    "location": "Riyadh, Saudi",
                    "coords": [46.6753, 24.7136],
                    "photo": "https://ui-avatars.com/api/?name=Rajiv+Gupta&background=random",
                    "relation": "Cousin"
                }
            ]
        },
        {
            "id": "a1",
            "name": "Meera Verma",
            "spouse": {
                "id": "au1",
                "name": "Anil Verma",
                "age": 48,
                "gender": "Male",
                "location": "Mumbai, India",
                "photo": "https://ui-avatars.com/api/?name=Anil+Verma&background=random",
                "relation": "Uncle",
                "parents": [
                    {
                        "id": "up1",
                        "name": "Harish Verma",
                        "age": 72,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=Harish+Verma&background=random",
                        "relation": "Anil's Father"
                    },
                    {
                        "id": "up2",
                        "name": "Kamla Verma",
                        "age": 70,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Kamla+Verma&background=random",
                        "relation": "Anil's Mother"
                    }
                ]
            },
            "age": 45,
            "gender": "Female",
            "location": "Mumbai, India",
            "coords": [72.8, 19.0],
            "photo": "https://ui-avatars.com/api/?name=Meera+Verma&background=FF69B4&color=fff",
            "relation": "Aunt",
            "children": [
                {
                    "id": "co3",
                    "name": "Karan Verma",
                    "age": 20,
                    "gender": "Male",
                    "location": "Mumbai, India",
                    "spouse": {
                        "id": "co3s",
                        "name": "Neha Verma",
                        "age": 20,
                        "gender": "Female",
                        "location": "Mumbai, India",
                        "photo": "https://ui-avatars.com/api/?name=Neha+Verma&background=random",
                        "relation": "Karan's Wife"
                    },
                    "coords": [72.85, 19.05],
                    "photo": "https://ui-avatars.com/api/?name=Karan+Verma&background=random",
                    "relation": "Cousin"
                },
                {
                    "id": "co4",
                    "name": "Simran Verma",
                    "age": 18,
                    "gender": "Female",
                    "location": "Mumbai, India",
                    "coords": [72.82, 19.02],
                    "photo": "https://ui-avatars.com/api/?name=Simran+Verma&background=random",
                    "relation": "Cousin"
                }
            ]
        },
        {
            "id": "gu1",
            "name": "Geeta Kapoor",
            "spouse": {
                "id": "gua1",
                "name": "Rakesh Kapoor",
                "age": 75,
                "gender": "Male",
                "location": "Delhi, India",
                "photo": "https://ui-avatars.com/api/?name=Rakesh+Kapoor&background=random",
                "relation": "Great Uncle"
            },
            "age": 70,
            "gender": "Female",
            "location": "Delhi, India",
            "coords": [77.2090, 28.6139],
            "photo": "https://ui-avatars.com/api/?name=Geeta+Kapoor&background=random",
            "relation": "Paternal Aunt",
            "children": [
                {
                    "id": "c5",
                    "name": "Vikas Kapoor",
                    "age": 40,
                    "gender": "Male",
                    "location": "Pune, India",
                    "coords": [73.8567, 18.5204],
                    "photo": "https://ui-avatars.com/api/?name=Vikas+Kapoor&background=random",
                    "relation": "Cousin",
                    "spouse": {
                        "name": "Rina Kapoor",
                        "age": 38,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Rina+Kapoor&background=random"
                    },
                    "children": [
                        {
                            "id": "c5k1",
                            "name": "Aarav Kapoor",
                            "age": 10,
                            "gender": "Male",
                            "location": "Pune, India",
                            "photo": "https://ui-avatars.com/api/?name=Aarav+Kapoor&background=random"
                        },
                        {
                            "id": "c5k2",
                            "name": "Ishaan Kapoor",
                            "age": 8,
                            "gender": "Male",
                            "location": "Pune, India",
                            "photo": "https://ui-avatars.com/api/?name=Ishaan+Kapoor&background=random"
                        }
                    ]
                },
                {
                    "id": "c6",
                    "name": "Priya Kapoor",
                    "age": 38,
                    "gender": "Female",
                    "location": "Goa, India",
                    "coords": [74.1240, 15.2993],
                    "photo": "https://ui-avatars.com/api/?name=Priya+Kapoor&background=random",
                    "relation": "Cousin",
                    "children": [
                        {
                            "id": "c6k1",
                            "name": "Sanya",
                            "age": 12,
                            "gender": "Female",
                            "location": "Goa, India",
                            "photo": "https://ui-avatars.com/api/?name=Sanya&background=random"
                        }
                    ]
                }
            ]
        },
        {
            "id": "yu1",
            "name": "Vinay Gupta",
            "spouse": {
                "id": "yua1",
                "name": "Seema Gupta",
                "age": 38,
                "gender": "Female",
                "location": "Bangalore, India",
                "photo": "https://ui-avatars.com/api/?name=Seema+Gupta&background=FF69B4&color=fff",
                "relation": "Aunt"
            },
            "age": 42,
            "gender": "Male",
            "location": "Bangalore, India",
            "coords": [77.5946, 12.9716],
            "photo": "https://ui-avatars.com/api/?name=Vinay+Gupta&background=random",
            "relation": "Paternal Uncle",
            "children": [
                {
                    "id": "c7",
                    "name": "Riya Gupta",
                    "age": 15,
                    "gender": "Female",
                    "location": "Bangalore, India",
                    "coords": [77.6, 12.95],
                    "photo": "https://ui-avatars.com/api/?name=Riya+Gupta&background=random",
                    "relation": "Cousin"
                },
                {
                    "id": "c8",
                    "name": "Aryan Gupta",
                    "age": 12,
                    "gender": "Male",
                    "location": "Bangalore, India",
                    "coords": [77.62, 12.98],
                    "photo": "https://ui-avatars.com/api/?name=Aryan+Gupta&background=random",
                    "relation": "Cousin"
                }
            ]
        },
        {
            "id": "new_gu2",
            "name": "Ashok Gupta",
            "age": 68,
            "gender": "Male",
            "location": "Chennai, India",
            "coords": [80.2707, 13.0827],
            "photo": "https://ui-avatars.com/api/?name=Ashok+Gupta&background=random",
            "relation": "Paternal Uncle",
            "spouse": {
                "id": "new_gua2",
                "name": "Meena Gupta",
                "age": 65,
                "gender": "Female",
                "location": "Chennai, India",
                "photo": "https://ui-avatars.com/api/?name=Meena+Gupta&background=random",
                "relation": "Aunt"
            },
            "children": [
                {
                    "id": "c9",
                    "name": "Deepak Gupta",
                    "age": 40,
                    "gender": "Male",
                    "location": "Singapore",
                    "coords": [103.8198, 1.3521],
                    "photo": "https://ui-avatars.com/api/?name=Deepak+Gupta&background=random",
                    "relation": "Cousin",
                    "children": [
                        { "id": "c9k1", "name": "Kiran", "age": 10, "gender": "Female", "photo": "https://ui-avatars.com/api/?name=Kiran&background=random" },
                        { "id": "c9k2", "name": "Kabir", "age": 8, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=Kabir&background=random" }
                    ]
                },
                {
                    "id": "c10",
                    "name": "Anita Gupta",
                    "age": 35,
                    "gender": "Female",
                    "location": "Sydney, Australia",
                    "coords": [151.2093, -33.8688],
                    "photo": "https://ui-avatars.com/api/?name=Anita+Gupta&background=random",
                    "relation": "Cousin",
                    "spouse": {
                        "name": "David Lee",
                        "age": 36,
                        "gender": "Male",
                        "location": "Sydney, Australia",
                        "photo": "https://ui-avatars.com/api/?name=David+Lee&background=random"
                    },
                    "children": [
                        { "id": "c10k1", "name": "Mia Lee", "age": 5, "gender": "Female", "photo": "https://ui-avatars.com/api/?name=Mia+Lee&background=random" },
                        { "id": "c10k2", "name": "Leo Lee", "age": 2, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=Leo+Lee&background=random" }
                    ]
                }
            ]
        },
        {
            "id": "new_gu3",
            "name": "Lata Singh",
            "age": 72,
            "gender": "Female",
            "location": "Jaipur, India",
            "coords": [75.7873, 26.9124],
            "photo": "https://ui-avatars.com/api/?name=Lata+Singh&background=random",
            "relation": "Paternal Aunt",
            "spouse": {
                "name": "Vijay Singh",
                "age": 75,
                "gender": "Male",
                "location": "Jaipur, India",
                "photo": "https://ui-avatars.com/api/?name=Vijay+Singh&background=random"
            },
            "children": [
                {
                    "id": "c11",
                    "name": "Rajiv Singh",
                    "age": 45,
                    "gender": "Male",
                    "location": "Jaipur, India",
                    "photo": "https://ui-avatars.com/api/?name=Rajiv+Singh&background=random",
                    "relation": "Cousin",
                    "children": [
                        { "id": "c11k1", "name": "Pavan", "age": 15, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=Pavan&background=random" },
                        { "id": "c11k2", "name": "Pooja", "age": 12, "gender": "Female", "photo": "https://ui-avatars.com/api/?name=Pooja&background=random" }
                    ]
                },
                {
                    "id": "c12",
                    "name": "Sonia Singh",
                    "age": 42,
                    "gender": "Female",
                    "location": "Toronto, Canada",
                    "coords": [-79.3832, 43.6532],
                    "photo": "https://ui-avatars.com/api/?name=Sonia+Singh&background=random",
                    "relation": "Cousin",
                    "children": [
                        { "id": "c12k1", "name": "Kevin", "age": 8, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=Kevin&background=random" }
                    ]
                }
            ]
        },
        // EXTENDED FAMILY ADDITIONS (50+ total nodes check)
        // Adding ancestors to root (Great Grandparents)
        {
            "id": "gg1",
            "name": "Great Grandpa Gupta",
            "age": 100,
            "gender": "Male",
            "isAncestor": true,
            "location": "Varanasi, India",
            "coords": [82.9739, 25.3176],
            "photo": "https://ui-avatars.com/api/?name=GG+Gupta&background=random",
            "relation": "Great Grandfather",
            "children": [
                {
                    "id": "gga1",
                    "name": "Great Uncle 1",
                    "age": 75,
                    "gender": "Male",
                    "location": "Kolkata, India",
                    "coords": [88.3639, 22.5726],
                    "photo": "https://ui-avatars.com/api/?name=GU+One&background=random",
                    "relation": "Great Uncle",
                    "children": [
                        {
                            "id": "gu1c1", "name": "2nd Cousin 1", "age": 45, "gender": "Female", "location": "Kolkata", "photo": "https://ui-avatars.com/api/?name=2C+One&background=random",
                            "children": [{ "id": "2c1k1", "name": "Little K", "age": 5, "photo": "https://ui-avatars.com/api/?name=LK&background=random" }]
                        },
                        { "id": "gu1c2", "name": "2nd Cousin 2", "age": 40, "gender": "Male", "location": "Kolkata", "photo": "https://ui-avatars.com/api/?name=2C+Two&background=random" },
                        { "id": "gu1c3", "name": "2nd Cousin 3", "age": 35, "gender": "Female", "location": "Kolkata", "photo": "https://ui-avatars.com/api/?name=2C+Three&background=random" },
                        { "id": "gu1c4", "name": "2nd Cousin 4", "age": 30, "gender": "Male", "location": "Kolkata", "photo": "https://ui-avatars.com/api/?name=2C+Four&background=random" }
                    ]
                },
                {
                    "id": "gga2",
                    "name": "Great Aunt 1",
                    "age": 73,
                    "gender": "Female",
                    "location": "Lucknow, India",
                    "coords": [80.9462, 26.8467],
                    "photo": "https://ui-avatars.com/api/?name=GA+One&background=random",
                    "relation": "Great Aunt",
                    "children": [
                        { "id": "ga1c1", "name": "2nd Cousin 5", "age": 50, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=2C+Five&background=random" },
                        { "id": "ga1c2", "name": "2nd Cousin 6", "age": 48, "gender": "Female", "photo": "https://ui-avatars.com/api/?name=2C+Six&background=random" },
                        { "id": "ga1c3", "name": "2nd Cousin 7", "age": 46, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=2C+Seven&background=random" }
                    ]
                },
                {
                    "id": "gga3", // Another sibling of Grandfather
                    "name": "Great Uncle 2",
                    "age": 70,
                    "gender": "Male",
                    "location": "Patna, India",
                    "coords": [85.1376, 25.5941],
                    "photo": "https://ui-avatars.com/api/?name=GU+Two&background=random",
                    "relation": "Great Uncle",
                    "children": [
                        {
                            "id": "gu2c1", "name": "2nd Cousin 8", "age": 40, "gender": "Female", "photo": "https://ui-avatars.com/api/?name=2C+Eight&background=random",
                            "children": [
                                { "id": "2c8k1", "name": "Kid1", "age": 10, "photo": "https://ui-avatars.com/api/?name=KD1&background=random" },
                                { "id": "2c8k2", "name": "Kid2", "age": 8, "photo": "https://ui-avatars.com/api/?name=KD2&background=random" },
                                { "id": "2c8k3", "name": "Kid3", "age": 6, "photo": "https://ui-avatars.com/api/?name=KD3&background=random" },
                                { "id": "2c8k4", "name": "Kid4", "age": 4, "photo": "https://ui-avatars.com/api/?name=KD4&background=random" }
                            ]
                        },
                        { "id": "gu2c2", "name": "2nd Cousin 9", "age": 38, "gender": "Male", "photo": "https://ui-avatars.com/api/?name=2C+Nine&background=random" }
                    ]
                }
            ]
        }
    ]
};