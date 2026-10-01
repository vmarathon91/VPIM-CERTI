import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  Clock,
  Trash2,
  Users,
  Image as ImageIcon,
  Camera,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Race } from '../data/races';
import { Runner, CertificateConfig, DataSourceSettings } from '../types';
import { fetchRunnersFromSource, clearRunnersCache, getDirectGoogleDriveImageUrl } from '../services/sheetService';
import { getGlobalSupabaseConfig } from '../services/supabaseService';
import { logCheckingDownload, formatCurrentTimestamp } from '../services/logService';

interface DevDataBenchmarkBoxProps {
  activeRace: Race;
  dataSourceSettings: DataSourceSettings;
  selectedRunner: Runner;
  runnersCount: number;
  onRunnersUpdated: (runners: Runner[]) => void;
  onConfigUpdated: (updater: (prev: CertificateConfig) => CertificateConfig) => void;
  onLogoUpdated: (logoUrl: string) => void;
}

interface ComponentMetric {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  durationSec: number | null;
  detail: string | null;
}

export const DevDataBenchmarkBox: React.FC<DevDataBenchmarkBoxProps> = ({
  activeRace,
  dataSourceSettings,
  selectedRunner,
  runnersCount,
  onRunnersUpdated,
  onConfigUpdated,
  onLogoUpdated,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Metrics for each component
  const [runnersMetric, setRunnersMetric] = useState<ComponentMetric>({
    name: 'Danh sách VĐV (Runners)',
    status: 'idle',
    durationSec: null,
    detail: `${runnersCount} VĐV hiện có`,
  });

  const [setupMetric, setSetupMetric] = useState<ComponentMetric>({
    name: 'Phôi & Logo (Folder public/)',
    status: 'idle',
    durationSec: null,
    detail: 'Tải trực tiếp từ static assets',
  });

  const [photosMetric, setPhotosMetric] = useState<ComponentMetric>({
    name: 'Ảnh thi đấu (Photos Script)',
    status: 'idle',
    durationSec: null,
    detail: null,
  });

  const [checkingMetric, setCheckingMetric] = useState<ComponentMetric>({
    name: 'Ghi Log Tải Ảnh (CHECKING)',
    status: 'idle',
    durationSec: null,
    detail: null,
  });

  const [totalMetric, setTotalMetric] = useState<{
    isRunning: boolean;
    totalDurationSec: number | null;
    message: string | null;
  }>({
    isRunning: false,
    totalDurationSec: null,
    message: null,
  });

  // Ticking timer ref for live stopwatch
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [liveStopwatch, setLiveStopwatch] = useState<number>(0);

  const startLiveTimer = () => {
    const startTime = performance.now();
    setLiveStopwatch(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLiveStopwatch(parseFloat(((performance.now() - startTime) / 1000).toFixed(2)));
    }, 50);
    return startTime;
  };

  const stopLiveTimer = (startTime: number): number => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalSec = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
    setLiveStopwatch(finalSec);
    return finalSec;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. REFRESH RUNNERS DATA (Bypass Cache)
  const handleRefreshRunners = async (): Promise<number> => {
    setRunnersMetric({ name: 'Danh sách VĐV (Runners)', status: 'loading', durationSec: null, detail: 'Đang tải...' });
    const startTime = startLiveTimer();

    try {
      // 1.1 Xóa sạch cache trình duyệt
      clearRunnersCache(activeRace.storageKeyPrefix);
      try {
        localStorage.removeItem(`${activeRace.storageKeyPrefix}_runners_cache`);
        localStorage.removeItem(`${activeRace.storageKeyPrefix}_cached_runners`);
      } catch {}

      // 1.2 Kiểm tra nếu có cấu hình Supabase
      const globalSb = getGlobalSupabaseConfig();
      const hasSb = Boolean(
        (activeRace.supabaseUrl && activeRace.supabaseAnonKey) ||
        (globalSb.url && globalSb.anonKey) ||
        dataSourceSettings.supabase?.url
      );

      let refreshSettings: DataSourceSettings;

      if (hasSb || dataSourceSettings.type === 'supabase') {
        refreshSettings = {
          ...dataSourceSettings,
          type: 'supabase',
          url: '',
          supabase: {
            url: activeRace.supabaseUrl || dataSourceSettings.supabase?.url || globalSb.url || '',
            anonKey: activeRace.supabaseAnonKey || dataSourceSettings.supabase?.anonKey || globalSb.anonKey || '',
            table: activeRace.supabaseTable || dataSourceSettings.supabase?.table || globalSb.table || 'runners',
            raceColumn: activeRace.supabaseRaceColumn || dataSourceSettings.supabase?.raceColumn || globalSb.raceColumn || 'Race',
            raceValue: activeRace.supabaseRaceFilter || dataSourceSettings.supabase?.raceValue || globalSb.raceValue || activeRace.code || activeRace.slug || '',
          },
        };
      } else {
        const baseScriptUrl = activeRace.appsScriptUrl || dataSourceSettings.url || '/api/marathon-data';
        const separator = baseScriptUrl.includes('?') ? '&' : '?';
        const noCacheUrl = `${baseScriptUrl}${separator}refresh=true&_nocache=${Date.now()}`;

        refreshSettings = {
          ...dataSourceSettings,
          url: noCacheUrl,
          type: 'appsScript',
        };
      }

      const res = await fetchRunnersFromSource(
        refreshSettings,
        activeRace.storageKeyPrefix,
        activeRace.initialRunners,
        true // forceRefresh = true
      );

      const duration = stopLiveTimer(startTime);

      if (res.runners && res.runners.length > 0) {
        onRunnersUpdated(res.runners);
        const isFromCache = res.fromCache;
        setRunnersMetric({
          name: 'Danh sách VĐV (Runners)',
          status: res.error ? 'error' : 'success',
          durationSec: duration,
          detail: res.error
            ? `${res.error} (${res.runners.length} VĐV)`
            : `${isFromCache ? 'Dùng cache: ' : 'Tải mới: '}${res.runners.length} VĐV`,
        });
      } else {
        setRunnersMetric({
          name: 'Danh sách VĐV (Runners)',
          status: 'error',
          durationSec: duration,
          detail: res.error || 'Không có bản ghi nào',
        });
      }
      return duration;
    } catch (err: any) {
      const duration = stopLiveTimer(startTime);
      setRunnersMetric({
        name: 'Danh sách VĐV (Runners)',
        status: 'error',
        durationSec: duration,
        detail: err.message || 'Lỗi kết nối',
      });
      return duration;
    }
  };

  // 2. REFRESH SETUP (Phôi & Logo tĩnh từ Folder public/ - Siêu tốc)
  const handleRefreshSetup = async (): Promise<number> => {
    setSetupMetric({ name: 'Phôi & Logo (Folder public/)', status: 'loading', durationSec: null, detail: 'Đang tải tĩnh từ public/...' });
    const startTime = performance.now();

    try {
      const bgUrl = activeRace.defaultBgUrl || '/NA26.png';
      const logoUrl = activeRace.defaultLogoUrl || '/race_logo.png';

      // Load cả ảnh Phôi và Logo trực tiếp từ thư mục public/ với timestamp chống cache
      const [bgRes, logoRes] = await Promise.all([
        fetch(`${bgUrl}?_nocache=${Date.now()}`),
        fetch(`${logoUrl}?_nocache=${Date.now()}`),
      ]);

      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

      onConfigUpdated((prev) => ({
        ...prev,
        bgMode: 'custom',
        customBgDataUrl: bgUrl,
      }));

      onLogoUpdated(logoUrl);

      setSetupMetric({
        name: 'Phôi & Logo (Folder public/)',
        status: 'success',
        durationSec: duration,
        detail: `⚡ Tải tĩnh tức thì từ public: Phôi (${bgRes.status}) • Logo (${logoRes.status})`,
      });
      return duration;
    } catch (err: any) {
      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      setSetupMetric({
        name: 'Phôi & Logo (Folder public/)',
        status: 'error',
        durationSec: duration,
        detail: err.message || 'Lỗi tải ảnh từ public',
      });
      return duration;
    }
  };

  // 3. REFRESH PHOTOS SCRIPT (Ảnh thi đấu VĐV theo BIB - Bypass Cache)
  const handleRefreshPhotos = async (): Promise<number> => {
    const bibToTest = selectedRunner?.bib || '90110';
    setPhotosMetric({ name: 'Ảnh thi đấu (Photos Script)', status: 'loading', durationSec: null, detail: `Đang tìm BIB ${bibToTest}...` });
    const startTime = performance.now();

    try {
      const rawPhotosUrl = activeRace.photosScriptUrl?.trim();
      const photosUrl = (rawPhotosUrl && /^https?:\/\//i.test(rawPhotosUrl))
        ? rawPhotosUrl
        : (rawPhotosUrl ? '' : 'https://script.google.com/macros/s/AKfycbyUr1QYj9Eyp60HaDLhXJINbr8Yozt3TXMRlPHpJ7QWhpkK6D4D_ZGMhW5dUerljLT3/exec');

      if (!photosUrl) {
        setPhotosMetric({
          name: 'Ảnh thi đấu (Photos Script)',
          status: 'success',
          durationSec: 0,
          detail: 'Chưa cấu hình Script ảnh cho giải này',
        });
        return 0;
      }
      const separator = photosUrl.includes('?') ? '&' : '?';
      const noCacheUrl = `${photosUrl}${separator}bib=${encodeURIComponent(bibToTest)}&_nocache=${Date.now()}`;

      // Xóa sessionStorage photo cache
      try {
        const raceKey = activeRace.id || activeRace.slug || 'default';
        sessionStorage.removeItem(`vm_race_photos_${raceKey}_${bibToTest.toLowerCase()}`);
      } catch {}

      const resp = await fetch(noCacheUrl);
      const data = await resp.json();
      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

      let count = 0;
      if (Array.isArray(data)) count = data.length;
      else if (data && Array.isArray(data.photos)) count = data.photos.length;
      else if (data && Array.isArray(data.data)) count = data.data.length;

      setPhotosMetric({
        name: 'Ảnh thi đấu (Photos Script)',
        status: 'success',
        durationSec: duration,
        detail: `BIB ${bibToTest}: ${count} ảnh`,
      });
      return duration;
    } catch (err: any) {
      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      setPhotosMetric({
        name: 'Ảnh thi đấu (Photos Script)',
        status: 'error',
        durationSec: duration,
        detail: err.message || 'Lỗi lấy ảnh thi đấu',
      });
      return duration;
    }
  };

  // 4. TEST GHI LOG CHECKING (Bắn log mẫu vào Sheet CHECKING)
  const handleTestCheckingLog = async (): Promise<number> => {
    setCheckingMetric({ name: 'Ghi Log Tải Ảnh (CHECKING)', status: 'loading', durationSec: null, detail: 'Đang gửi...' });
    const startTime = performance.now();

    try {
      const testTimestamp = formatCurrentTimestamp();
      const targetScriptUrl =
        activeRace.checkingScriptUrl ||
        (typeof window !== 'undefined' ? localStorage.getItem('vm_checking_script_url') || '' : '') ||
        activeRace.appsScriptUrl;

      const ok = await logCheckingDownload({
        timestamp: testTimestamp,
        bib: `BENCH_${selectedRunner?.bib || '90110'}`,
        race: `${activeRace.name} (BenchTest)`,
        time: '15s (DevTest)',
        scriptUrl: targetScriptUrl,
      });

      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

      if (ok) {
        setCheckingMetric({
          name: 'Ghi Log Tải Ảnh (CHECKING)',
          status: 'success',
          durationSec: duration,
          detail: '✅ Đã ghi thành công vào sheet CHECKING',
        });
      } else {
        setCheckingMetric({
          name: 'Ghi Log Tải Ảnh (CHECKING)',
          status: 'error',
          durationSec: duration,
          detail: 'Script trả về lỗi hoặc chưa bật quyền Anyone',
        });
      }
      return duration;
    } catch (err: any) {
      const duration = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      setCheckingMetric({
        name: 'Ghi Log Tải Ảnh (CHECKING)',
        status: 'error',
        durationSec: duration,
        detail: err.message || 'Lỗi gửi log',
      });
      return duration;
    }
  };

  // 5. REFRESH TẤT CẢ (FULL REFRESH BYPASS CACHE)
  const handleRefreshAll = async () => {
    setTotalMetric({ isRunning: true, totalDurationSec: null, message: 'Đang chạy song song toàn bộ các dịch vụ...' });
    const overallStart = performance.now();

    // Chạy song song cả 4 thành phần để đo tốc độ tải thực tế của ứng dụng
    await Promise.allSettled([
      handleRefreshRunners(),
      handleRefreshSetup(),
      handleRefreshPhotos(),
      handleTestCheckingLog(),
    ]);

    const totalDuration = parseFloat(((performance.now() - overallStart) / 1000).toFixed(2));
    setTotalMetric({
      isRunning: false,
      totalDurationSec: totalDuration,
      message: `Đã hoàn thành toàn bộ test trong ${totalDuration}s!`,
    });
  };

  // Xóa sạch toàn bộ LocalStorage / SessionStorage của app
  const handleClearAllStorage = () => {
    try {
      clearRunnersCache(activeRace.storageKeyPrefix);
      localStorage.clear();
      sessionStorage.clear();
      alert('Đã xóa sạch toàn bộ Cache LocalStorage & SessionStorage! Bấm F5 hoặc Refresh VĐV để tải mới.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full font-sans">
      {/* Box Container */}
      <div className="bg-stone-900 border-2 border-amber-500/70 rounded-3xl shadow-xl overflow-hidden text-stone-100 transition-all duration-200">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-400 tracking-wide">
                  TEST BENCHMARK REFRESH
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-mono font-bold">
                  KHÔNG DÙNG CACHE
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Đo thời gian hoàn thành từng thành phần (giây) - Đảm bảo hệ thống lấy trực tiếp từ database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300">
              Giải: <strong className="text-amber-400 font-bold">{activeRace.code}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Body (Collapsible) */}
        {!isMinimized && (
          <div className="p-4 sm:p-5 space-y-3.5 text-xs">
            {/* Global Refresh All Action Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={totalMetric.isRunning}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${totalMetric.isRunning ? 'animate-spin' : ''}`} />
                <span>⚡ Refresh Tất Cả (Đo Tổng Số Giây)</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllStorage}
                title="Xóa toàn bộ Cache LocalStorage"
                className="py-2 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-rose-300 rounded-xl border border-stone-700 text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Benchmark Result banner */}
            {totalMetric.totalDurationSec !== null && (
              <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-200 flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Tổng thời gian hoàn thành:
                </span>
                <span className="font-mono font-extrabold text-sm text-amber-300">
                  {totalMetric.totalDurationSec}s
                </span>
              </div>
            )}

            {/* Individual Component Rows */}
            <div className="space-y-1.5 divide-y divide-stone-800/80">
              {/* 1. Runners Data */}
              <div className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                    <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">1/ Dữ liệu VĐV (Runners)</span>
                  </div>
                  <div className="text-[10px] text-stone-400 truncate pl-5">
                    {runnersMetric.detail || 'Apps Script Data'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {runnersMetric.durationSec !== null && (
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        runnersMetric.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {runnersMetric.durationSec}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshRunners}
                    disabled={runnersMetric.status === 'loading'}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg border border-stone-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${runnersMetric.status === 'loading' ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 2. Setup (Phôi & Logo) */}
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="truncate">2/ Phôi & Logo (Setup)</span>
                  </div>
                  <div className="text-[10px] text-stone-400 truncate pl-5">
                    {setupMetric.detail || 'Đọc sheet Setup'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {setupMetric.durationSec !== null && (
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        setupMetric.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {setupMetric.durationSec}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshSetup}
                    disabled={setupMetric.status === 'loading'}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg border border-stone-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${setupMetric.status === 'loading' ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 3. Photos Script */}
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                    <Camera className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">3/ Ảnh thi đấu (Photos)</span>
                  </div>
                  <div className="text-[10px] text-stone-400 truncate pl-5">
                    {photosMetric.detail || `Tra cứu BIB: ${selectedRunner?.bib || '90110'}`}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {photosMetric.durationSec !== null && (
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        photosMetric.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {photosMetric.durationSec}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshPhotos}
                    disabled={photosMetric.status === 'loading'}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg border border-stone-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${photosMetric.status === 'loading' ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 4. Checking Script (Log Tải ảnh) */}
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">4/ Ghi Log (CHECKING)</span>
                  </div>
                  <div className="text-[10px] text-stone-400 truncate pl-5">
                    {checkingMetric.detail || 'Test ghi 4 cột vào sheet CHECKING'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {checkingMetric.durationSec !== null && (
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        checkingMetric.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {checkingMetric.durationSec}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleTestCheckingLog}
                    disabled={checkingMetric.status === 'loading'}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg border border-stone-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${checkingMetric.status === 'loading' ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Test Log</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom note */}
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
              <span>Đang kiểm tra giải: <strong className="text-stone-200">{activeRace.name}</strong> ({activeRace.code})</span>
              <span className="text-amber-400/90 font-mono text-[11px]">
                Nguồn dữ liệu: {dataSourceSettings.type === 'supabase' ? 'Supabase Database' : 'Google Apps Script / Direct'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
