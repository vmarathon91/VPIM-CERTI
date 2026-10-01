import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Runner, CertificateConfig, CertificatePlacements } from '../types';
import { Race } from '../data/races';
import {
  DEFAULT_NGHE_AN_PLACEMENTS,
  getSavedPlacements,
  savePlacements,
  resetPlacements,
  clearSavedUserPlacements,
} from '../data/certificatePlacements';
import { PlacementEditorPanel } from './PlacementEditorPanel';
import { RaceManagerTab } from './RaceManagerTab';
import { drawCertificate } from '../utils/canvasDrawer';
import { exportRaceStaticApi } from '../utils/exportRaceStaticApi';
import {
  Lock,
  ShieldCheck,
  Save,
  Copy,
  Check,
  RotateCcw,
  ArrowLeft,
  LogOut,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Users,
  Trophy,
  FileCode,
  Zap,
} from 'lucide-react';
import { DevDataBenchmarkBox } from './DevDataBenchmarkBox';

interface AdminPlacementStudioProps {
  runners: Runner[];
  activeRace: Race;
  allRaces: Race[];
  dataSourceSettings: import('../types').DataSourceSettings;
  onSelectRace: (race: Race) => void;
  onRefreshRaces: () => Promise<void>;
  onBackToUserView: () => void;
  onNavigateToRace: (slug: string) => void;
  onRunnersUpdated: (runners: Runner[]) => void;
  onConfigUpdated: (updater: (prev: CertificateConfig) => CertificateConfig) => void;
  onLogoUpdated: (logoUrl: string) => void;
}

const ADMIN_PASSWORD_EXPECTED = '0966559155';
const SESSION_AUTH_KEY = 'vm_admin_auth_token_0966559155';

export const AdminPlacementStudio: React.FC<AdminPlacementStudioProps> = ({
  runners,
  activeRace,
  allRaces,
  dataSourceSettings,
  onSelectRace,
  onRefreshRaces,
  onBackToUserView,
  onNavigateToRace,
  onRunnersUpdated,
  onConfigUpdated,
  onLogoUpdated,
}) => {
  // Navigation tabs: 'races' (Quản lý & tạo giải) | 'placements' (Chỉnh vị trí & kích thước chữ) | 'benchmark' (Test benchmark tốc độ)
  const [adminTab, setAdminTab] = useState<'races' | 'placements' | 'benchmark'>('races');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Placements & Editor State
  const [placements, setPlacements] = useState<CertificatePlacements>(() => {
    return activeRace.placements && Object.keys(activeRace.placements).length > 0
      ? activeRace.placements
      : getSavedPlacements() || DEFAULT_NGHE_AN_PLACEMENTS;
  });
  const [activeFieldId, setActiveFieldId] = useState<string>('name');
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [selectedRunner, setSelectedRunner] = useState<Runner>((runners && runners.length > 0 && runners[0]) || {
    bib: '90110',
    name: 'PHÙNG HỮU THANH',
    gender: 'M',
    distance: '42K',
    distanceDisplay: '42K Full Marathon',
    overallRank: '26',
    genderRank: '22',
    ag: '30-39',
    ageGroupRank: '8',
    gunTime: '03:15:20',
    chipTime: '03:14:48',
    date: '13/09/2026',
  });

  // Zoom & View
  const [canvasZoom, setCanvasZoom] = useState<number>(0.32);

  // Save / Copy status
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const [bgLoaded, setBgLoaded] = useState<boolean>(false);

  // Sync placements when active race changes or race placements update
  useEffect(() => {
    if (activeRace.placements && Object.keys(activeRace.placements).length > 0) {
      setPlacements(activeRace.placements);
    } else {
      setPlacements(DEFAULT_NGHE_AN_PLACEMENTS);
    }
  }, [activeRace.id, activeRace.placements]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSWORD_EXPECTED) {
      setIsAuthenticated(true);
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setAuthError(null);
    } else {
      setAuthError('Mật khẩu không chính xác. Vui lòng nhập lại (0966559155)!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setPasswordInput('');
  };

  // Preload background image for the active race
  useEffect(() => {
    const bgUrl = activeRace.defaultBgUrl || '/NA26.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgUrl;
    img.onload = () => {
      bgImgRef.current = img;
      setBgLoaded(true);
    };
    img.onerror = () => {
      // Fallback to NA26 if custom image fails
      const fallback = new Image();
      fallback.crossOrigin = 'anonymous';
      fallback.src = '/NA26.png';
      fallback.onload = () => {
        bgImgRef.current = fallback;
        setBgLoaded(true);
      };
    };
  }, [activeRace.defaultBgUrl]);

  // Live Canvas Rendering
  const renderLiveCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 1469;
    const height = 3508;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const testConfig: CertificateConfig = {
      bgMode: 'custom',
      customBgDataUrl: activeRace.defaultBgUrl || '/NA26.png',
      nameY: 32.84,
      distanceY: 36.63,
      statsY: 48.2,
      statsLayout: 'vertical',
      showStatsCard: false,
      statsLineSpacing: 1.25,
      fontSizeMultiplier: 1.0,
      textColor: '#042738',
      accentColor: '#fff100',
      uppercaseName: true,
      placements,
    };

    await drawCertificate({
      canvas,
      runner: selectedRunner,
      config: testConfig,
      customImageObj: bgImgRef.current,
      scale: 1,
      raceId: activeRace.id,
      defaultBgUrl: activeRace.defaultBgUrl || '/NA26.png',
      activeFieldId,
      showGuide,
    });
  }, [selectedRunner, placements, activeFieldId, showGuide, bgLoaded, activeRace]);

  useEffect(() => {
    if (adminTab === 'placements') {
      renderLiveCanvas();
    }
  }, [renderLiveCanvas, adminTab]);

  // Handle Placements Change
  const handleChangePlacements = (newPlacements: CertificatePlacements) => {
    setPlacements(newPlacements);
    savePlacements(newPlacements);
    // Đồng bộ ngay lập tức vào activeRace để không bị lạc hậu dữ liệu
    activeRace.placements = newPlacements;
  };

  const handleResetPlacements = () => {
    const def = resetPlacements();
    setPlacements(def);
    activeRace.placements = def;
  };

  // Save Placements to Race on server (persists to public/races/${slug}.json and public/races-data.json)
  const handleSaveToRace = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const updatedRace: Race = {
        ...activeRace,
        placements,
      };

      const res = await fetch('/api/admin/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ADMIN_PASSWORD_EXPECTED,
          race: updatedRace,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi lưu toạ độ vào giải');
      }

      activeRace.placements = placements;
      await onRefreshRaces();
      setSaveSuccessMsg(
        `Đã lưu thành công toạ độ phôi mới cho giải "${activeRace.name}"! File cấu hình public/races/${activeRace.slug}.json đã được cập nhật toạ độ chuẩn.`
      );
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  // Export Static API JSON (.json) for current race with latest placements
  const handleExportStaticApi = () => {
    exportRaceStaticApi(activeRace, placements);
  };

  // Copy TypeScript code
  const handleCopyCode = () => {
    let code = 'export const DEFAULT_NGHE_AN_PLACEMENTS: CertificatePlacements = {\n';
    const fieldOrder = [
      'name',
      'distance',
      'bib',
      'chipTime',
      'finishTime',
      'overallRank',
      'genderRank',
      'ageGroupRank',
    ];

    for (const key of fieldOrder) {
      const item = (placements as any)[key];
      if (!item) continue;
      code += `  ${key}: {\n`;
      code += `    id: '${item.id || key}',\n`;
      code += `    label: '${item.label || key}',\n`;
      code += `    x: ${Number(item.x).toFixed(2)},\n`;
      code += `    y: ${Number(item.y).toFixed(2)},\n`;
      code += `    fontSize: ${Number(item.fontSize)},\n`;
      code += `    color: '${item.color || '#000000'}',\n`;
      code += `    align: '${item.align || 'center'}',\n`;
      code += `    fontWeight: ${Number(item.fontWeight || 700)},\n`;
      code += `  },\n`;
    }
    code += '};';

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Switch to placements view for a specific race
  const handleSelectRaceForPlacements = (race: Race) => {
    onSelectRace(race);
    if (race.placements && Object.keys(race.placements).length > 0) {
      setPlacements(race.placements);
      savePlacements(race.placements);
    }
    setAdminTab('placements');
  };

  // PASSWORD LOCK SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-100">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#9F224E]/20 border border-[#9F224E]/40 flex items-center justify-center text-[#FFD100] mb-4 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Khu Vực Quản Trị Hệ Thống</h1>
            <p className="text-slate-400 text-xs">
              Tạo giải đấu, thiết lập URL, phôi chứng nhận, toạ độ chữ và xuất file API tĩnh cấu hình giải.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 focus:border-[#9F224E] focus:ring-2 focus:ring-[#9F224E]/20 rounded-xl text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#9F224E] to-[#BD1E51] hover:from-[#881337] hover:to-[#9F224E] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
            >
              Đăng Nhập Quản Trị
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-center">
            <button
              type="button"
              onClick={onBackToUserView}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay về trang tra cứu kết quả</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN STUDIO
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Studio Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToUserView}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Quay về trang người dùng"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Về trang tra cứu</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          {/* Tab Switcher: Quản lý giải vs Chỉnh toạ độ */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setAdminTab('races')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                adminTab === 'races'
                  ? 'bg-gradient-to-r from-[#9F224E] to-[#B81B4B] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>1. Quản Lý & Tạo Giải</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-mono text-amber-300">
                {allRaces.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('placements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                adminTab === 'placements'
                  ? 'bg-gradient-to-r from-[#9F224E] to-[#B81B4B] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Chỉnh Tọa Độ Chữ</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('benchmark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                adminTab === 'benchmark'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Benchmark Tốc Độ</span>
            </button>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Race Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 text-[11px] hidden md:inline">Giải đang chọn:</span>
            <select
              value={activeRace.id}
              onChange={(e) => {
                const found = allRaces.find((r) => r.id === e.target.value);
                if (found) onSelectRace(found);
              }}
              className="bg-transparent text-[#FFD100] font-bold focus:outline-none cursor-pointer text-xs"
            >
              {allRaces.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Runner Switcher (only when in placements tab) */}
          {adminTab === 'placements' && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <select
                value={selectedRunner.bib}
                onChange={(e) => {
                  const found = runners.find((r) => r.bib === e.target.value);
                  if (found) setSelectedRunner(found);
                }}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                {runners.slice(0, 15).map((r) => (
                  <option key={r.bib} value={r.bib} className="bg-slate-900 text-slate-100">
                    {r.bib} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save to Race on server & Export API JSON */}
          {adminTab === 'placements' && (
            <>
              <button
                type="button"
                id="admin-save-race-btn"
                onClick={handleSaveToRace}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Lưu các tọa độ này vào giải đấu"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu toạ độ vào giải'}</span>
              </button>

              <button
                type="button"
                id="admin-export-static-api-btn"
                onClick={handleExportStaticApi}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                title="Tải file API tĩnh (.json) chứa toạ độ vừa chỉnh"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Xuất API Tĩnh (.json)</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="bg-emerald-900/90 border-b border-emerald-700 px-4 py-2.5 text-emerald-100 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="bg-red-900/90 border-b border-red-700 px-4 py-2.5 text-red-100 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
            <span className="font-medium">{saveErrorMsg}</span>
          </div>
          <button
            onClick={() => setSaveErrorMsg(null)}
            className="text-red-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace based on Tab */}
      {adminTab === 'races' ? (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-8">
          <RaceManagerTab
            races={allRaces}
            activeRaceId={activeRace.id}
            currentPlacements={placements}
            onRefreshRaces={onRefreshRaces}
            onSelectRaceForPlacements={handleSelectRaceForPlacements}
            onNavigateToRace={onNavigateToRace}
          />

          {/* In-page Benchmark Box */}
          <div className="pt-6 border-t border-slate-800">
            <DevDataBenchmarkBox
              activeRace={activeRace}
              dataSourceSettings={dataSourceSettings}
              selectedRunner={selectedRunner}
              runnersCount={runners.length}
              onRunnersUpdated={onRunnersUpdated}
              onConfigUpdated={onConfigUpdated}
              onLogoUpdated={onLogoUpdated}
            />
          </div>
        </main>
      ) : adminTab === 'benchmark' ? (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-6">
          <DevDataBenchmarkBox
            activeRace={activeRace}
            dataSourceSettings={dataSourceSettings}
            selectedRunner={selectedRunner}
            runnersCount={runners.length}
            onRunnersUpdated={onRunnersUpdated}
            onConfigUpdated={onConfigUpdated}
            onLogoUpdated={onLogoUpdated}
          />
        </main>
      ) : (
        /* TAB 2: PLACEMENT STUDIO WORKSPACE */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Area: Interactive Live Certificate Canvas Preview */}
          <div className="flex-1 bg-stone-950 p-4 sm:p-6 flex flex-col items-center justify-start overflow-y-auto min-h-[500px]">
            {/* Zoom & View Controls */}
            <div className="w-full max-w-xl flex items-center justify-between mb-3 px-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-teal-400 font-bold">1469 × 3508 px</span>
                <span>•</span>
                <span>Phôi: {activeRace.defaultBgUrl || '/NA26.png'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    showGuide ? 'text-teal-400 font-bold' : 'text-stone-500'
                  }`}
                  title="Tâm căn"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <div className="h-3 w-px bg-stone-800" />
                <button
                  type="button"
                  onClick={() => setCanvasZoom((z) => Math.max(0.15, z - 0.05))}
                  className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1 text-stone-300">
                  {Math.round(canvasZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setCanvasZoom((z) => Math.min(0.7, z + 0.05))}
                  className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasZoom(0.32)}
                  className="px-1.5 py-0.5 hover:bg-stone-800 rounded text-[10px] text-teal-400 cursor-pointer"
                  title="Mặc định vừa khung"
                >
                  Vừa
                </button>
              </div>
            </div>

            {/* Canvas Wrapper */}
            <div
              className="rounded-2xl shadow-2xl border border-stone-800 bg-stone-900 overflow-hidden relative flex items-center justify-center transition-all"
              style={{
                width: `${1469 * canvasZoom}px`,
                height: `${3508 * canvasZoom}px`,
              }}
            >
              <canvas
                ref={canvasRef}
                width={1469}
                height={3508}
                className="origin-top-left absolute top-0 left-0"
                style={{
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>

          {/* Right Area: Placement Tuning Panel */}
          <div className="w-full lg:w-[480px] xl:w-[520px] bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-800 flex flex-col shrink-0 overflow-y-auto max-h-[85vh] lg:max-h-none p-4">
            <div className="mb-3 bg-teal-950/40 border border-teal-800/60 rounded-xl p-3 text-xs text-teal-200">
              <div className="font-bold flex items-center justify-between text-teal-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Căn Chỉnh Phôi: {activeRace.shortName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportStaticApi}
                  className="text-[11px] underline text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileCode className="w-3 h-3" />
                  <span>Xuất API Tĩnh</span>
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-teal-200/80">
                1. Nhấp chọn trường cần căn chỉnh (Tên, Cự ly, BIB, Chip time,...).<br />
                2. Kéo thanh trượt hoặc bấm nút +/- để căn đúng vị trí trên phôi giải này.<br />
                3. Bấm <strong>"Lưu vào giải"</strong> để ghi vào hệ thống, hoặc bấm <strong>"Xuất API Tĩnh (.json)"</strong> để tải file cấu hình toạ độ mới.
              </p>
            </div>

            <PlacementEditorPanel
              placements={placements}
              onChangePlacements={handleChangePlacements}
              onResetPlacements={handleResetPlacements}
              onClose={onBackToUserView}
              activeFieldId={activeFieldId}
              onSelectFieldId={setActiveFieldId}
              showGuide={showGuide}
              onToggleGuide={() => setShowGuide((prev) => !prev)}
              onSaveToRace={handleSaveToRace}
              isSavingToRace={isSaving}
              onExportStaticApi={handleExportStaticApi}
              onCopyCode={handleCopyCode}
            />
          </div>
        </div>
      )}
    </div>
  );
};
