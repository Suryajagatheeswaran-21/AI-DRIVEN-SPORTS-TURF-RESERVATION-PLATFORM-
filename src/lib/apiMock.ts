import districtsData from "../data/districts.json";
import placesData from "../data/places.json";
import turfsData from "../data/turfs.json";

// We intercept window.fetch to support running in Google AI Studio Preview flawlessly
const originalFetch = window.fetch;

(window as any).fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const urlStr = typeof input === "string" ? input : (input as any).url || input.toString();
  
  // We only intercept if it's our target API routes and has /api/ or relative paths
  if (
    urlStr.includes("/districts") || 
    urlStr.includes("/places") || 
    urlStr.includes("/turfs")
  ) {
    try {
      // Create a URL object to parse query parameters
      const url = new URL(urlStr, window.location.origin);
      const path = url.pathname;
      
      // 1. GET /districts or /api/v1/districts
      if (
        path === "/districts" || 
        path === "/api/v1/districts" || 
        path === "/api/districts"
      ) {
        const list = districtsData.map(d => ({
          id: d.id,
          name: d.district,
          latitude: d.latitude,
          longitude: d.longitude
        }));
        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 2. GET /districts/:districtId/places or /api/v1/districts/:districtId/places
      const districtPlacesMatch = path.match(/^\/(?:api\/v1\/|api\/)?districts\/(\d+)\/places$/) || path.match(/^\/districts\/(\d+)\/places$/);
      if (districtPlacesMatch) {
        const districtId = parseInt(districtPlacesMatch[1]);
        const matchedPlaces = placesData.filter(p => p.district_id === districtId);
        return new Response(JSON.stringify(matchedPlaces), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 3. GET /places/:placeId/turfs or /api/v1/places/:placeId/turfs
      const placeTurfsMatch = path.match(/^\/(?:api\/v1\/|api\/)?places\/(\d+)\/turfs$/) || path.match(/^\/places\/(\d+)\/turfs$/);
      if (placeTurfsMatch) {
        const placeId = parseInt(placeTurfsMatch[1]);
        const matchedTurfs = turfsData.filter(t => t.place_id === placeId).map(t => ({
          id: t.id,
          place_id: t.place_id,
          name: t.name,
          turfName: t.name,
          address: t.address,
          latitude: t.latitude,
          longitude: t.longitude,
          sports: t.sports,
          sport: t.sports,
          price: t.price,
          rating: t.rating,
          images: t.images,
          image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
          owner_id: t.owner_id,
          openTime: t.openTime,
          type: t.type,
          availableToday: t.availableToday,
          availability: t.availability
        }));
        return new Response(JSON.stringify(matchedTurfs), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 4. GET /turfs/search or /api/v1/turfs/search
      if (
        path.includes("/turfs/search") || 
        path === "/turfs/search" || 
        path === "/api/v1/turfs/search" || 
        path === "/api/turfs/search"
      ) {
        const districtQuery = url.searchParams.get("district");
        const placeQuery = url.searchParams.get("place");
        const sportQuery = url.searchParams.get("sport");
        
        let filtered = [...turfsData];
        if (districtQuery) {
          filtered = filtered.filter(t => t.district.toLowerCase() === districtQuery.toLowerCase());
        }
        if (placeQuery) {
          // Find place by name to get its id
          const foundPlace = placesData.find(p => p.name.toLowerCase() === placeQuery.toLowerCase());
          if (foundPlace) {
            filtered = filtered.filter(t => t.place_id === foundPlace.id);
          } else {
            // substring match fallback
            filtered = filtered.filter(t => t.address?.toLowerCase().includes(placeQuery.toLowerCase()));
          }
        }
        if (sportQuery) {
          filtered = filtered.filter(t => 
            t.sports.toLowerCase() === sportQuery.toLowerCase() || 
            t.sport?.toLowerCase() === sportQuery.toLowerCase()
          );
        }
        
        const mappedResults = filtered.map(t => ({
          id: t.id,
          place_id: t.place_id,
          name: t.name,
          turfName: t.name,
          address: t.address,
          latitude: t.latitude,
          longitude: t.longitude,
          sports: t.sports,
          sport: t.sports,
          price: t.price,
          rating: t.rating,
          images: t.images,
          image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
          owner_id: t.owner_id,
          openTime: t.openTime,
          type: t.type,
          availableToday: t.availableToday,
          availability: t.availability
        }));
        
        return new Response(JSON.stringify(mappedResults), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 5. GET /turfs/:id or /api/v1/turfs/:id
      const turfIdMatch = path.match(/^\/(?:api\/v1\/|api\/)?turfs\/(\d+)$/) || path.match(/^\/turfs\/(\d+)$/);
      if (turfIdMatch) {
        const id = parseInt(turfIdMatch[1]);
        const t = turfsData.find(x => x.id === id);
        if (t) {
          return new Response(JSON.stringify({
            id: t.id,
            place_id: t.place_id,
            name: t.name,
            turfName: t.name,
            address: t.address,
            latitude: t.latitude,
            longitude: t.longitude,
            sports: t.sports,
            sport: t.sports,
            price: t.price,
            rating: t.rating,
            images: t.images,
            image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
            owner_id: t.owner_id,
            openTime: t.openTime,
            type: t.type,
            availableToday: t.availableToday,
            availability: t.availability
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ error: "Turf not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } catch (err) {
      console.error("Mock fetch interceptor error: ", err);
    }
  }
  
  // Call original fetch if it doesn't match or failed
  return originalFetch.apply(this, arguments as any);
};
