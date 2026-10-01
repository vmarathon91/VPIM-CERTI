import React, { useState, useRef, useEffect } from 'react';
import { Award, Calendar, MapPin, ChevronDown, Check, Trophy } from 'lucide-react';
import { Race, RACES } from '../data/races';

interface NavbarProps {
  activeRace: Race;
  onSelectRace: (race: Race) => void;
  logoUrl?: string | null;
  allRaces?: Race[];
}

export const Navbar: React.FC<NavbarProps> = ({ activeRace, onSelectRace, logoUrl, allRaces }) => {
  const [currentLogo, setCurrentLogo] = React.useState<string>(logoUrl || activeRace.defaultLogoUrl);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableRaces = allRaces && allRaces.length > 0 ? allRaces : RACES;

  // Sync logo when logoUrl prop or activeRace updates
  React.useEffect(() => {
    setCurrentLogo(logoUrl || activeRace.defaultLogoUrl);
  }, [logoUrl, activeRace]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImgError = () => {
    if (currentLogo !== activeRace.defaultLogoUrl) {
      setCurrentLogo(activeRace.defaultLogoUrl);
    } else {
      setCurrentLogo('');
    }
  };

  return (
    <header className="w-full bg-white/95 border-b border-slate-200/90 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-2xs" id="main-header">
      {/* Signature VnExpress Marathon Tri-color Accent Bar: VnExpress Ruby, Athletic Cyan, Podium Gold */}
      <div className="w-full h-1 bg-gradient-to-r from-[#9F224E] via-[#0284C7] to-[#F59E0B]" />
      
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 min-h-[56px] sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          {/* Logo link to official race page */}
          <a
            id="race-logo-link"
            href={activeRace.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={activeRace.name}
            aria-label={activeRace.name}
            className="flex items-center shrink-0 transition-opacity hover:opacity-85 focus:outline-hidden focus:ring-2 focus:ring-[#9F224E] rounded cursor-pointer"
          >
            {currentLogo ? (
              <img
                src={currentLogo}
                alt={`Logo ${activeRace.name}`}
                className="h-8 sm:h-10 w-auto max-w-[105px] xs:max-w-[125px] sm:max-w-[150px] object-contain shrink-0"
                onError={handleImgError}
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#9F224E] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Award className="w-4 h-4" />
              </div>
            )}
          </a>

          {/* Mobile view (< sm): Compact, perfectly balanced, no text clipping */}
          <div className="sm:hidden border-l border-slate-200 pl-2.5 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-slate-900 tracking-tight uppercase truncate">
                {activeRace.name}
              </h1>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-[#9F224E] border border-rose-200 shrink-0 font-mono">
                {activeRace.code}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                {activeRace.city}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                {activeRace.date}
              </span>
            </div>
          </div>

          {/* Desktop view (>= sm): Full title and details */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                {activeRace.name}
              </h1>
              <span className="inline-flex items-center text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#9F224E] border border-rose-200/90 shadow-2xs">
                {activeRace.code}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {activeRace.locationFull}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {activeRace.date}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Race Switcher (only when multiple races exist) */}
        {availableRaces.length > 1 ? (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              id="race-selector-btn"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden xs:inline">Giải:</span>
              <span className="font-bold text-slate-900">{activeRace.shortName}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                id="race-dropdown-menu"
                className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Chọn giải đấu VnExpress Marathon
                </div>
                <div className="py-1">
                  {availableRaces.map((race) => {
                    const isSelected = race.id === activeRace.id;
                    return (
                      <button
                        key={race.id}
                        type="button"
                        id={`select-race-${race.id}`}
                        onClick={() => {
                          onSelectRace(race);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50/80 text-[#9F224E] font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? 'bg-[#9F224E]' : 'bg-slate-300'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{race.name}</span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                {race.code}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                              {race.locationFull} • {race.date}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#9F224E] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};

