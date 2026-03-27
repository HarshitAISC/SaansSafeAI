import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Wind, 
  Map as MapIcon, 
  ShieldAlert, 
  Camera, 
  LayoutDashboard, 
  User as UserIcon,
  Bell,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  Loader2,
  Navigation,
  BrainCircuit,
  Database as DatabaseIcon,
  ThumbsUp,
  ThumbsDown,
  Video,
  Activity,
  ChevronRight
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Markdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Delhi Coordinates ---
const DELHI_CENTER: [number, number] = [28.6139, 77.2090];

// --- Components ---

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center overflow-hidden rounded-xl", className)}>
    <div className="absolute inset-0 logo-gradient opacity-20" />
    <div className="relative flex items-center justify-center gap-0.5">
      <div className="w-1.5 h-6 bg-[#0066cc] rounded-full transform -rotate-12" />
      <div className="w-1.5 h-8 bg-[#8cc63f] rounded-full" />
      <div className="w-1.5 h-6 bg-[#f15a24] rounded-full transform rotate-12" />
    </div>
  </div>
);

const Navbar = ({ activeTab, setActiveTab, role }: { activeTab: string, setActiveTab: (t: string) => void, role: string }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-r md:border-t-0">
    <div className="hidden md:flex mb-8 items-center justify-center">
      <Logo />
    </div>
    <NavItem icon={<MapIcon size={24} />} label="Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
    {role === 'citizen' ? (
      <>
        <NavItem icon={<Camera size={24} />} label="Report" active={activeTab === 'report'} onClick={() => setActiveTab('report')} />
        <NavItem icon={<BrainCircuit size={24} />} label="AI Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
      </>
    ) : (
      <>
        <NavItem icon={<LayoutDashboard size={24} />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
        <NavItem icon={<BrainCircuit size={24} />} label="Train" active={activeTab === 'calibrate'} onClick={() => setActiveTab('calibrate')} />
      </>
    )}
    <NavItem icon={<TrendingUp size={24} />} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
    <NavItem icon={<UserIcon size={24} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
  </nav>
);

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-colors",
      active ? "text-primary" : "text-zinc-400 hover:text-zinc-600"
    )}
  >
    {icon}
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);

const HeatmapLayer = ({ incidents, role }: { incidents: any[], role: string }) => {
  return (
    <>
      {incidents.map((inc) => {
        // Calculate color based on heat_score (0-100)
        const heat = inc.heat_score || 50;
        const color = heat > 80 ? '#ef4444' : heat > 50 ? '#f97316' : '#facc15';
        
        const lat = inc.location_lat ?? inc.lat;
        const lng = inc.location_lng ?? inc.lng;

        if (lat === undefined || lng === undefined) return null;

        // Heatmap effect: multiple overlapping circles with decreasing opacity
        return (
          <React.Fragment key={inc.id}>
            {/* Outer Glow */}
            <CircleMarker
              center={[lat, lng]}
              radius={25 + (heat / 4)}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.1,
                color: 'transparent',
                weight: 0
              }}
            />
            {/* Middle Layer */}
            <CircleMarker
              center={[lat, lng]}
              radius={15 + (heat / 5)}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.3,
                color: 'transparent',
                weight: 0
              }}
            />
            {/* Core */}
            <CircleMarker
              center={[lat, lng]}
              radius={8 + (heat / 10)}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.7,
                color: 'white',
                weight: 1
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 min-w-[150px]">
                  <p className="font-bold text-sm">Fire Detected</p>

                  {role === 'authority' && inc.image_url && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 mb-2">
                      <img 
                        src={inc.image_url} 
                        alt="Reported evidence" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400">Heat Score</span>
                    <span className="font-bold text-orange-600">{heat}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Source: {inc.source || 'Citizen'}</p>
                  <p className="text-[10px] text-zinc-400">{new Date(inc.timestamp).toLocaleString()}</p>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </>
  );
};

const HotspotLayer = ({ hotspots }: { hotspots: any[] }) => {
  return (
    <>
      {hotspots.map((spot, idx) => (
        <CircleMarker
          key={`hotspot-${idx}`}
          center={[spot.lat, spot.lng]}
          radius={30 + (spot.detection_count * 5)}
          pathOptions={{
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            color: '#ef4444',
            weight: 1,
            dashArray: '5, 10'
          }}
        >
          <Popup>
            <div className="p-2 space-y-1">
              <p className="font-bold text-sm text-red-600">Active Hotspot</p>
              <p className="text-[10px] text-zinc-500">This area has seen {spot.detection_count} detections in the last 24h.</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Avg Heat</span>
                <span className="text-xs font-bold text-red-600">{Math.round(spot.avg_heat_score)}%</span>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
};

const Onboarding = ({ onSetLocation }: { onSetLocation: (lat: number, lng: number) => void }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default to Delhi

  const MapCenterTracker = () => {
    const map = useMapEvents({
      move: () => {
        const center = map.getCenter();
        setMapCenter([center.lat, center.lng]);
      },
    });
    return null;
  };

  const handleUseGPS = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSetLocation(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        alert("Could not get your location. Please move the map to your location.");
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl space-y-6 text-center overflow-hidden"
      >
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Set Your Location</h2>
          <p className="text-zinc-500 text-sm">Move the map to place the pin on your neighborhood.</p>
        </div>

        <div className="relative h-64 w-full rounded-3xl overflow-hidden border-4 border-zinc-50 shadow-inner group">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapCenterTracker />
          </MapContainer>
          
          {/* Fixed Center Pin */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
            <div className="relative -top-4 transition-transform group-active:scale-110">
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/20 rounded-full blur-[2px]"></div>
              <MapPin size={40} className="text-red-500 fill-red-500/20 drop-shadow-lg" />
            </div>
          </div>

          <button 
            onClick={handleUseGPS}
            className="absolute bottom-4 right-4 z-[1000] p-3 bg-white rounded-2xl shadow-xl text-primary hover:bg-primary-light transition-colors"
          >
            {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
          </button>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => onSetLocation(mapCenter[0], mapCenter[1])}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            Confirm Location
          </button>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Lat: {mapCenter[0].toFixed(4)} • Lng: {mapCenter[1].toFixed(4)}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const AQIFeed = ({ userLocation, hotspots, onAqiChange }: { userLocation: { lat: number, lng: number } | null, hotspots: any[], onAqiChange?: (aqi: number) => void }) => {
  const [aqi, setAqi] = useState(145);
  
  useEffect(() => {
    if (!userLocation) return;
    
    // Simulate AQI based on distance to hotspots
    let impact = 0;
    hotspots.forEach(spot => {
      const dist = Math.sqrt(Math.pow(spot.lat - userLocation.lat, 2) + Math.pow(spot.lng - userLocation.lng, 2)) * 111; // Approx km
      if (dist < 5) impact += (5 - dist) * 20;
    });
    
    const finalAqi = Math.round(120 + impact + Math.random() * 10);
    setAqi(finalAqi);
    onAqiChange?.(finalAqi);
  }, [userLocation, hotspots, onAqiChange]);

  const getAQIInfo = (val: number) => {
    if (val <= 50) return { label: 'Good', color: 'bg-secondary', text: 'text-secondary', bg: 'bg-secondary-light' };
    if (val <= 100) return { label: 'Moderate', color: 'bg-accent', text: 'text-accent', bg: 'bg-accent-light' };
    if (val <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' };
    if (val <= 200) return { label: 'Unhealthy', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (val <= 300) return { label: 'Very Unhealthy', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' };
    return { label: 'Hazardous', color: 'bg-rose-900', text: 'text-rose-900', bg: 'bg-rose-50' };
  };

  const info = getAQIInfo(aqi);

  return (
    <div className={cn("p-6 rounded-3xl border transition-colors", info.bg, "border-zinc-100 shadow-sm space-y-4")}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Live Air Quality</h3>
          <p className={cn("text-xl font-bold", info.text)}>{info.label}</p>
        </div>
        <div className={cn("w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg", info.color)}>
          <span className="text-2xl font-bold leading-none">{aqi}</span>
          <span className="text-[8px] font-bold uppercase tracking-tighter">AQI</span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-200/50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((aqi / 300) * 100, 100)}%` }}
          className={cn("h-full", info.color)}
        />
      </div>
    </div>
  );
};

const AdvisorySection = ({ userLocation, hotspots, aqi }: { userLocation: { lat: number, lng: number } | null, hotspots: any[], aqi: number }) => {
  const [nearestDist, setNearestDist] = useState<number | null>(null);
  const [aiAdvice, setAiAdvice] = useState<{ title: string, risk: string, measures: string[] } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    if (!userLocation || hotspots.length === 0) return;
    
    const distances = hotspots.map(spot => {
      return Math.sqrt(Math.pow(spot.lat - userLocation.lat, 2) + Math.pow(spot.lng - userLocation.lng, 2)) * 111;
    });
    const min = Math.min(...distances);
    setNearestDist(min);

    // Fetch AI Advice when location or hotspots change significantly
    const fetchAiAdvice = async () => {
      setIsLoadingAi(true);
      try {
        const res = await fetch('/api/ai/pollution-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: userLocation.lat,
            lng: userLocation.lng,
            aqi,
            nearestHotspotDist: min
          })
        });
        const data = await res.json();
        setAiAdvice(data);
      } catch (err) {
        console.error("AI Advice fetch error:", err);
      } finally {
        setIsLoadingAi(false);
      }
    };

    fetchAiAdvice();
  }, [userLocation, hotspots, aqi]);

  const getAdvisory = () => {
    if (nearestDist === null) return { title: 'Scanning...', text: 'Analyzing nearby hotspots for safety advice.', icon: Loader2, iconProps: { className: "animate-spin" }, color: 'bg-zinc-100 text-zinc-600' };
    
    if (aiAdvice) {
      return {
        title: aiAdvice.title,
        text: aiAdvice.risk,
        icon: nearestDist < 5 ? AlertTriangle : ShieldCheck,
        iconProps: {},
        color: nearestDist < 2 ? 'bg-red-50 text-red-700 border-red-100' : 
               nearestDist < 5 ? 'bg-orange-50 text-orange-700 border-orange-100' : 
               'bg-emerald-50 text-emerald-700 border-emerald-100'
      };
    }

    if (nearestDist < 2) return { 
      title: 'Critical Advisory', 
      text: 'High fire activity detected within 2km. Keep all windows closed. Use air purifiers if available. Avoid any outdoor physical activity.', 
      icon: AlertTriangle,
      iconProps: {},
      color: 'bg-red-50 text-red-700 border-red-100' 
    };
    if (nearestDist < 5) return { 
      title: 'Health Warning', 
      text: 'Smoke plumes detected in your vicinity. Sensitive groups (children, elderly) should stay indoors. Wear an N95 mask if going outside.', 
      icon: ShieldAlert,
      iconProps: {},
      color: 'bg-orange-50 text-orange-700 border-orange-100' 
    };
    return { 
      title: 'Safe Zone', 
      text: 'No immediate fire threats detected within 5km. Air quality is within normal seasonal ranges for your area.', 
      icon: CheckCircle2,
      iconProps: {},
      color: 'bg-secondary-light text-secondary border-secondary-light' 
    };
  };

  const advice = getAdvisory();
  const Icon = advice.icon;

  return (
    <div className="space-y-4">
      <div className={cn("p-6 rounded-[32px] border space-y-4 shadow-sm transition-all duration-500", advice.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/50 rounded-xl">
              <Icon size={24} {...advice.iconProps} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">{advice.title}</h3>
          </div>
          {isLoadingAi && <Loader2 size={16} className="animate-spin opacity-50" />}
        </div>
        <div className="markdown-body text-sm leading-relaxed font-medium opacity-90">
          <Markdown>{advice.text}</Markdown>
        </div>
        
        {aiAdvice && aiAdvice.measures && (
          <div className="pt-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Precautionary Measures:</p>
            <div className="grid grid-cols-1 gap-2">
              {aiAdvice.measures.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-medium bg-white/30 p-2 rounded-xl">
                  <div className="mt-1 w-1 h-1 rounded-full bg-current shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}

        {nearestDist !== null && (
          <div className="pt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
            <Navigation size={10} />
            Nearest Hotspot: {nearestDist.toFixed(1)} km away
          </div>
        )}
      </div>
    </div>
  );
};

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-white/20 flex flex-col pointer-events-auto">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Current Time</span>
      <span className="text-xs font-mono font-bold text-zinc-900">
        {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {time.toLocaleTimeString()}
      </span>
    </div>
  );
};

const MapView = ({ incidents, onMapClick, timeframe, setTimeframe, role, hotspots }: { 
  incidents: any[], 
  onMapClick?: (lat: number, lng: number) => void,
  timeframe?: 'live' | 'previous_night',
  setTimeframe?: (t: 'live' | 'previous_night') => void,
  role: string,
  hotspots: any[]
}) => {
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  return (
    <div className="relative w-full h-full bg-zinc-100 overflow-hidden rounded-3xl border border-zinc-200 shadow-inner z-0">
      <MapContainer 
        center={DELHI_CENTER} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <HeatmapLayer incidents={incidents} role={role} />
        <HotspotLayer hotspots={hotspots} />
        <MapEvents />
      </MapContainer>

      <div className="absolute top-6 left-6 right-6 flex flex-col gap-4 pointer-events-none z-[1000]">
        <div className="flex items-start justify-between w-full">
          <Clock />
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 pointer-events-auto max-w-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full animate-pulse",
                timeframe === 'live' ? "bg-emerald-500" : "bg-blue-500"
              )} />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                {timeframe === 'live' ? 'Live Heatmap: Delhi' : 'Historical: Previous Night'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light tracking-tighter">{incidents.length}</span>
              <span className="text-sm font-medium text-orange-500">Hotspots</span>
            </div>
            
            {setTimeframe && (
              <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setTimeframe('live')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    timeframe === 'live' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  LIVE
                </button>
                <button 
                  onClick={() => setTimeframe('previous_night')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    timeframe === 'previous_night' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  PREV NIGHT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-24 left-6 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20 z-[1000] text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {timeframe === 'live' ? 'Click map to report incident' : 'Viewing historical data for MCD action'}
      </div>
    </div>
  );
};

const ReportView = ({ onReport, initialCoords }: { onReport: (data: any) => void, initialCoords?: { lat: number, lng: number } }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  });

  const handleSubmit = async () => {
    if (!preview) return;
    setIsVerifying(true);
    try {
      // Initialize Gemini on the frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        You are the core vision engine for SaansSafeAI, an advanced fire and smoke detection system.
        Your goal is to identify environmental hazards (fires, smoke, illegal burning) with extreme precision.

        ### DETECTION GUIDELINES:
        - **FIRE**: Look for orange, red, or yellow luminous cores. In CCTV/Citizen photos, this might appear as a bright spot or flickering area.
        - **SMOKE**: Look for plumes rising from a specific point. Smoke can be white (steam/light burning), grey, or thick black (chemical/tire burning).
        - **CONTEXT**: Differentiate between a fire and a sunset, street light, or car headlight. Fires have irregular shapes and often produce smoke.

        ### FEW-SHOT EXAMPLES:
        1. **Scenario**: A small pile of leaves burning in a park.
           **Response**: { "detected": true, "type": "fire", "confidence": 0.95, "intensity": "low", "density": "medium", "heat_score": 30, "description": "Small localized fire detected in a residential area, likely leaf burning." }
        2. **Scenario**: Thick black smoke rising from an industrial chimney.
           **Response**: { "detected": true, "type": "smoke", "confidence": 0.98, "intensity": "high", "density": "high", "heat_score": 60, "description": "Heavy industrial smoke emission detected." }
        3. **Scenario**: A bright orange sunset behind a building.
           **Response**: { "detected": false, "type": "none", "confidence": 0.99, "intensity": "none", "density": "none", "heat_score": 0, "description": "No fire detected. The orange glow is consistent with a sunset." }

        ### TASK:
        Analyze the provided image. Be highly sensitive to small or distant fires. If you are unsure but there is a strong indication of smoke, mark as detected with lower confidence.

        Return a JSON object with:
        {
          "detected": boolean,
          "type": "fire" | "smoke" | "both" | "none",
          "confidence": number (0-1),
          "intensity": "low" | "medium" | "high",
          "density": "low" | "medium" | "high",
          "heat_score": number (0-100),
          "description": "Detailed reasoning for your detection."
        }
      `;

      // Extract MIME type and data from base64 string
      const mimeTypeMatch = preview.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = preview.includes(",") ? preview.split(",")[1] : preview;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("AI model failed to generate a response");
      }

      const text = response.text || "{}";
      const aiResult = JSON.parse(text);

      // Now send the verified result to the backend to save
      const lat = initialCoords?.lat || 28.6139 + (Math.random() - 0.5) * 0.1;
      const lng = initialCoords?.lng || 77.2090 + (Math.random() - 0.5) * 0.1;

      const saveRes = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_123',
          lat,
          lng,
          result: aiResult,
          image_url: preview
        })
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save report to database");
      }

      setResult(aiResult);
    } catch (err) {
      console.error(err);
      setResult({ 
        detected: false, 
        description: err instanceof Error ? err.message : "An unexpected error occurred. Please try again." 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-light tracking-tight">Report Incident</h2>
        <p className="text-zinc-500 text-sm">Help us identify open fires and garbage burning in your area.</p>
        {initialCoords && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary-light px-3 py-1 rounded-full w-fit">
            <MapPin size={10} />
            LOCATION TAGGED: {initialCoords.lat.toFixed(4)}, {initialCoords.lng.toFixed(4)}
          </div>
        )}
      </div>

      {!result ? (
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={cn(
              "aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
              preview ? "border-primary bg-primary-light" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50"
            )}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto">
                  <Camera className="text-zinc-400" size={32} />
                </div>
                <p className="text-sm font-medium text-zinc-600">Tap to take photo or drag & drop</p>
              </div>
            )}
          </div>

          <button
            disabled={!file || isVerifying}
            onClick={handleSubmit}
            className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isVerifying ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                AI Verifying...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl space-y-6 text-center"
        >
          {result.detected ? (
            <>
              <div className="w-20 h-20 bg-secondary-light text-secondary rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Verified!</h3>
                <div className="markdown-body text-zinc-500">
                  <Markdown>{result.description}</Markdown>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-zinc-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">Intensity</span>
                  <span className="font-bold text-accent uppercase">{result.intensity}</span>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">Confidence</span>
                  <span className="font-bold text-secondary">{Math.round(result.confidence * 100)}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
                <X size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">No Fire Detected</h3>
                <p className="text-zinc-500">Our AI couldn't find any pollution sources in this image.</p>
              </div>
            </>
          )}
          <button 
            onClick={() => { 
              if (result.detected) onReport(result);
              setResult(null); 
              setFile(null); 
              setPreview(null); 
            }}
            className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-semibold"
          >
            Done
          </button>
        </motion.div>
      )}
    </div>
  );
};

const ChatView = ({ userLocation, aqi }: { userLocation: { lat: number, lng: number } | null, aqi: number }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hello! I'm your SaansSafe AI assistant. How can I help you stay safe today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What are the best masks for smoke?",
    "How to protect my kids from poor AQI?",
    "Is it safe to exercise outdoors today?",
    "What should I do if I see a fire?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMessage: { role: 'user' | 'ai', content: string } = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";
      
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: `You are SaansSafe AI, a health and safety assistant for residents of Delhi. 
          Current User Location: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : 'Unknown'}. 
          Current AQI: ${aqi}.
          Provide practical, empathetic, and scientifically accurate advice about air pollution, fire safety, and respiratory health. 
          Format your response clearly using markdown:
          - Use bullet points for lists.
          - Use bold text for emphasis.
          - Use headers for sections.
          - Ensure proper spacing between paragraphs.
          - Avoid long blocks of text; use short paragraphs and lists for readability.`
        }
      });

      const response = await chat.sendMessage({ message: text });
      const aiMessage: { role: 'user' | 'ai', content: string } = { role: 'ai', content: response.text || "I'm sorry, I couldn't process that." };
      setMessages([...newMessages, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: { role: 'user' | 'ai', content: string } = { role: 'ai', content: "I'm having trouble connecting right now. Please try again later." };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col p-4 md:p-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-light tracking-tight">AI Safety Assistant</h2>
        <p className="text-zinc-500 text-sm">Personalized advice based on your local air quality.</p>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-white rounded-[32px] border border-zinc-100 shadow-inner min-h-0"
      >
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex",
            m.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-zinc-100 text-zinc-800 rounded-tl-none"
            )}>
              <div className="markdown-body">
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="animate-spin text-zinc-400" size={20} />
            </div>
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {suggestions.map((s, i) => (
            <button 
              key={i}
              onClick={() => handleSend(s)}
              className="text-left p-3 text-xs font-medium bg-primary-light text-primary rounded-xl hover:bg-primary/10 transition-colors border border-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Ask about safety measures..."
          className="flex-1 bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button 
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isLoading}
          className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
        >
          <TrendingUp className="rotate-90" size={20} />
        </button>
      </div>
    </div>
  );
};

const StatsView = () => {
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/predictive-model')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => setPredictions(data))
      .catch(err => console.error('Error fetching predictions:', err));
  }, []);

  const data = [
    { name: 'Mon', fires: 12, aqi: 140 },
    { name: 'Tue', fires: 19, aqi: 165 },
    { name: 'Wed', fires: 15, aqi: 155 },
    { name: 'Thu', fires: 22, aqi: 190 },
    { name: 'Fri', fires: 30, aqi: 210 },
    { name: 'Sat', fires: 25, aqi: 180 },
    { name: 'Sun', fires: 18, aqi: 150 },
  ];

  return (
    <div className="p-6 space-y-8 pb-24 md:pb-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-light tracking-tight">Pollution Analytics</h2>
        <p className="text-zinc-500 text-sm">Weekly trends of fire incidents and air quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ... existing charts ... */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Fire Incidents</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorFires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="fires" stroke="#f15a24" fillOpacity={1} fill="url(#colorFires)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">AQI Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="aqi" stroke="#8cc63f" strokeWidth={3} dot={{ r: 4, fill: '#8cc63f', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">AI Pollution Predictions (Next 3h)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predictions.map((pred, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase",
                  pred.probability > 0.7 ? "bg-red-100 text-red-600" : "bg-accent-light text-accent"
                )}>
                  {pred.probability > 0.7 ? 'High Risk' : 'Moderate Risk'}
                </div>
                <span className="text-xl font-bold">{Math.round(pred.probability * 100)}%</span>
              </div>
              <p className="text-xs text-zinc-600 font-medium">{pred.reason}</p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                <MapPin size={10} />
                <span>{pred.lat.toFixed(3)}, {pred.lng.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 text-white p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Community Impact</h3>
            <p className="text-zinc-400 text-sm">Your reports helped reduce pollution by 12% this month.</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <TrendingUp className="text-secondary" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-2xl font-bold">1,240</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Reports</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold">842</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Resolved</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold">4.2t</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">CO2 Saved</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CalibrationView = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<string[]>([]);

  const mockDetections = [
    { id: 1, type: 'fire', confidence: 0.82, image: 'https://picsum.photos/seed/fire1/400/300', description: 'Small fire detected in residential backyard.' },
    { id: 2, type: 'smoke', confidence: 0.65, image: 'https://picsum.photos/seed/smoke1/400/300', description: 'Faint grey smoke rising from industrial area.' },
    { id: 3, type: 'none', confidence: 0.91, image: 'https://picsum.photos/seed/sunset1/400/300', description: 'No fire detected. Sunset detected.' },
  ];

  const handleFeedback = (id: number, type: 'up' | 'down') => {
    setFeedbackGiven(prev => [...prev, `${id}-${type}`]);
  };

  const startTraining = () => {
    setIsTraining(true);
    setTimeout(() => setIsTraining(false), 3000);
  };

  return (
    <div className="p-6 space-y-8 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-light tracking-tight">AI Model Calibration</h2>
          <p className="text-zinc-500 text-sm">Fine-tune the vision engine using verified CCTV datasets.</p>
        </div>
        <button 
          onClick={startTraining}
          disabled={isTraining || feedbackGiven.length === 0}
          className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isTraining ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
          {isTraining ? 'Optimizing Weights...' : 'Apply Calibration'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-secondary-light border border-secondary-light p-6 rounded-3xl space-y-2">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Model Accuracy</p>
          <p className="text-4xl font-light">94.2%</p>
          <p className="text-xs text-secondary-light">+1.2% from last calibration</p>
        </div>
        <div className="bg-primary-light border border-primary-light p-6 rounded-3xl space-y-2">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Dataset Size</p>
          <p className="text-4xl font-light">12.4k</p>
          <p className="text-xs text-primary">Verified fire/smoke images</p>
        </div>
        <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Active Feedback</p>
          <p className="text-4xl font-light">{feedbackGiven.length}</p>
          <p className="text-xs text-zinc-500">Pending optimization</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Recent AI Detections for Review</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockDetections.map((det) => (
            <div key={det.id} className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-video relative">
                <img src={det.image} alt="Detection" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
                  CONFIDENCE: {Math.round(det.confidence * 100)}%
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">AI Prediction</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      det.type === 'fire' ? "bg-red-100 text-red-600" : det.type === 'smoke' ? "bg-blue-100 text-blue-600" : "bg-zinc-100 text-zinc-600"
                    )}>
                      {det.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">{det.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleFeedback(det.id, 'up')}
                    disabled={feedbackGiven.includes(`${det.id}-up`) || feedbackGiven.includes(`${det.id}-down`)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all",
                      feedbackGiven.includes(`${det.id}-up`) ? "bg-secondary border-secondary text-white" : "border-zinc-200 text-zinc-400 hover:border-secondary hover:text-secondary"
                    )}
                  >
                    <ThumbsUp size={16} />
                    <span className="text-[10px] font-bold uppercase">Correct</span>
                  </button>
                  <button 
                    onClick={() => handleFeedback(det.id, 'down')}
                    disabled={feedbackGiven.includes(`${det.id}-up`) || feedbackGiven.includes(`${det.id}-down`)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all",
                      feedbackGiven.includes(`${det.id}-down`) ? "bg-red-500 border-red-500 text-white" : "border-zinc-200 text-zinc-400 hover:border-red-500 hover:text-red-500"
                    )}
                  >
                    <ThumbsDown size={16} />
                    <span className="text-[10px] font-bold uppercase">Incorrect</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 text-white p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <DatabaseIcon className="text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Bulk Dataset Training</h3>
            <p className="text-zinc-400 text-sm">Upload a folder of CCTV images to batch-train the vision engine.</p>
          </div>
        </div>
        <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-zinc-500">Drag and drop .zip or .tar datasets here</p>
          <button className="px-6 py-2 bg-white text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-widest">
            Select Files
          </button>
        </div>
      </div>
    </div>
  );
};

const CCTVMonitor = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [currentCameraIdx, setCurrentCameraIdx] = useState(0);

  useEffect(() => {
    fetch('/api/cameras')
      .then(res => res.json())
      .then(data => setCameras(data));
  }, []);

  const runAIAnalysis = async (camera: any) => {
    try {
      setAnalysisLog(prev => [`[${new Date().toLocaleTimeString()}] Analyzing ${camera.name}...`, ...prev.slice(0, 9)]);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

      // Simulate capturing a frame from the CCTV stream
      const imageUrl = `https://picsum.photos/seed/${camera.id}_${Date.now()}/800/600`;
      const imageResp = await fetch(imageUrl);
      const blob = await imageResp.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      const base64Data = await base64Promise;
      const data = base64Data.split(',')[1];

      const prompt = "Analyze this CCTV frame for any signs of fire or smoke. Return JSON: { detected: boolean, confidence: number, intensity: 'low'|'medium'|'high', description: string }";
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data } }
          ]
        }],
        config: { responseMimeType: "application/json" }
      });

      const analysis = JSON.parse(result.text || "{}");
      
      if (analysis.detected) {
        setAnalysisLog(prev => [`[ALERT] Fire detected at ${camera.name}! Confidence: ${Math.round(analysis.confidence * 100)}%`, ...prev.slice(0, 9)]);
        
        // Save to backend
        await fetch('/api/reports/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'system_cctv',
            lat: camera.location_lat,
            lng: camera.location_lng,
            image_url: imageUrl,
            result: {
              ...analysis,
              heat_score: Math.floor(analysis.confidence * 100)
            }
          })
        });
      } else {
        setAnalysisLog(prev => [`[OK] No fire detected at ${camera.name}.`, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error("CCTV AI Error:", error);
      setAnalysisLog(prev => [`[ERROR] AI analysis failed for ${camera.name}`, ...prev.slice(0, 9)]);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isMonitoring && cameras.length > 0) {
      interval = setInterval(() => {
        const cam = cameras[currentCameraIdx];
        runAIAnalysis(cam);
        setCurrentCameraIdx((prev) => (prev + 1) % cameras.length);
      }, 15000); // Analyze every 15 seconds
    }
    return () => clearInterval(interval);
  }, [isMonitoring, cameras, currentCameraIdx]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <Video size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">CCTV AI Monitor</h3>
            <p className="text-[10px] text-zinc-400">Real-time surveillance analysis</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
            isMonitoring ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          )}
        >
          {isMonitoring ? "Stop Monitoring" : "Start AI Surveillance"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Active Streams ({cameras.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {cameras.map((cam, idx) => (
              <div key={cam.id} className={cn(
                "p-3 rounded-2xl border transition-all flex items-center justify-between",
                idx === currentCameraIdx && isMonitoring ? "bg-emerald-50 border-emerald-100" : "bg-zinc-50 border-zinc-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    idx === currentCameraIdx && isMonitoring ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                  )} />
                  <span className="text-xs font-medium text-zinc-700">{cam.name}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">{cam.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">AI Analysis Log</h4>
          <div className="bg-zinc-900 rounded-2xl p-4 h-60 overflow-y-auto font-mono text-[10px] space-y-2">
            {analysisLog.length === 0 && <p className="text-zinc-600 italic">Waiting for surveillance to start...</p>}
            {analysisLog.map((log, i) => (
              <p key={i} className={cn(
                "leading-relaxed",
                log.includes('[ALERT]') ? "text-red-400 font-bold" : 
                log.includes('[ERROR]') ? "text-orange-400" : 
                log.includes('[OK]') ? "text-emerald-400" : "text-zinc-400"
              )}>
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ incidents, hotspots }: { incidents: any[], hotspots: any[] }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [view, setView] = useState<'surveillance' | 'data'>('surveillance');
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs/daily');
      const data = await res.json();
      setDailyLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (view === 'data') {
      fetchLogs();
    }
  }, [view]);

  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // Simulate multiple camera detections
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      await fetch('/api/simulate/camera', { method: 'POST' }).catch(err => console.error('Error simulating camera:', err));
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-light tracking-tight">Authority Dashboard</h2>
          <div className="flex bg-zinc-100 p-1 rounded-xl w-fit gap-1">
            <button 
              onClick={() => setView('surveillance')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                view === 'surveillance' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Surveillance
            </button>
            <button 
              onClick={() => setView('data')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                view === 'data' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Data View
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          {view === 'surveillance' ? (
            <>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/simulate/nightly-cv', { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to run nightly CV');
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to run nightly CV analysis');
                  }
                }}
                className="px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Camera size={18} />
                Run Nightly CV Analysis
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/simulate/seed', { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to seed data');
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to seed historical data');
                  }
                }}
                className="px-4 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <TrendingUp size={18} />
                Seed Historical Data
              </button>
              <button 
                onClick={startScan}
                disabled={isScanning}
                className="px-6 py-3 bg-secondary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-secondary-light disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                {isScanning ? 'Scanning Feeds...' : 'Scan Network'}
              </button>
            </>
          ) : (
            <button 
              onClick={fetchLogs}
              className="px-4 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg"
            >
              <Activity size={18} />
              Refresh Logs
            </button>
          )}
          <button className="p-3 bg-zinc-100 rounded-2xl relative">
            <Bell size={24} className="text-zinc-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </div>

      {view === 'surveillance' ? (
        <>
          {isScanning && (
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${scanProgress}%` }}
          />
        </div>
      )}

      <CCTVMonitor />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[500px]">
            <MapView incidents={incidents} role="authority" hotspots={hotspots} />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Live Camera Detections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.filter(i => i.source === 'camera').slice(0, 4).map((inc) => (
                <div key={inc.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                  <div className="aspect-video bg-zinc-100 rounded-xl overflow-hidden relative">
                    <img 
                      src={`https://picsum.photos/seed/${inc.id}/400/225`} 
                      alt="CCTV Feed" 
                      className="w-full h-full object-cover opacity-80"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE: CAM_{inc.id.substring(0, 4).toUpperCase()}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-900">Heat Score: {inc.heat_score}</p>
                      <p className="text-[10px] text-zinc-400">Lat: {inc.location_lat?.toFixed(4)}, Lng: {inc.location_lng?.toFixed(4)}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      inc.heat_score > 70 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                    )}>
                      {inc.heat_score > 70 ? 'CRITICAL' : 'WARNING'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 text-white p-6 rounded-3xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">System Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">AI Model Status</span>
                <span className="text-xs text-secondary font-bold">OPTIMAL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Camera Uptime</span>
                <span className="text-xs text-secondary font-bold">98.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Processing Latency</span>
                <span className="text-xs text-zinc-200 font-bold">140ms</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">API Integration</h3>
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Feed external CCTV or sensor data into the SAANSSAFE AI pipeline using our REST API.
              </p>
              <div className="bg-zinc-900 p-4 rounded-2xl overflow-x-auto">
                <code className="text-[10px] text-secondary font-mono whitespace-pre">
{`# Report a verified fire incident
curl -X POST ${window.location.origin}/api/simulate/camera \\
  -H "Content-Type: application/json" \\
  -d '{
    "lat": 28.6139,
    "lng": 77.2090,
    "heat_score": 85
  }'`}
                </code>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 italic">
                <ShieldAlert size={12} />
                <span>Requires Authority API Key in production</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">MCD Nightly Summary</h3>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <TrendingUp size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Previous Night Analysis</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-600 font-medium">Total Detections</p>
                  <p className="text-2xl font-bold text-blue-900">42</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-600 font-medium">Critical Zones</p>
                  <p className="text-2xl font-bold text-blue-900">08</p>
                </div>
              </div>
              <p className="text-[10px] text-blue-500 leading-relaxed">
                Most incidents occurred between 1 AM - 3 AM in North-West Delhi. Recommended deployment: Zone 4 & 7.
              </p>
              <button className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Download MCD Report
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Hotspot Analysis</h3>
            <div className="space-y-4">
              {incidents.slice(0, 3).map((inc, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-400">
                    0{idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Zone {idx + 1}</span>
                      <span className="text-orange-600 font-bold">{inc.heat_score}% Heat</span>
                    </div>
                    <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${inc.heat_score}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Daily Fire Logs</h3>
        <div className="text-[10px] text-zinc-400 font-mono">
          Total Records: {dailyLogs.length}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date/Time</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Location</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intensity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoadingLogs ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Loading logs...</td>
              </tr>
            ) : dailyLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">No logs found.</td>
              </tr>
            ) : (
              dailyLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-zinc-900">{log.date}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{log.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-zinc-700">{log.place_name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{log.lat.toFixed(4)}, {log.lng.toFixed(4)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      log.source === 'camera' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {log.source}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "text-xs font-bold",
                      log.intensity === 'high' ? "text-red-600" : "text-orange-600"
                    )}>
                      {log.intensity.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log.image_url && log.image_url !== 'uploaded_image' ? (
                      <a 
                        href={log.image_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        VIEW IMAGE <ChevronRight size={10} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-300 italic">No Image</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}
</div>
);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [role, setRole] = useState<'citizen' | 'authority'>('citizen');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'live' | 'previous_night'>('live');
  const [aqi, setAqi] = useState(145);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(() => {
    const saved = localStorage.getItem('user_location');
    return saved ? JSON.parse(saved) : null;
  });
  const [showOnboarding, setShowOnboarding] = useState(!userLocation);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Fetch incidents based on timeframe
    fetch(`/api/incidents?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => setIncidents(data))
      .catch(err => console.error('Error fetching incidents:', err));

    // Fetch hotspots
    const fetchHotspots = () => {
      fetch('/api/hotspots')
        .then(res => res.json())
        .then(data => setHotspots(data))
        .catch(err => console.error('Error fetching hotspots:', err));
    };
    fetchHotspots();
    const hotspotInterval = setInterval(fetchHotspots, 60000);

    // Socket setup
    socketRef.current = io();
    socketRef.current.on('new_incident', (incident) => {
      if (timeframe === 'live') {
        setIncidents(prev => [incident, ...prev]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
      clearInterval(hotspotInterval);
    };
  }, [role, timeframe]);

  const saveLocation = (lat: number, lng: number) => {
    const loc = { lat, lng };
    setUserLocation(loc);
    localStorage.setItem('user_location', JSON.stringify(loc));
    setShowOnboarding(false);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (showOnboarding) {
      saveLocation(lat, lng);
      return;
    }
    if (role === 'citizen' && timeframe === 'live') {
      setSelectedCoords({ lat, lng });
      setActiveTab('report');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-primary-light selection:text-primary">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} role={role} />
      
      <main className="md:ml-20 h-screen overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'map' && (
              <div className="h-full p-4 md:p-8 space-y-6">
                <div className="h-[500px]">
                  <MapView 
                    incidents={incidents} 
                    onMapClick={handleMapClick} 
                    timeframe={timeframe}
                    setTimeframe={setTimeframe}
                    role={role}
                    hotspots={hotspots}
                  />
                </div>
                {role === 'citizen' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24 md:pb-0">
                    <AQIFeed userLocation={userLocation} hotspots={hotspots} onAqiChange={setAqi} />
                    <AdvisorySection userLocation={userLocation} hotspots={hotspots} aqi={aqi} />
                  </div>
                )}
              </div>
            )}
            {activeTab === 'report' && (
              <ReportView 
                onReport={() => { 
                  setTimeframe('live');
                  setActiveTab('map'); 
                  setSelectedCoords(null); 
                }} 
                initialCoords={selectedCoords || undefined} 
              />
            )}
            {activeTab === 'stats' && <StatsView />}
            {activeTab === 'chat' && role === 'citizen' && (
              <ChatView userLocation={userLocation} aqi={aqi} />
            )}
            {activeTab === 'admin' && <AdminView incidents={incidents} hotspots={hotspots} />}
            {activeTab === 'calibrate' && role === 'authority' && (
              <CalibrationView />
            )}
            {activeTab === 'profile' && (
              <div className="max-w-md mx-auto p-8 space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-zinc-200 rounded-3xl flex items-center justify-center">
                    <UserIcon size={48} className="text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Harshit Sharma</h2>
                    <p className="text-zinc-500 text-sm">Citizen Responder • Level 4</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-500">Your Impact Points</span>
                    <span className="text-2xl font-bold text-primary">1,450</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Next Rank: Guardian</span>
                      <span>85%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[85%]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Settings</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setRole(role === 'citizen' ? 'authority' : 'citizen')}
                      className="w-full p-4 bg-white rounded-2xl border border-zinc-100 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                    >
                      <span className="font-medium">Switch to {role === 'citizen' ? 'Authority' : 'Citizen'} View</span>
                      <ShieldAlert size={20} className="text-zinc-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {showOnboarding && <Onboarding onSetLocation={saveLocation} />}

      {/* Global Alert Overlay */}
      <AnimatePresence>
        {incidents.length > 0 && activeTab !== 'admin' && !dismissedAlerts.has(incidents[0].id) && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-6 right-6 z-[60] max-w-xs"
          >
            <div className="bg-orange-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <AlertTriangle className="shrink-0" size={20} />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Emergency Alert</p>
                <p className="text-sm font-medium">New fire detected within 2km of your location.</p>
              </div>
              <button 
                onClick={() => setDismissedAlerts(prev => new Set(prev).add(incidents[0].id))}
                className="text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
