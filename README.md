# Kolkata Puja Navigator (Puja Path) ✿

A complete, map-based Durga Puja pandal discovery and Kolkata Metro navigation platform built with **React + Vite + TypeScript**, **MapLibre GL JS**, **OpenFreeMap vector tiles** (powered by **OpenMapTiles**), and **OpenStreetMap**.

---

## 🌟 Key Features

### 1. Vector Map with OpenFreeMap & OpenMapTiles
- **OpenStreetMap Data**: Comprehensive, up-to-date Kolkata street grid, landmarks, and waterways.
- **OpenFreeMap Vector Tiles**: High-performance, razor-sharp vector tile rendering with the documented **Liberty** style (`https://tiles.openfreemap.org/styles/liberty`).
- **Interactive Style Selector**: Switch on-the-fly between **Liberty**, **Bright**, and **Positron (Light)** styles.
- **Custom Glowing Pandal Markers**: Line-coded and categorized (Traditional Sabeki, Contemporary Theme, Heritage Bonedi Bari, Landmark).
- **Kolkata Metro Markers**: Distinct line colorings for **Blue Line**, **Green Line**, **Purple Line**, and **Orange Line**.
- **Interactive Layer Toggles**: Pandals, Metro Stops, and Walking Route Polylines.
- **Dynamic Popups & Highlight States**: Instant fly-to animation when selecting pandals or stations.
- **Full Attribution**: Complies with OpenFreeMap, OpenMapTiles, and OpenStreetMap attribution standards.

### 2. Floating Locate Me Integration
- Dedicated **"Locate Me"** control on the map.
- Requests real browser geolocation permissions (no fabricated coordinates).
- Smoothly flies to and centers on the user's real location with camera animation.
- Displays a blue pulsating radar dot and a translucent accuracy circle sized to the device's GPS accuracy radius.
- Automatically calculates and reports nearby pandals and Metro stations within 1.5 km walking distance.
- Clear, descriptive error messages if permission is denied, timed out, or unavailable.

### 3. Kolkata Metro-Based Pandal Directory
- **70+ Deduplicated, Geocoded Pandals** organized by nearest accessible Metro station across:
  - **North Kolkata**: Shyambazar, Shobhabazar-Sutanuti, Girish Park, Belgachia, Noapara, Dum Dum.
  - **Central Kolkata**: MG Road, Central, Chandni Chowk, Esplanade, Sealdah.
  - **South Kolkata**: Jatin Das Park, Kalighat, Rabindra Sarobar, Mahanayak Uttam Kumar, Netaji (Kudghat), Masterda Surya Sen, Gitanjali, Kavi Nazrul, Shahid Khudiram, Kavi Subhash.
  - **Salt Lake & East**: City Centre, Central Park, Karunamoyee, Salt Lake Sector V.
  - **South-West**: Bhowanipore, Behala (Taratala, Behala Bazar), Kidderpore.
- **Accurate Metadata for Every Record**:
  - Bengali script name (`বাংলা নাম`)
  - Verified latitude and longitude
  - Nearest accessible Metro station & alternative nearby stations
  - Actual walking distance (meters) and estimated walking time (minutes)
  - Annual theme & cultural history
  - Verification record link and last verified timestamp

### 4. Multi-Faceted Search & Filters
- **Instant Search**: Debounced search across English names, Bengali script, neighbourhoods, and Metro stations (`Ctrl+K` / `⌘K` shortcut).
- **Metro Line Pills**: Filter instantly by Blue, Green, Purple, or Orange Line.
- **Station Selector**: View only pandals within walking distance of any selected station.
- **Zone Filter**: North, Central, South, Salt Lake / East, South-West.
- **Category Filter**: Traditional, Theme, Heritage Rajbari, Contemporary Landmark.
- **Walking Distance Filter**: Within 500m, 1km, 2km, or any.
- **GPS Verification Filter**: Toggle verified GPS pins.

### 5. Pandal Spotlight & Details Drawer
- High-resolution photograph / banner and theme overview.
- Exact map coordinates with one-click "Center on Map".
- Nearest Metro card with line badge, walking distance, and walking time.
- Direct **Google Maps Walking Directions** link with exact GPS coordinates.
- **"Draw Walking Route from Nearest Metro"** button for immediate in-app navigation.
- **"Add to Hopping Route"** and **Favorites / Bookmarking**.

### 6. Pandal-Hopping Route Planner
- Build a custom multi-stop tour starting from any Metro station or your **live GPS location**.
- Reorder stops manually (Up/Down) or click **"Optimize Order"** (uses Traveling Salesperson Problem / Nearest-Neighbor heuristic to minimize walking distance).
- Fetches real pedestrian walking geometry via **OSRM Foot Routing** (with geodesic urban grid fallback).
- Turn-by-turn leg instructions and total estimated walking time.
- **Smart Metro Transfer Advice**: Automatically suggests taking Kolkata Metro when hopping between distant zones (e.g. North to South Kolkata).
- **Share & Export**: Copy shareable itinerary summary to clipboard or open entire route in Google Maps.

### 7. Contributor & Admin Portal
- Missing GPS coordinates audit list.
- Normalized name duplicate detection.
- Add new pandals with validation for Kolkata coordinates.
- Export entire directory as structured JSON.
- Reset to verified default seed catalogue.

---

## 🚀 Running Locally

### Start Development Server
```sh
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Build Production Bundle
```sh
npm run build
```

---

## 🗺️ Map Configuration & Endpoints

| Setting | Value / Documentation |
| :--- | :--- |
| **Mapping Engine** | [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) (`maplibre-gl`) |
| **Vector Style URL** | `https://tiles.openfreemap.org/styles/liberty` (OpenFreeMap Liberty) |
| **Alternate Styles** | `https://tiles.openfreemap.org/styles/bright`, `https://tiles.openfreemap.org/styles/positron` |
| **Schema & Vector Spec** | [OpenMapTiles](https://openmaptiles.org/) |
| **Geographic Data** | [OpenStreetMap](https://www.openstreetmap.org/) contributors |
| **Environment Variable** | `VITE_MAP_STYLE_URL` (optional, defaults to OpenFreeMap Liberty) |

---

## 📁 Project Architecture

```
FindPujo/
├── src/
│   ├── types.ts                  # TypeScript types for Pandals, Stations, Routes, Filters
│   ├── data/
│   │   ├── metroLines.ts         # Blue, Green, Purple, Orange line definitions & colors
│   │   ├── metroStations.ts      # Complete Kolkata Metro station database with coordinates
│   │   └── pandals.ts            # Directory of 70+ Kolkata pandals with verified coordinates & themes
│   ├── services/
│   │   ├── routingService.ts     # OSRM pedestrian routing, TSP optimization & Google Maps generator
│   │   └── storageService.ts     # LocalStorage persistence for favorites, routes & admin edits
│   ├── components/
│   │   ├── Icons.tsx             # Vector SVG icon library
│   │   ├── Header.tsx            # Sticky topbar with brand, search & navigation tabs
│   │   ├── FilterBar.tsx         # Multi-criteria filter controls & reset
│   │   ├── PandalCard.tsx        # Directory list card with badges & quick actions
│   │   ├── PandalDetails.tsx     # Spotlight panel with photo, walk times & directions
│   │   ├── MetroStationList.tsx  # Station hubs grouped by line with pandal counts
│   │   ├── RoutePlanner.tsx      # Multi-stop itinerary planner with OSRM foot routing
│   │   ├── AdminModal.tsx        # Audit, duplicate detection, new entry & JSON export
│   │   ├── MapLibreMap.tsx       # MapLibre GL JS vector map with OpenFreeMap Liberty tiles & Locate Me
│   │   ├── LeafletMap.tsx        # Preserved Leaflet map component
│   │   └── BottomSheet.tsx       # Mobile-first expandable drawer
│   ├── style.css                 # Warm ivory, deep maroon & gold design system
│   └── main.tsx                  # Root application entry point
├── index.html                    # HTML shell with Google Fonts
├── vite.config.js                # Vite configuration
└── package.json                  # Dependencies & scripts
```
