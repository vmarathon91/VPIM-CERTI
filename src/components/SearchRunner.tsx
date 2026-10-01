import React, { useState, useRef, useEffect } from 'react';
import { Search, X, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { Runner } from '../types';
import { DEMO_RUNNERS, DEMO_PHOTOS, getDemoPhoto } from '../data/mockRunners';

interface SearchRunnerProps {
  runners: Runner[];
  selectedRunner: Runner | null;
  onSelectRunner: (runner: Runner) => void;
  isLoading?: boolean;
  demoRunners?: Runner[];
  demoPhotos?: Record<string, string>;
}

export const SearchRunner: React.FC<SearchRunnerProps> = ({
  runners,
  selectedRunner,
  onSelectRunner,
  isLoading = false,
  demoRunners,
  demoPhotos,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeDemos = demoRunners && demoRunners.length > 0 ? demoRunners : DEMO_RUNNERS;
  const activePhotos = demoPhotos || DEMO_PHOTOS;

  // Normalize Vietnamese accents for diacritic-insensitive search
  const removeDiacritics = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  // Filter suggestions based on query
  const trimmed = query.trim().toLowerCase();
  const normalizedQuery = removeDiacritics(trimmed);

  // If runners loaded, search directly in runners; fallback to active demo runners
  const searchPool = runners.length > 0 ? runners : activeDemos;

  const suggestions = trimmed.length === 0
    ? []
    : searchPool.filter((r) => {
        const matchBib = r.bib.toLowerCase().includes(trimmed);
        const matchName = r.name.toLowerCase().includes(trimmed) || removeDiacritics(r.name).includes(normalizedQuery);
        return matchBib || matchName;
      }).slice(0, 8); // Top 8 suggestions

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (runner: Runner) => {
    const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name) || activePhotos[runner.bib];
    const runnerWithPhoto = demoPhoto
      ? { ...runner, photoUrl: demoPhoto }
      : runner;
    onSelectRunner(runnerWithPhoto);
    setQuery(`${runner.name} - ${runner.bib}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full relative" ref={containerRef} id="search-runner-container">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          id="search-runner-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập số BIB hoặc Họ tên (VD: 90110 hoặc Phùng Hữu Thanh)..."
          className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:bg-white focus:border-[#9F224E] focus:ring-2 focus:ring-[#9F224E]/15 text-sm font-medium transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          )}
          {query && (
            <button
              type="button"
              id="clear-search-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="search-suggestions-dropdown"
          className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100"
        >
          <div className="px-3.5 py-2 bg-slate-50/90 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Kết quả tìm kiếm ({suggestions.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Dùng phím ↑ ↓ Enter</span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {suggestions.map((item, index) => {
              const isSelected = selectedRunner?.bib === item.bib;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={item.bib}
                  id={`suggestion-item-${item.bib}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                    isHighlighted ? 'bg-rose-50/50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const itemPhoto = getDemoPhoto(item.bib) || getDemoPhoto(item.name) || item.photoUrl;
                      return itemPhoto ? (
                        <img
                          src={itemPhoto}
                          alt={item.name}
                          className="w-7 h-7 rounded-md object-cover border border-slate-200"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px] ${
                            item.gender === 'F' ? 'bg-rose-50 text-[#9F224E]' : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {item.gender}
                        </div>
                      );
                    })()}
                    <div>
                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-xs font-neue-plak font-bold text-[#0F2847] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          #{item.bib}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#9F224E] inline" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-[#0F2847]">{item.distance}</span>
                        <span>•</span>
                        <span>Chip Time: <strong className="font-neue-plak font-bold text-[#0F2847]">{item.chipTime}</strong></span>
                        <span>•</span>
                        <span>Hạng: <strong className="font-neue-plak font-bold text-amber-600">#{item.overallRank}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs font-mono text-slate-400 pl-2">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No results or Loading message */}
      {isOpen && trimmed.length > 0 && suggestions.length === 0 && (
        <div
          id="no-search-results"
          className="absolute left-0 right-0 mt-1.5 p-4 bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-center text-slate-500 text-xs"
        >
          {isLoading ? (
            <div className="py-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              <p>Không tìm thấy vận động viên nào khớp với "<span className="text-slate-900 font-medium">{query}</span>"</p>
              <p className="text-[11px] text-slate-400 mt-1">Vui lòng kiểm tra lại số BIB hoặc họ tên.</p>
            </>
          )}
        </div>
      )}

      {/* Quick sample chips */}
      <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-xs" id="demo-runners-section">
        <span className="text-slate-400 font-medium mr-1 text-[11px]">VĐV mẫu:</span>
        {activeDemos.map((r) => {
          const isCurrent = selectedRunner?.bib === r.bib;
          return (
            <button
              key={r.bib}
              type="button"
              id={`demo-runner-btn-${r.bib}`}
              onClick={() => handleSelect(r)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-[#0F2847] text-white border-[#0F2847] shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {r.name} <span className="font-mono text-[11px] opacity-80">({r.bib})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
