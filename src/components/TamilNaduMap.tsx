import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMapComponent, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { 
  MapPin, 
  Star, 
  Compass, 
  AlertCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Search, 
  Calendar, 
  Building, 
  Trees, 
  Zap, 
  Check, 
  Map as MapIcon,
  Info
} from "lucide-react";
import { Turf, District, Place } from "../types";
import districtsData from "../data/districts.json";
import placesData from "../data/places.json";
import turfsData from "../data/turfs.json";

// Fetch API Key safely from secrets
const GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasGoogleKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== "YOUR_API_KEY";

// Custom controller to programmatically pan/zoom the Leaflet map
function ChangeLeafletMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet marker icons
const createLeafletIcon = (sportsType: string, availability?: string) => {
  const isAvailable = availability !== "FULLY_BOOKED";
  const colorClass = isAvailable ? "bg-emerald-500" : "bg-rose-500";
  const ringClass = isAvailable ? "border-emerald-200 animate-pulse" : "border-rose-200";

  return L.divIcon({
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute w-6 h-6 rounded-full border-2 ${ringClass} ${colorClass} shadow-lg flex items-center justify-center">
          <span class="w-2 h-2 bg-slate-950 rounded-full"></span>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-slate-950 rotate-45 transform"></div>
      </div>
    `,
    className: "custom-leaflet-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface TamilNaduMapProps {
  onBookNow: (turfId: number) => void;
  onAddApiLog: (
    method: "GET" | "POST" | "DELETE" | "PUT",
    url: string,
    reqBody?: string,
    respBody?: string,
    status?: number
  ) => void;
  initialDistrictId?: number | null;
  initialPlaceId?: number | null;
  initialSportFilter?: string | null;
  initialSearchQuery?: string | null;
  onClearInitialFocus?: () => void;
}

export default function TamilNaduMap({ 
  onBookNow, 
  onAddApiLog,
  initialDistrictId,
  initialPlaceId,
  initialSportFilter,
  initialSearchQuery,
  onClearInitialFocus
}: TamilNaduMapProps) {
  // Navigation Steps: "district" | "place" | "turfs"
  const [step, setStep] = useState<"district" | "place" | "turfs">("district");

  // Selection state
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Lists loaded from APIs/Data
  const [districtsList, setDistrictsList] = useState<District[]>([]);
  const [placesList, setPlacesList] = useState<Place[]>([]);
  const [turfsList, setTurfsList] = useState<Turf[]>([]);

  // Search and Filters
  const [districtSearch, setDistrictSearch] = useState("");
  const [turfSearchQuery, setTurfSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(180);
  const [minRating, setMinRating] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState("ALL"); // "ALL" | "Indoor" | "Outdoor"
  const [availableTodayFilter, setAvailableTodayFilter] = useState(false);

  // Map state
  const [activeTurfPin, setActiveTurfPin] = useState<Turf | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.1271, 78.6569]); // Default Tamil Nadu center
  const [mapZoom, setMapZoom] = useState<number>(7);
  
  // Google Map Error Tracking
  const [gMapLoadError, setGMapLoadError] = useState<boolean>(false);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(false);

  // Load districts initially
  useEffect(() => {
    setIsLoadingMap(true);
    fetch("/api/v1/districts")
      .then(res => {
        if (!res.ok) throw new Error("API Offline");
        return res.json();
      })
      .then(data => {
        setDistrictsList(data);
        onAddApiLog("GET", "/api/v1/districts", undefined, `Successfully loaded ${data.length} districts from API.`, 200);
      })
      .catch(err => {
        console.warn("Using local fallback districts data", err);
        const mapped = districtsData.map(d => ({
          id: d.id,
          name: d.district,
          latitude: d.latitude,
          longitude: d.longitude
        }));
        setDistrictsList(mapped);
      })
      .finally(() => setIsLoadingMap(false));
  }, []);

  // Handle external chatbot state updates
  useEffect(() => {
    if (initialDistrictId) {
      const foundDist = districtsData.find(d => d.id === initialDistrictId);
      if (foundDist) {
        const districtObj: District = {
          id: foundDist.id,
          name: foundDist.district,
          latitude: foundDist.latitude,
          longitude: foundDist.longitude
        };
        setSelectedDistrict(districtObj);
        
        // Fetch places
        fetch(`/api/v1/districts/${foundDist.id}/places`)
          .then(res => res.json())
          .then(places => {
            setPlacesList(places);
            
            if (initialPlaceId) {
              const foundPlace = places.find((p: any) => p.id === initialPlaceId);
              if (foundPlace) {
                setSelectedPlace(foundPlace);
                setStep("turfs");
                
                // Fetch turfs for that place
                fetch(`/api/v1/places/${foundPlace.id}/turfs`)
                  .then(res => res.json())
                  .then(turfs => {
                    setTurfsList(turfs);
                    // Center map near the first turf or default coordinates
                    if (turfs.length > 0 && turfs[0].latitude) {
                      setMapCenter([turfs[0].latitude, turfs[0].longitude]);
                      setMapZoom(13);
                    } else {
                      setMapCenter([foundDist.latitude, foundDist.longitude]);
                      setMapZoom(11);
                    }
                  });
              }
            } else {
              setStep("place");
            }
          });
      }
      
      if (initialSportFilter) {
        setSportFilter(initialSportFilter);
      }
      if (initialSearchQuery) {
        setTurfSearchQuery(initialSearchQuery);
      }
      
      // Clear trigger states
      if (onClearInitialFocus) {
        onClearInitialFocus();
      }
    }
  }, [initialDistrictId, initialPlaceId, initialSportFilter, initialSearchQuery]);

  // Select a district
  const handleSelectDistrict = (dist: District) => {
    setSelectedDistrict(dist);
    setStep("place");
    setIsLoadingMap(true);
    
    fetch(`/api/v1/districts/${dist.id}/places`)
      .then(res => {
        if (!res.ok) throw new Error("API Offline");
        return res.json();
      })
      .then(data => {
        setPlacesList(data);
        onAddApiLog("GET", `/api/v1/districts/${dist.id}/places`, undefined, `Loaded ${data.length} places for district ${dist.name}.`, 200);
      })
      .catch(err => {
        console.warn("Using local fallback places data", err);
        const mapped = placesData.filter(p => p.district_id === dist.id);
        setPlacesList(mapped);
      })
      .finally(() => setIsLoadingMap(false));
  };

  // Select a place
  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    setStep("turfs");
    setIsLoadingMap(true);

    fetch(`/api/v1/places/${place.id}/turfs`)
      .then(res => {
        if (!res.ok) throw new Error("API Offline");
        return res.json();
      })
      .then(data => {
        setTurfsList(data);
        onAddApiLog("GET", `/api/v1/places/${place.id}/turfs`, undefined, `Loaded ${data.length} turfs for ${place.name}.`, 200);
        
        if (data.length > 0 && data[0].latitude) {
          setMapCenter([data[0].latitude, data[0].longitude]);
          setMapZoom(13);
        } else if (selectedDistrict) {
          setMapCenter([selectedDistrict.latitude, selectedDistrict.longitude]);
          setMapZoom(11);
        }
      })
      .catch(err => {
        console.warn("Using local fallback turfs data", err);
        const mapped = turfsData.filter(t => t.place_id === place.id).map(t => ({
          id: t.id,
          name: t.name,
          location: t.address,
          address: t.address,
          latitude: t.latitude,
          longitude: t.longitude,
          sportsType: t.sports,
          description: `Premium ${t.sports.toLowerCase()} arena in ${place.name}. Equipped with professional facilities.`,
          pricePerHour: t.price,
          isActive: true,
          image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
          images: t.images,
          rating: t.rating,
          openTime: t.openTime,
          type: t.type,
          availableToday: t.availableToday,
          availability: t.availability
        }));
        setTurfsList(mapped);
        
        if (mapped.length > 0 && mapped[0].latitude) {
          setMapCenter([mapped[0].latitude, mapped[0].longitude]);
          setMapZoom(13);
        } else if (selectedDistrict) {
          setMapCenter([selectedDistrict.latitude, selectedDistrict.longitude]);
          setMapZoom(11);
        }
      })
      .finally(() => setIsLoadingMap(false));
  };

  // Filter computation
  const getFilteredTurfs = () => {
    let list = [...turfsList];

    // Sport filter
    if (sportFilter !== "ALL") {
      list = list.filter(t => (t.sportsType || "").toUpperCase() === sportFilter.toUpperCase() || (t.sports || "").toUpperCase() === sportFilter.toUpperCase() || (t.sport || "").toUpperCase() === sportFilter.toUpperCase());
    }

    // Price range slider
    list = list.filter(t => (t.pricePerHour || t.price || 0) <= maxPrice);

    // Rating filter
    list = list.filter(t => (t.rating || 0) >= minRating);

    // Type filter (Indoor/Outdoor)
    if (typeFilter !== "ALL") {
      list = list.filter(t => t.type === typeFilter);
    }

    // Available today filter
    if (availableTodayFilter) {
      list = list.filter(t => t.availableToday === true || t.availability === "AVAILABLE");
    }

    // Searching INSIDE the selected district (Requirement 6)
    // Searches by place name, address, or name
    if (turfSearchQuery.trim() !== "") {
      const q = turfSearchQuery.toLowerCase();
      list = list.filter(t => 
        (t.name || "").toLowerCase().includes(q) ||
        (t.address || t.location || "").toLowerCase().includes(q) ||
        (selectedPlace?.name || "").toLowerCase().includes(q)
      );
    }

    return list;
  };

  const activeTurfs = getFilteredTurfs();

  // Highlight priority districts (Requirement 1)
  const priorityDistricts = ["Erode", "Salem", "Coimbatore", "Tiruppur", "Namakkal"];
  const priorityItems = districtsList.filter(d => priorityDistricts.includes(d.name));
  const regularItems = districtsList.filter(d => !priorityDistricts.includes(d.name) && d.name.toLowerCase().includes(districtSearch.toLowerCase()));

  // Reset navigation
  const handleGoBackToDistricts = () => {
    setSelectedDistrict(null);
    setSelectedPlace(null);
    setStep("district");
    setTurfsList([]);
  };

  const handleGoBackToPlaces = () => {
    setSelectedPlace(null);
    setStep("place");
    setTurfsList([]);
  };

  const handleFocusOnTurfMap = (turf: Turf) => {
    if (turf.latitude && turf.longitude) {
      setMapCenter([turf.latitude, turf.longitude]);
      setMapZoom(15);
      setActiveTurfPin(turf);
      
      // Auto-scroll to map on mobile
      const mapElem = document.getElementById("map-anchor");
      if (mapElem) {
        mapElem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Helper for generating custom district images/illustrations
  const getDistrictGradient = (name: string) => {
    switch (name) {
      case "Erode": return "from-emerald-600 to-teal-500";
      case "Salem": return "from-cyan-600 to-blue-500";
      case "Coimbatore": return "from-violet-600 to-indigo-500";
      case "Tiruppur": return "from-pink-600 to-rose-500";
      case "Namakkal": return "from-amber-600 to-orange-500";
      default: return "from-slate-800 to-slate-900";
    }
  };

  // Custom Place icons
  const getPlaceIcon = (index: number) => {
    const icons = [<Building key="1" className="h-5 w-5" />, <Trees key="2" className="h-5 w-5" />, <Zap key="3" className="h-5 w-5" />, <Compass key="4" className="h-5 w-5" />];
    return icons[index % icons.length];
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header / Breadcrumbs */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Compass className="h-5.5 w-5.5 text-emerald-400" />
            District Arena Navigator
          </h2>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <button 
              onClick={handleGoBackToDistricts}
              className={`hover:text-emerald-400 transition-colors ${step === "district" ? "text-emerald-400 font-bold" : ""}`}
            >
              Tamil Nadu Districts
            </button>
            {selectedDistrict && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-600" />
                <button 
                  onClick={handleGoBackToPlaces}
                  className={`hover:text-emerald-400 transition-colors ${step === "place" ? "text-emerald-400 font-bold" : ""}`}
                >
                  {selectedDistrict.name} Place Selector
                </button>
              </>
            )}
            {selectedPlace && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-600" />
                <span className="text-emerald-400 font-bold">{selectedPlace.name} Arenas</span>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        {step !== "district" && (
          <button
            onClick={step === "turfs" ? handleGoBackToPlaces : handleGoBackToDistricts}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all self-start sm:self-center cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {step === "turfs" ? "Places" : "Districts"}
          </button>
        )}
      </div>

      {/* STEP 1: DISTRICT SELECTION PAGE */}
      {step === "district" && (
        <div className="space-y-6 animate-fade-in">
          {/* Search bar */}
          <div className="max-w-md bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-500 ml-1.5" />
            <input 
              type="text" 
              placeholder="Search other districts..." 
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-200 w-full focus:outline-none"
            />
          </div>

          {/* Featured Priority Districts (Requirement 1) */}
          {!districtSearch && (
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Featured Districts</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {priorityItems.map((dist) => (
                  <div
                    key={dist.id}
                    onClick={() => handleSelectDistrict(dist)}
                    className="group relative overflow-hidden rounded-2xl border border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg flex flex-col justify-between h-36"
                  >
                    {/* Background Graphic */}
                    <div className={`absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-tr ${getDistrictGradient(dist.name)} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${getDistrictGradient(dist.name)} flex items-center justify-center text-slate-950 font-black text-xs shadow-md`}>
                      {dist.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors leading-tight">{dist.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                        Explore fields <ChevronRight className="h-3 w-3 text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All other Tamil Nadu Districts list */}
          <div className="space-y-3 text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              {districtSearch ? "Search Results" : "All Tamil Nadu Districts"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {regularItems.map((dist) => (
                <div
                  key={dist.id}
                  onClick={() => handleSelectDistrict(dist)}
                  className="p-3.5 rounded-xl border border-slate-800/60 bg-slate-900/20 hover:bg-slate-900/60 hover:border-slate-700 text-left text-xs font-bold text-slate-300 cursor-pointer transition-all flex items-center justify-between"
                >
                  <span className="truncate">{dist.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400" />
                </div>
              ))}
              {regularItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs font-mono">
                  No matching districts found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PLACE SELECTION PAGE (Requirement 2) */}
      {step === "place" && selectedDistrict && (
        <div className="space-y-6 animate-fade-in text-left">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Select a Sub-Region</span>
            <h3 className="text-md font-extrabold text-white mt-1">Available Places inside {selectedDistrict.name} District</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {placesList.map((place, i) => {
              // Count number of turfs inside this place
              const count = turfsData.filter(t => t.place_id === place.id).length;
              return (
                <div
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col items-start gap-4 shadow-lg"
                >
                  <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800/50 group-hover:text-cyan-400 transition-colors">
                    {getPlaceIcon(i)}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-emerald-400 transition-colors">{place.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center gap-1 font-mono">
                      {count > 0 ? `${count} Seeded Arena(s)` : "Check Availability"}
                    </p>
                  </div>
                </div>
              );
            })}
            {placesList.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs font-mono">
                No places registered in this district inside the preview dataset. We will auto-generate places shortly.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: TURF LIST + INTEGRATED MAP VIEW (Requirement 3, 5, 6, 7) */}
      {step === "turfs" && selectedPlace && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-left">
          {/* Left Panel: Filter Stage */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header / Info box */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Active Place Focus</span>
                <h3 className="text-md font-extrabold text-white">{selectedPlace.name} (District: {selectedDistrict?.name})</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Displaying matching sports arenas inside {selectedPlace.name}. Filter results using the dashboard controls below.
                </p>
              </div>

              {/* District Specific Search (Requirement 6) */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Search in {selectedDistrict?.name} District</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-600" />
                  <input
                    type="text"
                    placeholder={`e.g. "Sivagiri" or turf names...`}
                    value={turfSearchQuery}
                    onChange={(e) => setTurfSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Filter: Sports Categories (Requirement 5) */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Filter by Sport</span>
                <div className="flex flex-wrap gap-1.5">
                  {["ALL", "FOOTBALL", "CRICKET", "TENNIS", "BADMINTON", "BASKETBALL"].map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setSportFilter(sport)}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                        sportFilter === sport 
                          ? "bg-emerald-500 text-slate-950" 
                          : "bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Price range slider (Requirement 5) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Max Price per Hour</span>
                  <span className="text-xs font-bold text-emerald-400">${maxPrice}/hr</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Filters: Rating / Type / Available Today (Requirement 5) */}
              <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-800/50">
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Min Rating</span>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="bg-slate-950 text-xs text-slate-300 border border-slate-800 px-2.5 py-1.5 rounded-lg focus:border-emerald-500 outline-none w-full font-mono"
                  >
                    <option value="0">Any Rating</option>
                    <option value="4">⭐ 4.0 & Up</option>
                    <option value="4.5">⭐ 4.5 & Up</option>
                    <option value="4.8">⭐ 4.8 & Up</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Court Type</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-slate-950 text-xs text-slate-300 border border-slate-800 px-2.5 py-1.5 rounded-lg focus:border-emerald-500 outline-none w-full font-mono"
                  >
                    <option value="ALL">All Types</option>
                    <option value="Indoor">Indoor Only</option>
                    <option value="Outdoor">Outdoor Only</option>
                  </select>
                </div>
              </div>

              {/* Filter: Available Today (Requirement 5) */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availableToday"
                  checked={availableTodayFilter}
                  onChange={(e) => setAvailableTodayFilter(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border border-slate-800 text-emerald-500 rounded focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="availableToday" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                  Available Today Only
                </label>
              </div>
            </div>

            {/* List of active Turf Cards */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {activeTurfs.map((turf) => (
                <div
                  key={turf.id}
                  className="group bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex gap-4 hover:border-slate-700 transition-all shadow-lg text-left"
                >
                  <img
                    src={turf.image}
                    alt={turf.name}
                    className="w-24 h-24 object-cover rounded-xl border border-slate-800 shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-black text-emerald-400 uppercase tracking-wide border border-emerald-500/20">
                          {turf.sportsType || turf.sports || turf.sport}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-400 font-black text-[10px]">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {(turf.rating || 5).toFixed(1)}
                        </div>
                      </div>
                      
                      <h4 className="text-xs font-black text-white mt-1.5 group-hover:text-emerald-400 transition-colors truncate">{turf.name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{turf.address || turf.location}</p>
                      
                      {/* Open time & simulated distance */}
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400 font-mono">
                        <span>🕒 {turf.openTime || "06:00 AM - 10:00 PM"}</span>
                        <span>•</span>
                        <span>📍 {(Math.random() * 4 + 1).toFixed(1)} km away</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-2">
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        ${turf.pricePerHour || turf.price}/hr
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFocusOnTurfMap(turf)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-[9px] rounded-lg transition-all border border-slate-800 cursor-pointer"
                        >
                          View Map
                        </button>
                        <button
                          onClick={() => onBookNow(turf.id)}
                          className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-[9px] rounded-lg transition-all shadow shadow-emerald-500/10 hover:brightness-110 cursor-pointer"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {activeTurfs.length === 0 && (
                <div className="py-12 bg-slate-900/20 border border-slate-800/50 rounded-2xl text-center text-slate-500 text-xs font-mono">
                  No matching arenas found in this place.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Map Stage Frame */}
          <div id="map-anchor" className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl h-[560px] flex flex-col justify-between">
              
              {/* Map Info Header */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <MapIcon className="h-4 w-4 text-emerald-400 animate-pulse" />
                    Interactive Map Arena Stage
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {hasGoogleKey 
                      ? "⚡ Loaded successfully with Advanced Google Markers" 
                      : "💡 Displaying Leaflet Midnight map canvas fallback (OSM)"}
                  </p>
                </div>
                {isLoadingMap && <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />}
              </div>

              {/* Map Canvas Frame */}
              <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-800 bg-[#0d1527]">
                
                {gMapLoadError ? (
                  // Requirement 9 Map Initialization Error Display
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-3 z-10 bg-slate-950/90">
                    <AlertCircle className="h-10 w-10 text-rose-400" />
                    <h5 className="text-sm font-extrabold text-white">Unable to load the map. Please try again.</h5>
                    <p className="text-xs text-slate-400 max-w-xs">There was an unexpected token error initializing the Google Maps client libraries.</p>
                    <button 
                      onClick={() => setGMapLoadError(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Retry Rendering
                    </button>
                  </div>
                ) : hasGoogleKey ? (
                  // GOOGLE MAPS API INTEGRATION (Requirement 7)
                  <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
                    <GoogleMapComponent
                      defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }}
                      center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                      defaultZoom={mapZoom}
                      zoom={mapZoom}
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: "100%", height: "100%" }}
                    >
                      {activeTurfs.map((turf) => {
                        if (!turf.latitude || !turf.longitude) return null;
                        
                        return (
                          <AdvancedMarker
                            key={turf.id}
                            position={{ lat: turf.latitude, lng: turf.longitude }}
                            title={turf.name}
                            gmpClickable={true}
                            onClick={() => setActiveTurfPin(turf)}
                          >
                            <Pin 
                              background={turf.availability !== "FULLY_BOOKED" ? "#10b981" : "#f43f5e"} 
                              glyphColor="#fff" 
                              borderColor="#0f172a"
                            />
                          </AdvancedMarker>
                        );
                      })}

                      {/* Info Window (Requirement 7) */}
                      {activeTurfPin && activeTurfPin.latitude && activeTurfPin.longitude && (
                        <InfoWindow
                          position={{ lat: activeTurfPin.latitude, lng: activeTurfPin.longitude }}
                          onCloseClick={() => setActiveTurfPin(null)}
                        >
                          <div className="text-slate-950 p-2 font-sans w-52 space-y-2">
                            <img
                              src={activeTurfPin.image}
                              alt={activeTurfPin.name}
                              className="w-full h-24 object-cover rounded-lg border border-slate-100"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-black text-slate-800 uppercase">
                                {activeTurfPin.sportsType || activeTurfPin.sports || activeTurfPin.sport}
                              </span>
                              <h4 className="font-extrabold text-xs text-slate-900 mt-1.5 leading-tight">{activeTurfPin.name}</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">{activeTurfPin.address || activeTurfPin.location}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                              <span className="font-black text-emerald-600">
                                ${activeTurfPin.pricePerHour || activeTurfPin.price}/hr
                              </span>
                              <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                {(activeTurfPin.rating || 5).toFixed(1)}
                              </div>
                            </div>

                            <button
                              onClick={() => onBookNow(activeTurfPin.id)}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] py-1.5 rounded-lg transition-all text-center block mt-1"
                            >
                              Book Now
                            </button>
                          </div>
                        </InfoWindow>
                      )}
                    </GoogleMapComponent>
                  </APIProvider>
                ) : (
                  // LEAFLET MAP FALLBACK ENGINE (For instant offline operation in AI Studio preview)
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    className="w-full h-full z-0"
                    style={{ background: "#0b1329" }}
                  >
                    <ChangeLeafletMapView center={mapCenter} zoom={mapZoom} />
                    
                    {/* Dark CartoDB midnight themed tiles */}
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    {activeTurfs.map((turf) => {
                      if (!turf.latitude || !turf.longitude) return null;
                      return (
                        <Marker
                          key={turf.id}
                          position={[turf.latitude, turf.longitude]}
                          icon={createLeafletIcon(turf.sportsType || "FOOTBALL", turf.availability)}
                        >
                          <Popup>
                            <div className="text-slate-900 p-2 font-sans w-52 space-y-2">
                              <img
                                src={turf.image}
                                alt={turf.name}
                                className="w-full h-20 object-cover rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-black text-slate-800 uppercase">
                                  {turf.sportsType || turf.sports || turf.sport}
                                </span>
                                <h4 className="font-extrabold text-xs text-slate-950 mt-1 leading-tight">{turf.name}</h4>
                                <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">{turf.address || turf.location}</p>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[10px]">
                                <span className="font-bold text-emerald-600">
                                  ${turf.pricePerHour || turf.price}/hr
                                </span>
                                <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                  {(turf.rating || 5).toFixed(1)}
                                </div>
                              </div>

                              <button
                                onClick={() => onBookNow(turf.id)}
                                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-[10px] py-1.5 rounded-lg transition-all text-center block mt-1"
                              >
                                Book Now
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                )}
              </div>

              {/* Instructional info bar for first-class setup */}
              {!hasGoogleKey && (
                <div className="mt-3 bg-cyan-950/40 border border-cyan-800/30 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-cyan-300 leading-relaxed text-left">
                    <span className="font-extrabold">Active Offline Engine:</span> We are currently displaying OpenStreetMap tiles in AI Studio. 
                    To unlock premium Advanced Markers and full vector overlays, get a key from the Google Cloud Console and paste it into the 
                    <span className="font-bold"> GOOGLE_MAPS_PLATFORM_KEY</span> secrets config under Settings (⚙️).
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
