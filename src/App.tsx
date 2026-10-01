import React, { useState, useEffect, useCallback } from 'react';
import { SearchRunner } from './components/SearchRunner';
import { CertificateCanvas } from './components/CertificateCanvas';
import { RunnerDetailsCard } from './components/RunnerDetailsCard';
import { AdminPlacementStudio } from './components/AdminPlacementStudio';
import { Runner, CertificateConfig, DataSourceSettings } from './types';
import { Race, RACES, DEFAULT_RACE } from './data/races';
import { INITIAL_RUNNERS, DEMO_RUNNERS, DEMO_PHOTOS, getDemoPhoto } from './data/mockRunners';
import {
  fetchAllRaces,
  getLocalRaces,
  resolveRaceFromPath,
} from './data/raceStorage';
import {
  DEFAULT_NGHE_AN_PLACEMENTS,
  getSavedPlacements,
  fetchServerDefaultPlacements,
} from './data/certificatePlacements';
import {
  getSavedDataSourceSettings,
  saveDataSourceSettings,
  fetchRunnersFromSource,
  getDirectGoogleDriveImageUrl,
  getCachedRunners,
} from './services/sheetService';
import { getGlobalSupabaseConfig } from './services/supabaseService';
import { RaceSelectorHome } from './components/RaceSelectorHome';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const DEFAULT_CONFIG: CertificateConfig = {
  bgMode: 'custom',
  customBgDataUrl: '/NA26.png',
  nameY: 32.84,
  distanceY: 36.63,
  statsY: 48.2,
  statsLayout: 'vertical',
  showStatsCard: false,
  statsLineSpacing: 1.25,
  fontSizeMultiplier: 1.0,
  textColor: '#042738',
  nameColor: '#042738',
  distanceColor: '#042738',
  showDistanceUnderline: false,
  statsLabelColor: '#FFFFFF',
  statsValueColor: '#fff100',
  accentColor: '#fff100',
  uppercaseName: true,
};

export default function App() {
  // All races loaded from server or localStorage
  const [allRaces, setAllRaces] = useState<Race[]>(() => getLocalRaces());
  const [isRacesLoaded, setIsRacesLoaded] = useState<boolean>(false);

  // Remember the path user explicitly typed into browser address bar on load
  const targetPathOnMount = React.useRef<string>(
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search + window.location.hash
      : ''
  );

  // Detect active race from URL path
  const [activeRace, setActiveRace] = useState<Race>(() => {
    if (typeof window !== 'undefined') {
      return resolveRaceFromPath(
        window.location.pathname + window.location.search + window.location.hash,
        getLocalRaces()
      );
    }
    return DEFAULT_RACE;
  });

  // Refresh races list from API
  const refreshRacesList = useCallback(async () => {
    const list = await fetchAllRaces();
    setAllRaces(list);
    setIsRacesLoaded(true);
    setActiveRace((prev) => {
      // Prioritize the route user directly visited in URL bar (e.g. /test or /ha-long-2026)
      if (targetPathOnMount.current) {
        const fromPath = resolveRaceFromPath(targetPathOnMount.current, list);
        const cleanReq = targetPathOnMount.current.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
        if (cleanReq && cleanReq !== 'admin' && cleanReq !== 'api') {
          if (fromPath && (
            fromPath.slug.toLowerCase() === cleanReq ||
            fromPath.id.toLowerCase() === cleanReq ||
            (fromPath.code && fromPath.code.toLowerCase() === cleanReq)
          )) {
            return fromPath;
          }
        }
      }
      const match = list.find((r) => r.id === prev.id || r.slug === prev.slug);
      return match ? match : (list[0] || prev);
    });
  }, []);

  useEffect(() => {
    refreshRacesList();
  }, [refreshRacesList]);

  const [runners, setRunners] = useState<Runner[]>(() => {
    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) return cached;
    return activeRace.initialRunners && activeRace.initialRunners.length > 0
      ? activeRace.initialRunners
      : INITIAL_RUNNERS;
  });
  const [selectedRunner, setSelectedRunner] = useState<Runner>(() => {
    const def =
      (activeRace.demoRunners && activeRace.demoRunners[0]) ||
      (activeRace.initialRunners && activeRace.initialRunners[0]) ||
      DEMO_RUNNERS[0] ||
      INITIAL_RUNNERS[0];

    // Kiểm tra nếu trên URL có truyền tham số ?bib=
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const bibParam = urlParams.get('bib');
      if (bibParam) {
        const cached = getCachedRunners(activeRace.storageKeyPrefix);
        const match = cached?.find((r) => r.bib.toLowerCase() === bibParam.toLowerCase());
        if (match) {
          const photo = getDemoPhoto(match.bib) || getDemoPhoto(match.name) || (activeRace.demoPhotos || DEMO_PHOTOS)[match.bib];
          return photo ? { ...match, photoUrl: photo } : match;
        }
      }
    }

    // Mặc định luôn là VĐV mẫu đầu tiên (Phùng Hữu Thanh: 90110)
    const photo = getDemoPhoto(def.bib) || getDemoPhoto(def.name) || (activeRace.demoPhotos || DEMO_PHOTOS)[def.bib] || def.photoUrl;
    return photo ? { ...def, photoUrl: photo } : def;
  });
  const [isLoadingRunners, setIsLoadingRunners] = useState<boolean>(false);
  const [config, setConfig] = useState<CertificateConfig>(() => {
    return {
      ...DEFAULT_CONFIG,
      bgMode: 'custom',
      customBgDataUrl: activeRace.defaultBgUrl || '/race_logo.png',
      placements: activeRace.placements || DEFAULT_NGHE_AN_PLACEMENTS,
    };
  });

  const [dataSourceSettings, setDataSourceSettings] = useState<DataSourceSettings>(() =>
    getSavedDataSourceSettings(activeRace.storageKeyPrefix)
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(activeRace.defaultLogoUrl);

  // Admin Route state (/admin or #admin or ?admin=true)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true')
      );
    }
    return false;
  });

  // Homepage Race Selector state (active when visiting root '/' without specific race slug)
  const [isHomeView, setIsHomeView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const clean = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
      const atAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true');
      return !atAdmin && (clean === '' || clean === 'home');
    }
    return true;
  });

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const clean = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
      const atAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true');
      setIsAdminRoute(atAdmin);

      const atHome = !atAdmin && (clean === '' || clean === 'home');
      setIsHomeView(atHome);

      if (!atHome && !atAdmin) {
        const detected = resolveRaceFromPath(
          window.location.pathname + window.location.search + window.location.hash,
          allRaces
        );
        setActiveRace(detected);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allRaces]);

  // Fetch server default placements on mount so all users receive the admin-configured layout
  useEffect(() => {
    async function loadServerDefaults() {
      const serverPlacements = await fetchServerDefaultPlacements();
      if (serverPlacements) {
        setConfig((prev) => ({
          ...prev,
          placements: serverPlacements,
        }));
      }
    }
    loadServerDefaults();
  }, []);

  // Proactive cleanup of legacy race caches from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('vm_custom_races_list_v1');
      localStorage.removeItem('marathon_admin_custom_races');
      localStorage.removeItem('active_race_id');
      localStorage.removeItem('vm_certificate_config_quy-nhon-2026');
      localStorage.removeItem('vm_quynhon_datasource_settings');
      localStorage.removeItem('vm_certificate_config');
      localStorage.removeItem('vm_nghean_certificate_placements_v2');
      localStorage.removeItem('vm_nghean_certificate_placements');
    } catch {}
  }, []);

  // Update placements and config whenever activeRace changes
  useEffect(() => {
    const targetPlacements = activeRace.placements || DEFAULT_NGHE_AN_PLACEMENTS;
    setConfig((prev) => ({
      ...prev,
      placements: targetPlacements,
      customBgDataUrl: activeRace.defaultBgUrl || prev.customBgDataUrl,
    }));
  }, [activeRace.id, activeRace.placements, activeRace.defaultBgUrl]);

  // Switch active race and update URL path without full reload
  const handleSelectRace = useCallback((race: Race) => {
    setActiveRace(race);
    setIsHomeView(false);
    const search = window.location.search;
    window.history.pushState(null, '', `/${race.slug}${search}`);
  }, []);

  // Save config changes
  useEffect(() => {
    try {
      localStorage.setItem('vm_certificate_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Load runners for specific race
  const loadRunnersForRace = useCallback(
    async (settings: DataSourceSettings, targetRace: Race, forceRefresh: boolean = false) => {
      setIsLoadingRunners(true);
      try {
        const globalSb = getGlobalSupabaseConfig();
        const hasRaceSb = Boolean(targetRace.supabaseUrl && targetRace.supabaseAnonKey);
        const hasGlobalSb = Boolean(globalSb.url && globalSb.anonKey);

        let raceSpecificSettings: DataSourceSettings;

        if (hasRaceSb || hasGlobalSb || settings.type === 'supabase' || settings.supabase?.url) {
          raceSpecificSettings = {
            ...settings,
            type: 'supabase',
            url: '',
            supabase: {
              url: targetRace.supabaseUrl || settings.supabase?.url || globalSb.url || '',
              anonKey: targetRace.supabaseAnonKey || settings.supabase?.anonKey || globalSb.anonKey || '',
              table: targetRace.supabaseTable || settings.supabase?.table || globalSb.table || 'runners',
              raceColumn: targetRace.supabaseRaceColumn || settings.supabase?.raceColumn || globalSb.raceColumn || 'Race',
              raceValue: targetRace.supabaseRaceFilter || settings.supabase?.raceValue || globalSb.raceValue || targetRace.code || targetRace.slug || '',
            },
          };
        } else {
          // If race has specific Apps Script URL, prioritize using it
          raceSpecificSettings = {
            ...settings,
            url: targetRace.appsScriptUrl || settings.url || '/api/marathon-data',
            type: 'appsScript',
          };
        }

        const res = await fetchRunnersFromSource(
          raceSpecificSettings,
          targetRace.storageKeyPrefix,
          targetRace.initialRunners,
          forceRefresh
        );

        if (res.backgroundUrl) {
          const directBg = getDirectGoogleDriveImageUrl(res.backgroundUrl) || res.backgroundUrl;
          if (!directBg.includes('QN26') && !directBg.includes('quynhon') && !directBg.includes('17cfwL9HAxh2_tRgvdMp66URxzh6wLj46')) {
            setConfig((prev) => ({
              ...prev,
              bgMode: 'custom',
              customBgDataUrl: directBg,
            }));
          } else {
            setConfig((prev) => ({
              ...prev,
              bgMode: 'custom',
              customBgDataUrl: targetRace.defaultBgUrl || '/NA26.png',
            }));
          }
        }

        if (res.logoUrl) {
          const directLogo = getDirectGoogleDriveImageUrl(res.logoUrl) || res.logoUrl;
          setLogoUrl(directLogo);
          try {
            localStorage.setItem(`${targetRace.storageKeyPrefix}_logo_url`, directLogo);
          } catch {
            // ignore
          }
        }

        if (res.runners && res.runners.length > 0) {
          setRunners(res.runners);
          setSelectedRunner((current) => {
            const photoMap = targetRace.demoPhotos || DEMO_PHOTOS;
            if (!current) {
              const def =
                (targetRace.demoRunners && targetRace.demoRunners[0]) ||
                (targetRace.initialRunners && targetRace.initialRunners[0]) ||
                DEMO_RUNNERS[0] ||
                INITIAL_RUNNERS[0];
              const p = getDemoPhoto(def.bib) || getDemoPhoto(def.name) || photoMap[def.bib] || def.photoUrl;
              return p ? { ...def, photoUrl: p } : def;
            }
            // Nếu VĐV hiện tại có trong danh sách vừa tải thì cập nhật số liệu mới nhất
            const found = res.runners.find((r) => r.bib.toLowerCase() === current.bib.toLowerCase());
            if (found) {
              const p = current.photoUrl || getDemoPhoto(found.bib) || getDemoPhoto(found.name) || photoMap[found.bib];
              return p ? { ...found, photoUrl: p } : found;
            }
            // Giữ nguyên VĐV mặc định đang chọn (Phùng Hữu Thanh), TUYỆT ĐỐI không tự động nhảy sang người đầu tiên của sheet
            return current;
          });
        }

        if (res.error) {
          setSyncError(res.error);
        } else {
          setSyncError(null);
        }
      } finally {
        setIsLoadingRunners(false);
      }
    },
    []
  );

  // Sync state when activeRace changes
  useEffect(() => {
    if (isHomeView) {
      document.title = 'Tra Cứu Chứng Nhận VnExpress Marathon - Chọn Giải Chạy';
      return;
    }

    // Ensure clean URL pathname (/quy-nhon-2026 or /nghe-an-2026) unless in /admin or home
    if (isRacesLoaded && !isAdminRoute) {
      const currentPath = window.location.pathname.replace(/^\/+/, '').split('?')[0].split('#')[0];
      if (currentPath && currentPath !== activeRace.slug) {
        window.history.replaceState(null, '', `/${activeRace.slug}${window.location.search}`);
      }
    }

    // Dynamic document title
    document.title = `Tra Cứu Chứng Nhận ${activeRace.name}`;

    // Update certificate background to active race's default phôi
    setConfig((prev) => ({
      ...prev,
      bgMode: 'custom',
      customBgDataUrl: activeRace.defaultBgUrl || '/NA26.png',
    }));

    // Read stored logo for this race
    try {
      const savedLogo = localStorage.getItem(`${activeRace.storageKeyPrefix}_logo_url`);
      setLogoUrl(savedLogo && !savedLogo.includes('error') ? savedLogo : activeRace.defaultLogoUrl);
    } catch {
      setLogoUrl(activeRace.defaultLogoUrl);
    }

    // Load data source settings and runners
    const currentSettings = getSavedDataSourceSettings(activeRace.storageKeyPrefix);
    setDataSourceSettings(currentSettings);

    // Instant local cache preload if available
    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) {
      setRunners(cached);
      setSelectedRunner((current) => {
        if (!current) return cached[0];
        const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
        const found = cached.find((r) => r.bib.toLowerCase() === current.bib.toLowerCase());
        if (found) {
          const p = current.photoUrl || getDemoPhoto(found.bib) || getDemoPhoto(found.name) || photoMap[found.bib];
          return p ? { ...found, photoUrl: p } : found;
        }
        return current;
      });
    }

    loadRunnersForRace(currentSettings, activeRace);
  }, [activeRace, isRacesLoaded, isHomeView, isAdminRoute, loadRunnersForRace]);

  // Tự động kiểm tra và làm mới dữ liệu ngầm khi hết hạn cache 30 phút
  useEffect(() => {
    const interval = setInterval(() => {
      loadRunnersForRace(dataSourceSettings, activeRace, false);
    }, 60 * 1000); // Kiểm tra mỗi phút, nếu cache hết hạn 30 phút sẽ tự động tải lại
    return () => clearInterval(interval);
  }, [dataSourceSettings, activeRace, loadRunnersForRace]);

  // Handle URL query parameters (e.g. ?bib=88881)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bibParam = urlParams.get('bib');
    if (bibParam && runners.length > 0) {
      const match = runners.find((r) => r.bib.toLowerCase() === bibParam.toLowerCase());
      if (match) {
        const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
        const demoPhoto = getDemoPhoto(match.bib) || getDemoPhoto(match.name) || photoMap[match.bib];
        setSelectedRunner(demoPhoto ? { ...match, photoUrl: demoPhoto } : match);
      }
    }
  }, [runners, activeRace]);

  if (isAdminRoute) {
    return (
      <AdminPlacementStudio
        runners={runners}
        activeRace={activeRace}
        allRaces={allRaces}
        dataSourceSettings={dataSourceSettings}
        onSelectRace={handleSelectRace}
        onRefreshRaces={refreshRacesList}
        onRunnersUpdated={(newRunners) => {
          setRunners(newRunners);
        }}
        onConfigUpdated={setConfig}
        onLogoUpdated={setLogoUrl}
        onBackToUserView={() => {
          window.history.pushState({}, '', '/');
          setIsHomeView(true);
          setIsAdminRoute(false);
        }}
        onNavigateToRace={(slug) => {
          const found = allRaces.find((r) => r.slug === slug);
          if (found) setActiveRace(found);
          window.history.pushState({}, '', `/${slug}`);
          setIsHomeView(false);
          setIsAdminRoute(false);
        }}
      />
    );
  }

  // 1. Màn hình Trang chủ: Chọn giải đã khởi tạo để đi vào
  if (isHomeView) {
    return (
      <RaceSelectorHome
        races={allRaces}
        onSelectRace={(race) => {
          setActiveRace(race);
          setIsHomeView(false);
          window.history.pushState(null, '', `/${race.slug}`);
        }}
        onGoToAdmin={() => {
          window.history.pushState({}, '', '/admin');
          setIsAdminRoute(true);
        }}
      />
    );
  }

  // 2. Màn hình Tra cứu kết quả & Chứng nhận theo từng giải
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-[#9F224E] selection:text-white">
      {/* Top Bar for Race Result Page - Nút quay lại chọn giải khác */}
      <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setIsHomeView(true);
              window.history.pushState(null, '', '/');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Quay lại danh sách giải đấu"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Chọn giải khác</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 line-clamp-1">
              {activeRace.name}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#9F224E] border border-rose-200 text-[10px] font-mono font-bold shrink-0">
              {activeRace.code}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - All boxes share the exact same max-w-5xl container width */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Sync Warning Banner if error */}
        {syncError && (
          <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => loadRunnersForRace(dataSourceSettings, activeRace, true)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Tải lại ngay
              </button>
            </div>
          </div>
        )}

        {/* 1. Search Bar Section (Same 100% width of max-w-5xl) */}
        <section className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9F224E]"></span>
                Tra cứu kết quả & Chứng nhận {activeRace.shortName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tìm kiếm theo số BIB hoặc Họ tên vận động viên
              </p>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-50 text-[#9F224E] border border-rose-200/80 font-bold">
              Giải: {activeRace.code}
            </span>
          </div>

          <SearchRunner
            runners={runners}
            selectedRunner={selectedRunner}
            isLoading={isLoadingRunners}
            demoRunners={activeRace.demoRunners}
            demoPhotos={activeRace.demoPhotos}
            onSelectRunner={(runner) => {
              const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
              const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name) || photoMap[runner.bib];
              const withPhoto = demoPhoto
                ? { ...runner, photoUrl: demoPhoto }
                : runner;
              setSelectedRunner(withPhoto);
            }}
          />
        </section>

        {/* 2. Certificate Display Section (Same 100% width of max-w-5xl) */}
        <section className="w-full bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bản xem trước chứng nhận & Ảnh ghép Finisher
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#0F2847] text-white font-bold tracking-wide shadow-2xs">
                Chuẩn in 300 DPI
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              {activeRace.name}
            </span>
          </div>

          <CertificateCanvas
            runner={selectedRunner}
            config={config}
            onChangeConfig={setConfig}
            raceName={activeRace.name}
            defaultBgUrl={activeRace.defaultBgUrl}
            raceId={activeRace.id}
            activeRace={activeRace}
          />
        </section>

        {/* 3. Runner Details Breakdown (Same 100% width of max-w-5xl) */}
        <RunnerDetailsCard runner={selectedRunner} />
      </main>
    </div>
  );
}
