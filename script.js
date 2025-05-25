// ✅ Global variable to track the currently open InfoWindow
let currentInfoWindow = null;

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

    // ✅ buttons for navigation
    document.querySelector("body > div.top-buttons > button:nth-child(1)").addEventListener("click", function() {
        window.location.href = "about.html"; // ✅ Redirects to the About page
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

        results.forEach(place => {
            // Create a marker for each brewery
            const marker = new google.maps.Marker({
                position: place.geometry.location,
                map: map,
                title: place.name,
                icon: {
                    url: "https://raw.githubusercontent.com/billjf/CentralFloridaBreweries/main/images/beermug.png", // Beer mug icon
                    scaledSize: new google.maps.Size(40, 40) // Adjust the size of the icon
                }
            });

// ✅ Create an InfoWindow for each marker
const imageUrl = place.photos && place.photos.length > 0 && place.photos[0].getUrl
    ? place.photos[0].getUrl()
    : "default-image.jpg"; // ✅ Use a placeholder if no image is available

const infoWindow = new google.maps.InfoWindow({
    content: `<div class="info-window">
                 <img src="${imageUrl}" style="width:100%; border-radius:5px; margin-bottom:8px;" />
                 <h3>${place.name}</h3>
                 <p><strong>⭐ Rating:</strong> ${place.rating || "Not available"}</p>
                 <p>📍 ${place.formatted_address}</p>
                 <button onclick="getDirections(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${place.name.replace(/'/g, "\\'")}')"
                         style="margin-top:10px; padding:8px 12px; background-color:#ffac33; border:none; border-radius:4px; cursor:pointer;">
                     🚗 Get Directions
                 </button>
              </div>`
});


            // Add a click event listener to open the InfoWindow
            marker.addListener("click", () => {
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                }
                infoWindow.open(map, marker);
                currentInfoWindow = infoWindow;
            });

            // Store the marker for future use (e.g., filtering)
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

                            // ✅ Show step-by-step instructions
                            const directionsPanel = document.getElementById("directions-panel");
                            directionsPanel.style.display = "block";
                            directionsPanel.innerHTML = "<h2 style='color:#ffac33;'>🚗 Step-by-Step Directions</h2>";

                            const steps = response.routes[0].legs[0].steps;
                            steps.forEach((step, index) => {
                                directionsPanel.innerHTML += `
                                    <p><strong>Step ${index + 1}:</strong> ${step.instructions}
                                    <br><em>(${step.distance.text}, ${step.duration.text})</em></p>
                                `;
                            });
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

// ✅ Close Directions Panel
document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.getElementById("close-directions");
    const panel = document.getElementById("directions-panel");
    
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            document.getElementById("directions-panel").style.display = "none";
        });
    }
});
