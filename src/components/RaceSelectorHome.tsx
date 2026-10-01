import React, { useState } from 'react';
import {
  Trophy,
  Calendar,
  MapPin,
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Race } from '../data/races';

interface RaceSelectorHomeProps {
  races: Race[];
  onSelectRace: (race: Race) => void;
  onGoToAdmin: () => void;
}

export const RaceSelectorHome: React.FC<RaceSelectorHomeProps> = ({
  races,
  onSelectRace,
  onGoToAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRaces = races.filter((race) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      race.name.toLowerCase().includes(q) ||
      (race.code && race.code.toLowerCase().includes(q)) ||
      (race.locationFull && race.locationFull.toLowerCase().includes(q)) ||
      race.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-[#9F224E] selection:text-white">
      {/* Top Simple Utility Bar */}
      <header className="w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#9F224E] flex items-center justify-center text-white shadow-md">
            <Trophy className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              VnExpress Marathon
            </h1>
            <p className="text-[10px] text-slate-400">
              Cổng Tra Cứu & Chứng Nhận Điện Tử
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToAdmin}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Vào khu vực quản trị giải đấu"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Quản trị</span>
        </button>
      </header>

      {/* Main Hero & Race Selector */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9F224E]/20 border border-[#9F224E]/40 text-[#FFD100] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chọn giải chạy đã khởi tạo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Tra Cứu Kết Quả & Chứng Nhận Finisher
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Vui lòng chọn giải đấu bạn đã tham gia để tra cứu thành tích thi đấu theo BIB / Họ tên và tải ảnh chứng nhận điện tử độ nét cao.
          </p>

          {/* Search Box */}
          {races.length > 2 && (
            <div className="pt-2 max-w-md mx-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm giải chạy theo tên hoặc địa điểm..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#9F224E] focus:ring-1 focus:ring-[#9F224E]/30 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          )}
        </div>

        {/* Races Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Danh sách giải đấu ({filteredRaces.length})
            </span>
            <span className="text-[11px]">
              Bấm vào giải bất kỳ để bắt đầu tra cứu
            </span>
          </div>

          {filteredRaces.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/60 border border-slate-800 rounded-3xl space-y-3">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 text-sm font-semibold">
                Không tìm thấy giải đấu phù hợp
              </p>
              <p className="text-slate-500 text-xs">
                Hãy thử tìm kiếm với từ khóa khác hoặc truy cập Quản trị để tạo giải mới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRaces.map((race) => (
                <div
                  key={race.id || race.slug}
                  onClick={() => onSelectRace(race)}
                  className="group relative bg-slate-950 border border-slate-800 hover:border-[#9F224E]/80 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-950/20 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Thumbnail / Certificate Banner Preview */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden border-b border-slate-800/80">
                    <img
                      src={race.defaultBgUrl || '/NA26.png'}
                      alt={race.name}
                      className="w-full h-full object-cover object-top opacity-75 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-mono text-xs font-bold shadow-md">
                        {race.code || race.slug.toUpperCase()}
                      </span>
                      {race.date && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#9F224E]/90 text-white font-semibold text-[11px] flex items-center gap-1 shadow-md">
                          <Calendar className="w-3 h-3 text-[#FFD100]" />
                          <span>{race.date}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white group-hover:text-[#FFD100] transition-colors leading-snug line-clamp-2">
                        {race.name}
                      </h3>

                      {race.locationFull && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{race.locationFull}</span>
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">
                        /{race.slug}
                      </span>
                      <div className="px-3.5 py-1.5 bg-gradient-to-r from-[#9F224E] to-[#BD1E51] group-hover:from-[#881337] group-hover:to-[#9F224E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all">
                        <span>Tra cứu</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
