
import React from 'react';
import { MapPin, Navigation, Mountain } from 'lucide-react';
import { Scenario } from '../types';

interface MapPanelProps {
  scenario: Scenario | null;
}

export const MapPanel: React.FC<MapPanelProps> = ({ scenario }) => {
  if (!scenario) {
    return (
      <div className="h-full w-full bg-stone-200 flex items-center justify-center text-stone-400">
        <div className="text-center">
          <Mountain className="w-16 h-16 mx-auto mb-2 opacity-50" />
          <p>Awaiting Mission Coordinates</p>
        </div>
      </div>
    );
  }

  const { location, environment, theme } = scenario;
  const isNight = theme === 'night';
  const isHeat = theme === 'heat';

  return (
    <div className="h-full w-full bg-stone-100 flex flex-col relative overflow-hidden border-b md:border-b-0 md:border-l border-stone-200 shadow-inner">
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-lg shadow-sm border border-stone-200 max-w-[70%]">
            <h3 className="font-bold text-stone-800 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500" />
                {location.name}
            </h3>
            <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider font-semibold">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
            <div className="mt-2 text-[10px] grid grid-cols-1 gap-y-1 text-stone-600">
                <span>Safe Zone: {environment.distanceFromSafety}</span>
                <span>Signal: {environment.signalStrength}</span>
            </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-lg shadow-sm border border-stone-200">
            <Navigation className="w-5 h-5 text-blue-600 transform rotate-45" />
        </div>
      </div>

      {/* Visual Representation */}
      <div className="flex-1 w-full relative bg-[#e3e8e1]">
         {/* Topo Pattern */}
         <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-multiply" xmlns="http://www.w3.org/2000/svg">
            <pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
               <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
               <path d="M0 50 C 30 80 70 80 100 50" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#topo)" />
         </svg>

         {/* Night Mode Overlay */}
         {isNight && (
             <div className="absolute inset-0 bg-blue-900/60 mix-blend-multiply pointer-events-none z-10"></div>
         )}
         {/* Heat Mode Overlay */}
         {isHeat && (
             <div className="absolute inset-0 bg-orange-500/20 mix-blend-overlay pointer-events-none z-10"></div>
         )}
         
         {/* Center Marker */}
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
             <div className="relative">
                 <div className={`w-4 h-4 rounded-full animate-ping absolute inset-0 opacity-75 ${isNight ? 'bg-indigo-400' : 'bg-red-500'}`}></div>
                 <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg relative z-10 ${isNight ? 'bg-indigo-500' : 'bg-red-600'}`}></div>
             </div>
         </div>

         {/* Google Maps Link */}
         {location.mapUrl && (
             <a 
               href={location.mapUrl} 
               target="_blank" 
               rel="noopener noreferrer"
               className="absolute bottom-6 right-6 bg-white hover:bg-stone-50 text-blue-600 text-xs font-semibold py-2 px-4 rounded-full shadow-md transition-colors flex items-center gap-2 z-30"
             >
                Sat View
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
             </a>
         )}
      </div>
    </div>
  );
};
