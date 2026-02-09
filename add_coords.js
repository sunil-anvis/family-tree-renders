const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

    // Hubs: [Longitude, Latitude]
    const cities = [
        { name: "Mumbai, India", coords: [72.8777, 19.0760], weight: 0.5 },
        { name: "Delhi, India", coords: [77.1025, 28.7041], weight: 0.2 },
        { name: "Bangalore, India", coords: [77.5946, 12.9716], weight: 0.1 },
        { name: "London, UK", coords: [-0.1276, 51.5072], weight: 0.05 },
        { name: "New York, USA", coords: [-74.0060, 40.7128], weight: 0.05 },
        { name: "Dubai, UAE", coords: [55.2708, 25.2048], weight: 0.05 },
        { name: "Toronto, Canada", coords: [-79.3832, 43.6532], weight: 0.05 }
    ];

    function getRandomCity() {
        const r = Math.random();
        let sum = 0;
        for (const city of cities) {
            sum += city.weight;
            if (r <= sum) return city;
        }
        return cities[0];
    }

    function addJitter(coords) {
        // Add random scatter around the city (approx +/- 200km max)
        const jitter = 2.0;
        return [
            coords[0] + (Math.random() - 0.5) * jitter,
            coords[1] + (Math.random() - 0.5) * jitter
        ];
    }

    let count = 0;
    data.forEach(person => {
        // Only add if missing
        if (!person.coords) {
            const city = getRandomCity();
            person.coords = addJitter(city.coords);
            // Verify existing location field, if empty fill it
            if (!person.location) {
                person.location = city.name;
            }
            count++;
        }
    });

    fs.writeFileSync('data.json', JSON.stringify(data, null, 4), 'utf8');
    console.log(`Successfully added coordinates to ${count} family members.`);

} catch (err) {
    console.error("Error updating data.json:", err);
}
