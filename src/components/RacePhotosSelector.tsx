import React, { useState, useEffect } from 'react';
import { Camera, Check } from 'lucide-react';
import { Runner } from '../types';
import { Race } from '../data/races';
import { getRunnerRacePhotos } from '../services/racePhotoService';

interface RacePhotosSelectorProps {
  runner: Runner;
  activePhotoUrl: string | null;
  onSelectPhoto: (url: string) => void;
  activeRace?: Race;
}

export const RacePhotosSelector: React.FC<RacePhotosSelectorProps> = ({
  runner,
  activePhotoUrl,
  onSelectPhoto,
  activeRace,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch photos whenever runner BIB changes or activeRace changes
  useEffect(() => {
    let isCancelled = false;
    async function loadPhotos() {
      setIsLoading(true);
      try {
        const list = await getRunnerRacePhotos(runner.bib, activeRace, runner.photoUrl);
        if (!isCancelled) {
          setPhotos(list);
        }
      } catch {
        if (!isCancelled) setPhotos([]);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadPhotos();
    return () => {
      isCancelled = true;
    };
  }, [runner.bib, runner.photoUrl, activeRace?.id, activeRace?.photosScriptUrl]);

  // Box ảnh thi đấu chỉ hiển thị khi đã load xong và có ảnh trong hệ thống.
  // Hoàn toàn ẩn khi đang load ngầm để người dùng không nhận biết quá trình tải ngầm.
  if (isLoading || photos.length === 0) {
    return null;
  }

  return (
    <div
      className="w-full bg-slate-50/95 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2.5 transition-all mb-3 shadow-2xs"
      id="race-photos-system-box"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#9F224E]/10 border border-[#9F224E]/20 flex items-center justify-center text-[#9F224E]">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Ảnh thi đấu của bạn (BIB {runner.bib})</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-[#9F224E] border border-rose-200/80 font-bold">
                {photos.length} ảnh
              </span>
            </h4>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">Nhấn vào ảnh để ghép vào chứng nhận</span>
      </div>

      {/* Photos List Horizontal Thumbnails */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        {photos.map((photoUrl, idx) => {
          const isSelected = activePhotoUrl === photoUrl;
          return (
            <button
              key={`${photoUrl}-${idx}`}
              type="button"
              onClick={() => onSelectPhoto(photoUrl)}
              className={`relative group rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer w-16 h-20 sm:w-20 sm:h-24 ${
                isSelected
                  ? 'border-[#9F224E] ring-2 ring-[#9F224E]/30 shadow-md scale-[1.02]'
                  : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
              }`}
              title={`Chọn ảnh thi đấu số ${idx + 1}`}
            >
              <img
                src={photoUrl}
                alt={`Ảnh thi đấu ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />

              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#9F224E] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Index tag */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] text-white font-mono font-medium">
                #{idx + 1}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
