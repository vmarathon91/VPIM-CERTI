import React from 'react';
import { Runner } from '../types';
import { Trophy, Timer, User, Flag, Calendar, Hash, Medal, Award, TrendingUp, Zap, Gauge } from 'lucide-react';
import { getRunnerSplitData } from '../utils/runnerSplits';
import { getDemoPhoto } from '../data/mockRunners';

interface RunnerDetailsCardProps {
  runner: Runner;
}

export const RunnerDetailsCard: React.FC<RunnerDetailsCardProps> = ({ runner }) => {
  const splits = getRunnerSplitData(runner);
  const displayPhoto = runner.photoUrl || getDemoPhoto(runner.bib) || getDemoPhoto(runner.name);

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs text-slate-800 space-y-4" id="runner-details-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={runner.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-base">
              {runner.gender === 'F' ? '♀' : '♂'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {runner.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-[#0F2847] font-neue-plak font-bold border border-slate-200">
                BIB: {runner.bib}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span className="text-[#9F224E] font-bold bg-rose-50 border border-rose-200/70 px-1.5 py-0.2 rounded">
                {runner.distance}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {runner.date || '13/09/2026'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-amber-900 text-xs font-bold shadow-2xs">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            Finisher chính thức
          </span>
        </div>
      </div>

      {/* 7 Key Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. BIB NUMBER */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            BIB NUMBER
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-neue-plak">
            {runner.bib}
          </span>
        </div>

        {/* 2. CHIPTIME (Iconic Hero Stat - Deep Navy & Champion Gold) */}
        <div className="bg-[#0F2847] p-3 rounded-xl border border-[#0F2847] text-white shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#FFD100] flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-[#FFD100]" />
            CHIPTIME
          </span>
          <span className="text-base sm:text-lg font-black text-[#FFD100] mt-1 font-neue-plak tracking-tight">
            {runner.chipTime}
          </span>
        </div>

        {/* 3. FINISH TIME (Gun Time) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Flag className="w-3.5 h-3.5 text-indigo-500" />
            GUN TIME
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-800 mt-1 font-neue-plak">
            {runner.gunTime}
          </span>
        </div>

        {/* 4. OVERALL RANK */}
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            OVERALL RANK
          </span>
          <span className="text-base sm:text-lg font-black text-amber-950 mt-1 font-neue-plak">
            #{runner.overallRank}
          </span>
        </div>

        {/* 5. GENDER RANK */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-sky-600" />
            GENDER RANK
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-neue-plak">
            #{runner.genderRank}
          </span>
        </div>

        {/* 6. AG */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            AG
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-neue-plak">
            {runner.ag}
          </span>
        </div>

        {/* 7. AGE GROUP RANK */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Medal className="w-3.5 h-3.5 text-orange-500" />
            AGE GROUP RANK
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-neue-plak">
            #{runner.ageGroupRank}
          </span>
        </div>
      </div>

      {/* Checkpoints & Split Pace Detail Row (Start, CP1, CP2, CP3, Avg Pace, GunTime, ChipTime) */}
      <div className="bg-[#0F2847] text-white rounded-xl p-3.5 sm:p-4 border border-[#0B1F38] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FFD100]" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
              Thông số Checkpoints (CP) & Tốc độ Pace từng đoạn
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-300">
              Avg Pace:{' '}
              <strong className="text-[#FFD100] font-neue-plak font-bold">{splits.avgPace}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              GunTime: <strong className="text-slate-200 font-neue-plak">{splits.gunTime}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              ChipTime: <strong className="text-[#FFD100] font-neue-plak font-bold">{splits.chipTime}</strong>
            </span>
          </div>
        </div>

        {/* Checkpoint Nodes Timeline Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {splits.checkpoints.map((cp, idx) => (
            <div
              key={cp.id}
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                idx === 0
                  ? 'bg-[#132F54] border-[#1E4374]'
                  : idx === splits.checkpoints.length - 1
                  ? 'bg-[#9F224E]/30 border-[#9F224E] text-rose-100'
                  : 'bg-[#132F54]/80 border-[#1E4374]/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                  {cp.label} ({cp.km}K)
                </span>
                {idx > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-400/20 text-sky-200 border border-sky-400/30 font-neue-plak font-bold">
                    {cp.pace}/km
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="text-xs text-slate-300 block text-[10px]">Thời gian mốc:</span>
                <span className="text-sm font-bold font-neue-plak text-white">{cp.time}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between">
                <span>{idx === 0 ? 'Xuất phát' : `Tốc độ đoạn:`}</span>
                <span className="font-semibold text-slate-200 font-neue-plak">
                  {idx === 0 ? cp.time : `${cp.pace} /km`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
