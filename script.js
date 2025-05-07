// ✅ Global marker storage for filtering
let markers = [];

window.initMap = function () {
    console.log("Initializing map...");

    if (typeof google === "undefined" || !google.maps) {
        console.error("Google Maps API failed to load.");
        return;
    }

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: { lat: 28.5383, lng: -81.3792 }, // Central Florida
        mapId: "718387af81a38506"
    });

    // ✅ Setup Directions service and renderer
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({ map });

    // ✅ Assign global references
    window.mapInstance = map;
    window.directionsService = directionsService;
    window.directionsRenderer = directionsRenderer;

    findBreweries(map);
    fetchFeaturedBreweries(map);
};

function findBreweries(map) {
    console.log("Starting Place Search for breweries...");

    const service = new google.maps.places.PlacesService(map);
    const request = {
        query: "brewery",
        location: map.getCenter(),
        radius: 50000
    };

    service.textSearch(request, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            console.error("No breweries found!", status);
            return;
        }

        console.log(`Found ${results.length} breweries.`);
        results.forEach(place => {
            const markerElement = document.createElement("img");
            markerElement.src = "https://raw.githubusercontent.com/billjf/CentralFloridaBreweries/main/images/beermug.png";
            markerElement.style.width = "40px";
            markerElement.style.height = "40px";
            markerElement.style.cursor = "pointer";

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: place.geometry.location,
                map: map,
                title: place.name,
                content: markerElement
            });

            marker.addEventListener("gmp-click", () => {
                console.log(`Marker clicked: ${place.name}`);
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="max-width: 250px; background-color: #222; color: #fff; padding: 10px; border-radius: 8px;">
                            <h3 style="margin: 0; font-size: 16px;">${place.name}</h3>
                            <p style="margin: 5px 0;"><strong>Address:</strong> ${place.formatted_address}</p>
                            <p style="margin: 5px 0;"><strong>Rating:</strong> ${place.rating || "Not available"} ⭐</p>
                            <button onclick="getDirections(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${place.name}')"
                                style="background-color: #ffac33; color: #222; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                                🚗 Get Directions
                            </button>
                        </div>
                    `
                });
                infoWindow.open(map, marker);
            });

            markers.push({ marker, name: place.name.toLowerCase(), type: place.types });
        });
    });
}

// ✅ Get driving directions from current location to selected brewery
function getDirections(lat, lng, name) {
    console.log(`Getting directions to: ${name} (${lat}, ${lng})`);

    const map = window.mapInstance;
    const directionsService = window.directionsService;
    const directionsRenderer = window.directionsRenderer;

    if (!map || !directionsService || !directionsRenderer) {
        console.error("Map or directions services are not initialized.");
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const origin = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                const destination = { lat, lng };

                directionsService.route(
                    {
                        origin,
                        destination,
                        travelMode: google.maps.TravelMode.DRIVING
                    },
                    (response, status) => {
                        if (status === "OK") {
                            directionsRenderer.setDirections(response);
                        } else {
                            console.error("Directions request failed due to " + status);
                            alert("Directions request failed. Try again.");
                        }
                    }
                );
            },
            () => {
                alert("Geolocation failed. Unable to get directions.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// ✅ Live Filtering for Brewery Search
document.getElementById("searchBox").addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();

    markers.forEach(({ marker, name, type }) => {
        if (name.includes(searchTerm) || type.some(t => t.includes(searchTerm))) {
            marker.map = window.mapInstance; // Show
        } else {
            marker.map = null; // Hide
        }
    });

    console.log(`Search term entered: ${searchTerm}`);
});

// ✅ Fetch Featured Breweries
function fetchFeaturedBreweries(map) {
    console.log("Fetching featured breweries...");

    const service = new google.maps.places.PlacesService(map);
    const request = {
        query: "brewery",
        location: map.getCenter(),
        radius: 50000
    };

    service.textSearch(request, (results, status) => {
        console.log("Google Places API Response:", results, status);

        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            console.error("No breweries found!", status);
            document.getElementById("featured-breweries").innerHTML = "<p>No breweries found. Try again later.</p>";
            return;
        }

        const topBreweries = results
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5);

        const breweryContainer = document.getElementById("featured-breweries");
        breweryContainer.innerHTML = "";

        topBreweries.forEach(place => {
            const breweryElement = document.createElement("div");
            breweryElement.style.padding = "10px";
            breweryElement.style.borderBottom = "1px solid #ffac33";
            breweryElement.innerHTML = `
                <h3>${place.name}</h3>
                <p><strong>Rating:</strong> ${place.rating || "Not available"} ⭐</p>
                <p><strong>Address:</strong> ${place.formatted_address}</p>
            `;
            breweryContainer.appendChild(breweryElement);
        });

        console.log(`Featured Breweries Loaded: ${topBreweries.map(p => `${p.name} (${p.rating})`).join(", ")}`);
    });
}
