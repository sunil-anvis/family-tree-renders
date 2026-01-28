const initialFamilyData = {
    "id": "root",
    "node_style": "circle",
    "name": "Grandfather",
    "age": 78,
    "gender": "Male",
    "location": "Mumbai, India",
    "coords": [
        72.8777,
        19.0760
    ],
    "photo": "https://ui-avatars.com/api/?name=Grand+Father&background=random",
    "relation": "Root",
    "spouse": {
        "name": "Grandmother",
        "age": 76,
        "gender": "Female",
        "location": "Mumbai, India",
        "photo": "https://ui-avatars.com/api/?name=Grand+Mother&background=random",
        "relation": "Paternal Grandmother"
    },
    "children": [
        {
            "id": "f1",
            "name": "Father",
            "spouse": {
                "id": "m1",
                "name": "Mother",
                "age": 48,
                "gender": "Female",
                "location": "Mumbai, India",
                "photo": "https://ui-avatars.com/api/?name=Mother&background=FF69B4&color=fff",
                "relation": "Mother",
                "parents": [
                    {
                        "id": "mg1",
                        "name": "Maternal GF",
                        "age": 75,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=Mat+GF&background=random",
                        "relation": "Grandfather"
                    },
                    {
                        "id": "mg2",
                        "name": "Maternal GM",
                        "age": 70,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Mat+GM&background=random",
                        "relation": "Grandmother"
                    }
                ]
            },
            "age": 50,
            "gender": "Male",
            "location": "Mumbai, India",
            "coords": [
                72.8777,
                19.0760
            ],
            "photo": "https://ui-avatars.com/api/?name=Father&background=0D8ABC&color=fff",
            "relation": "Son",
            "children": [
                {
                    "id": "c1",
                    "name": "Me",
                    "isMe": true,
                    "age": 25,
                    "gender": "Male",
                    "location": "Mumbai, India",
                    "coords": [
                        72.9,
                        19.1
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Me&background=0D8ABC&color=fff",
                    "relation": "Son"
                },
                {
                    "id": "c2",
                    "name": "Brother",
                    "spouse": {
                        "id": "c2s",
                        "name": "Sister In Law",
                        "age": 21,
                        "gender": "Female",
                        "location": "London, UK",
                        "photo": "https://ui-avatars.com/api/?name=Sister+In+Law&background=FF69B4&color=fff",
                        "relation": "Daughter In Law"
                    },
                    "age": 22,
                    "gender": "Male",
                    "location": "London, UK",
                    "coords": [
                        -0.1276,
                        51.5074
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Brother&background=random",
                    "relation": "Son",
                    "children": [
                        {
                            "id": "n2",
                            "name": "Nephew 2",
                            "age": 1,
                            "gender": "Male",
                            "location": "London, UK",
                            "coords": [
                                -0.1,
                                51.5
                            ],
                            "photo": "https://ui-avatars.com/api/?name=Nephew+two&background=random",
                            "relation": "Grandson"
                        }
                    ]
                },
                {
                    "id": "c3",
                    "name": "Sister",
                    "spouse": {
                        "id": "c3s",
                        "name": "Brother In Law",
                        "age": 20,
                        "gender": "Male",
                        "location": "Dubai, UAE",
                        "photo": "https://ui-avatars.com/api/?name=Brother+In+Law&background=random",
                        "relation": "Son In Law"
                    },
                    "age": 19,
                    "gender": "Female",
                    "location": "Dubai, UAE",
                    "coords": [
                        55.2708,
                        25.2048
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Sister&background=FF69B4&color=fff",
                    "relation": "Daughter",
                    "children": [
                        {
                            "id": "ni1",
                            "name": "Niece 1",
                            "age": 1,
                            "gender": "Female",
                            "location": "Dubai, UAE",
                            "coords": [
                                55.3,
                                25.2
                            ],
                            "photo": "https://ui-avatars.com/api/?name=Niece+One&background=random",
                            "relation": "Granddaughter"
                        }
                    ]
                }
            ]
        },
        {
            "id": "u1",
            "name": "Uncle",
            "spouse": {
                "id": "ua1",
                "name": "Aunt (In-Law)",
                "age": 45,
                "gender": "Female",
                "location": "New York, USA",
                "photo": "https://ui-avatars.com/api/?name=Aunt+In+Law&background=FF69B4&color=fff",
                "relation": "Aunt",
                "parents": [
                    {
                        "id": "ap1",
                        "name": "Aunt's Dad",
                        "age": 70,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=Aunt+Dad&background=random",
                        "relation": "Father"
                    },
                    {
                        "id": "ap2",
                        "name": "Aunt's Mom",
                        "age": 68,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Aunt+Mom&background=random",
                        "relation": "Mother"
                    }
                ]
            },
            "age": 48,
            "gender": "Male",
            "location": "New York, USA",
            "coords": [
                -74.0060,
                40.7128
            ],
            "photo": "https://ui-avatars.com/api/?name=Uncle&background=random",
            "relation": "Son",
            "children": [
                {
                    "id": "co1",
                    "name": "Cousin 1",
                    "spouse": {
                        "id": "co1s",
                        "name": "Cousin 1 Spouse",
                        "age": 28,
                        "gender": "Male",
                        "location": "Chicago, USA",
                        "photo": "https://ui-avatars.com/api/?name=Cousin+Spouse&background=random",
                        "relation": "In-Law"
                    },
                    "age": 26,
                    "gender": "Female",
                    "location": "Chicago, USA",
                    "coords": [
                        -87.6298,
                        41.8781
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+One&background=random",
                    "relation": "Daughter",
                    "children": [
                        {
                            "id": "n1",
                            "name": "Nephew 1",
                            "age": 5,
                            "gender": "Male",
                            "location": "Chicago, USA",
                            "coords": [
                                -87.65,
                                41.90
                            ],
                            "photo": "https://ui-avatars.com/api/?name=Nephew&background=random",
                            "relation": "Grandson"
                        }
                    ]
                },
                {
                    "id": "co2",
                    "name": "Cousin 2",
                    "age": 24,
                    "gender": "Male",
                    "location": "Riyadh, Saudi",
                    "coords": [
                        46.6753,
                        24.7136
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Two&background=random",
                    "relation": "Son"
                }
            ]
        },
        {
            "id": "a1",
            "name": "Aunt",
            "spouse": {
                "id": "au1",
                "name": "Uncle (In-Law)",
                "age": 48,
                "gender": "Male",
                "location": "Mumbai, India",
                "photo": "https://ui-avatars.com/api/?name=Uncle+In+Law&background=random",
                "relation": "Uncle",
                "parents": [
                    {
                        "id": "up1",
                        "name": "Uncle's Dad",
                        "age": 72,
                        "gender": "Male",
                        "photo": "https://ui-avatars.com/api/?name=Uncle+Dad&background=random",
                        "relation": "Father"
                    },
                    {
                        "id": "up2",
                        "name": "Uncle's Mom",
                        "age": 70,
                        "gender": "Female",
                        "photo": "https://ui-avatars.com/api/?name=Uncle+Mom&background=random",
                        "relation": "Mother"
                    }
                ]
            },
            "age": 45,
            "gender": "Female",
            "location": "Mumbai, India",
            "coords": [
                72.8,
                19.0
            ],
            "photo": "https://ui-avatars.com/api/?name=Aunt&background=FF69B4&color=fff",
            "relation": "Daughter",
            "children": [
                {
                    "id": "co3",
                    "name": "Cousin 3",
                    "age": 20,
                    "gender": "Male",
                    "location": "Mumbai, India",
                    "spouse": {
                        "id": "co3s",
                        "name": "wife of cousin 3",
                        "age": 20,
                        "gender": "Female",
                        "location": "Mumbai, India",
                        "photo": "https://ui-avatars.com/api/?name=wife of cousin 3&background=random",
                        "relation": "wife of cousin 3"
                    },
                    "coords": [
                        72.85,
                        19.05
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Three&background=random",
                    "relation": "Son"
                },
                {
                    "id": "co4",
                    "name": "Cousin 4",
                    "age": 18,
                    "gender": "Female",
                    "location": "Mumbai, India",
                    "coords": [
                        72.82,
                        19.02
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Four&background=random",
                    "relation": "Daughter"
                }
            ]
        },
        {
            "id": "gu1",
            "name": "Great Aunt",
            "spouse": {
                "id": "gua1",
                "name": "Great Uncle",
                "age": 75,
                "gender": "Male",
                "location": "Delhi, India",
                "photo": "https://ui-avatars.com/api/?name=Great+Uncle&background=random",
                "relation": "Great Uncle"
            },
            "age": 70,
            "gender": "Female",
            "location": "Delhi, India",
            "coords": [
                77.2090,
                28.6139
            ],
            "photo": "https://ui-avatars.com/api/?name=Great+Aunt&background=random",
            "relation": "Sister",
            "children": [
                {
                    "id": "c5",
                    "name": "Cousin 5",
                    "age": 40,
                    "gender": "Male",
                    "location": "Pune, India",
                    "coords": [
                        73.8567,
                        18.5204
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Five&background=random",
                    "relation": "Nephew"
                },
                {
                    "id": "c6",
                    "name": "Cousin 6",
                    "age": 38,
                    "gender": "Female",
                    "location": "Goa, India",
                    "coords": [
                        74.1240,
                        15.2993
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Six&background=random",
                    "relation": "Niece"
                }
            ]
        },
        {
            "id": "yu1",
            "name": "Young Uncle",
            "spouse": {
                "id": "yua1",
                "name": "Young Aunt",
                "age": 38,
                "gender": "Female",
                "location": "Bangalore, India",
                "photo": "https://ui-avatars.com/api/?name=Young+Aunt&background=FF69B4&color=fff",
                "relation": "Aunt"
            },
            "age": 42,
            "gender": "Male",
            "location": "Bangalore, India",
            "coords": [
                77.5946,
                12.9716
            ],
            "photo": "https://ui-avatars.com/api/?name=Young+Uncle&background=random",
            "relation": "Brother",
            "children": [
                {
                    "id": "c7",
                    "name": "Cousin 7",
                    "age": 15,
                    "gender": "Female",
                    "location": "Bangalore, India",
                    "coords": [
                        77.6,
                        12.95
                    ],
                    "photo": "https://ui-avatars.com/api/?name=Cousin+Seven&background=random",
                    "relation": "Niece"
                }
            ]
        }
    ]
};