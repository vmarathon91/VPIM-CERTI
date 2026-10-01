import React, { useState, useRef } from 'react';
import { Race } from '../data/races';
import { CertificatePlacements } from '../types';
import { exportRaceStaticApi, importRaceFromStaticApi } from '../utils/exportRaceStaticApi';
import { DEFAULT_NGHE_AN_PLACEMENTS } from '../data/certificatePlacements';
import { testScriptConnection } from '../data/raceStorage';
import { GOOGLE_APPS_SCRIPT_PHOTOS_CODE } from '../services/racePhotoService';
import { GOOGLE_APPS_SCRIPT_CHECKING_CODE } from '../services/logService';
import {
  getGlobalSupabaseConfig,
  testSupabaseConnection,
  SupabaseTestResult,
} from '../services/supabaseService';
import {
  Plus,
  Trophy,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  FolderSync,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Code2,
  Eye,
  Sliders,
  Sparkles,
  Link2,
  Calendar,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
  Database,
  KeyRound,
  Table as TableIcon,
  Filter,
} from 'lucide-react';

interface RaceManagerTabProps {
  races: Race[];
  activeRaceId: string;
  currentPlacements: CertificatePlacements;
  onRefreshRaces: () => Promise<void>;
  onSelectRaceForPlacements: (race: Race) => void;
  onNavigateToRace: (slug: string) => void;
}

export const RaceManagerTab: React.FC<RaceManagerTabProps> = ({
  races,
  activeRaceId,
  currentPlacements,
  onRefreshRaces,
  onSelectRaceForPlacements,
  onNavigateToRace,
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBgUrl, setFormBgUrl] = useState('/NA26.png');
  const [formBgDataUrl, setFormBgDataUrl] = useState<string | null>(null);
  const [formScriptUrl, setFormScriptUrl] = useState('');
  const [formPhotosScriptUrl, setFormPhotosScriptUrl] = useState('');
  const [formCheckingScriptUrl, setFormCheckingScriptUrl] = useState('');
  const [formSupabaseUrl, setFormSupabaseUrl] = useState('');
  const [formSupabaseAnonKey, setFormSupabaseAnonKey] = useState('');
  const [formSupabaseTable, setFormSupabaseTable] = useState('runners');
  const [formSupabaseRaceColumn, setFormSupabaseRaceColumn] = useState('Race');
  const [formSupabaseRaceFilter, setFormSupabaseRaceFilter] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<SupabaseTestResult | null>(null);
  const [formDate, setFormDate] = useState('2026');
  const [formLocation, setFormLocation] = useState('');
  const [formPlacements, setFormPlacements] = useState<CertificatePlacements>(
    () => currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS
  );
  const [showPlacementsSection, setShowPlacementsSection] = useState(true);

  // Modal for Viewing Google Apps Script Code for Photos
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTestingPhotosScript, setIsTestingPhotosScript] = useState(false);
  const [photosScriptTestResult, setPhotosScriptTestResult] = useState<{
    success: boolean;
    count?: number;
    message: string;
  } | null>(null);

  // Modal for Viewing Google Apps Script Code for CHECKING Logs
  const [showCheckingScriptModal, setShowCheckingScriptModal] = useState(false);
  const [copiedCheckingScript, setCopiedCheckingScript] = useState(false);
  const [isTestingCheckingScript, setIsTestingCheckingScript] = useState(false);
  const [checkingScriptTestResult, setCheckingScriptTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Status & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [savedRaceForExport, setSavedRaceForExport] = useState<Race | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // JSON File Input Ref for Import
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [folderScanMsg, setFolderScanMsg] = useState<string | null>(null);

  // Script Connection Testing
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{
    success: boolean;
    count?: number;
    message: string;
  } | null>(null);

  // File input ref for certificate background upload
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to slugify string
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOpenCreateModal = () => {
    setEditingRace(null);
    setFormName('');
    setFormSlug('');
    setFormCode('');
    setFormBgUrl('/NA26.png');
    setFormBgDataUrl(null);
    setFormScriptUrl('');
    setFormPhotosScriptUrl('');
    setFormCheckingScriptUrl('');
    const globalSb = getGlobalSupabaseConfig();
    setFormSupabaseUrl(globalSb.url || '');
    setFormSupabaseAnonKey(globalSb.anonKey || '');
    setFormSupabaseTable(globalSb.table || 'runners');
    setFormSupabaseRaceColumn(globalSb.raceColumn || 'Race');
    setFormSupabaseRaceFilter('');
    setFormDate('2026');
    setFormLocation('');
    setFormPlacements(currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS);
    setFormError(null);
    setSaveSuccessMsg(null);
    setSavedRaceForExport(null);
    setScriptTestResult(null);
    setPhotosScriptTestResult(null);
    setCheckingScriptTestResult(null);
    setSupabaseTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (race: Race) => {
    setEditingRace(race);
    setFormName(race.name);
    setFormSlug(race.slug);
    setFormCode(race.code);
    setFormBgUrl(race.defaultBgUrl || '/NA26.png');
    setFormBgDataUrl(null);
    setFormScriptUrl(race.appsScriptUrl || '');
    setFormPhotosScriptUrl(race.photosScriptUrl || '');
    setFormCheckingScriptUrl(race.checkingScriptUrl || '');
    const globalSb = getGlobalSupabaseConfig();
    setFormSupabaseUrl(race.supabaseUrl || globalSb.url || '');
    setFormSupabaseAnonKey(race.supabaseAnonKey || globalSb.anonKey || '');
    setFormSupabaseTable(race.supabaseTable || globalSb.table || 'runners');
    setFormSupabaseRaceColumn(race.supabaseRaceColumn || globalSb.raceColumn || 'Race');
    setFormSupabaseRaceFilter(race.supabaseRaceFilter || race.code || '');
    setFormDate(race.date || '2026');
    setFormLocation(race.locationFull || '');
    setFormPlacements(race.placements || currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS);
    setFormError(null);
    setSaveSuccessMsg(null);
    setSavedRaceForExport(null);
    setScriptTestResult(null);
    setPhotosScriptTestResult(null);
    setCheckingScriptTestResult(null);
    setSupabaseTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenCloneModal = (sourceRace: Race) => {
    // Nhân bản là tạo mới 1 giải dựa trên giải đã có
    setEditingRace(null);
    setFormName(`${sourceRace.name} (Bản sao)`);
    setFormSlug(`${sourceRace.slug}-copy`);
    // Gợi ý mã giải mới (thêm C)
    const baseCode = sourceRace.code ? `${sourceRace.code}C` : '';
    setFormCode(baseCode);
    setFormBgUrl(sourceRace.defaultBgUrl || '/NA26.png');
    setFormBgDataUrl(null);
    setFormScriptUrl(sourceRace.appsScriptUrl || '');
    setFormPhotosScriptUrl(sourceRace.photosScriptUrl || '');
    setFormCheckingScriptUrl(sourceRace.checkingScriptUrl || '');
    const globalSb = getGlobalSupabaseConfig();
    setFormSupabaseUrl(sourceRace.supabaseUrl || globalSb.url || '');
    setFormSupabaseAnonKey(sourceRace.supabaseAnonKey || globalSb.anonKey || '');
    setFormSupabaseTable(sourceRace.supabaseTable || globalSb.table || 'runners');
    setFormSupabaseRaceColumn(sourceRace.supabaseRaceColumn || globalSb.raceColumn || 'Race');
    setFormSupabaseRaceFilter(sourceRace.supabaseRaceFilter || '');
    setFormDate(sourceRace.date || '2026');
    setFormLocation(sourceRace.locationFull || '');
    // Sao chép toàn bộ toạ độ phôi hiện có của giải nguồn
    const sourcePlacements =
      sourceRace.id === activeRaceId && currentPlacements && Object.keys(currentPlacements).length > 0
        ? currentPlacements
        : (sourceRace.placements || currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS);
    setFormPlacements(JSON.parse(JSON.stringify(sourcePlacements)));
    setFormError(null);
    setSaveSuccessMsg(`Đã nhân bản toàn bộ cấu hình từ giải "${sourceRace.name}". Bạn chỉ cần chỉnh lại Tên, URL slug hoặc Mã giải rồi bấm "Lưu & Khởi Tạo Giải".`);
    setSavedRaceForExport(null);
    setScriptTestResult(null);
    setPhotosScriptTestResult(null);
    setCheckingScriptTestResult(null);
    setSupabaseTestResult(null);
    setIsModalOpen(true);
  };

  // Import from Static API JSON file (.json)
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingJson(true);
    try {
      const { raceInfo, placements: importedPlacements } = await importRaceFromStaticApi(file);

      // Thử lưu trực tiếp vào backend API và ghi file public/races/${slug}.json
      try {
        const resp = await fetch('/api/admin/import-static-race', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: sessionStorage.getItem('vm_admin_password') || '',
            raceData: { ...raceInfo, placements: importedPlacements },
          }),
        });
        if (resp.ok) {
          const resData = await resp.json();
          await onRefreshRaces();
          setFolderScanMsg(`✅ ${resData.message || `Đã nạp thành công giải "${raceInfo.name}"!`}`);
          setTimeout(() => setFolderScanMsg(null), 6000);
          return;
        }
      } catch {}

      // Fallback: đổ dữ liệu vào form để người dùng xem và bấm Lưu
      setEditingRace(null);
      if (raceInfo.name) setFormName(raceInfo.name);
      if (raceInfo.slug) setFormSlug(raceInfo.slug);
      if (raceInfo.code) setFormCode(raceInfo.code);
      if (raceInfo.defaultBgUrl) setFormBgUrl(raceInfo.defaultBgUrl);
      if (raceInfo.appsScriptUrl) setFormScriptUrl(raceInfo.appsScriptUrl);
      if (raceInfo.date) setFormDate(raceInfo.date);
      if (raceInfo.locationFull) setFormLocation(raceInfo.locationFull);
      if (importedPlacements && Object.keys(importedPlacements).length > 0) {
        setFormPlacements(importedPlacements);
      }

      setFormError(null);
      setSaveSuccessMsg(
        'Đã đọc thành công thông số giải và toạ độ phôi từ file API tĩnh (.json)! Vui lòng bấm "Lưu & Khởi Tạo Giải".'
      );
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhập file JSON');
    } finally {
      setIsImportingJson(false);
      e.target.value = '';
    }
  };

  // Quét lại thư mục public/races/ để nhận giải mới ném vào code
  const handleScanRacesFolder = async () => {
    setIsScanningFolder(true);
    try {
      try {
        localStorage.removeItem('vm_all_races_cache_v2');
      } catch {}
      await onRefreshRaces();
      setFolderScanMsg('Đã quét lại thư mục public/races/ và đồng bộ toàn bộ giải đấu vào hệ thống!');
      setTimeout(() => setFolderScanMsg(null), 5000);
    } catch (err: any) {
      alert('Lỗi quét thư mục: ' + (err.message || 'Không thể kết nối'));
    } finally {
      setIsScanningFolder(false);
    }
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingRace) {
      const generatedSlug = slugify(val);
      setFormSlug(generatedSlug);
      // Auto generate code from uppercase initials
      const words = val.trim().split(/\s+/);
      const codeSuggestion = words
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 4) + '26';
      setFormCode(codeSuggestion || 'VM26');
    }
  };

  // Handle certificate background upload
  const handleBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormBgDataUrl(dataUrl);
      setFormBgUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Test script connection
  const handleTestScript = async () => {
    if (!formScriptUrl.trim()) {
      setScriptTestResult({
        success: false,
        message: 'Vui lòng nhập đường link Google Apps Script trước khi kiểm tra.',
      });
      return;
    }
    setIsTestingScript(true);
    setScriptTestResult(null);
    try {
      const result = await testScriptConnection(formScriptUrl);
      setScriptTestResult(result);
    } catch (err: any) {
      setScriptTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối script',
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  // Kiểm tra kết nối thử nghiệm đến Script Ảnh Thi Đấu (Cột BIB & IMG)
  const handleTestPhotosScript = async () => {
    const scriptUrl = formPhotosScriptUrl.trim();
    if (!scriptUrl) {
      setPhotosScriptTestResult({
        success: false,
        message: 'Vui lòng nhập đường link Google Apps Script ảnh thi đấu trước khi kiểm tra.',
      });
      return;
    }
    setIsTestingPhotosScript(true);
    setPhotosScriptTestResult(null);
    try {
      let data: any = null;

      // 1. Thử gọi trực tiếp từ trình duyệt (Client-Side Static)
      try {
        const directResp = await fetch(scriptUrl, {
          redirect: 'follow',
          headers: { 'Accept': 'application/json, text/plain, */*' },
        });
        if (directResp.ok) {
          const text = await directResp.text();
          const trimmed = text.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            data = JSON.parse(trimmed);
          }
        }
      } catch (directErr) {
        console.warn('Lỗi gọi trực tiếp test script ảnh:', directErr);
      }

      // 2. Thử qua proxy nội bộ nếu có
      if (!data) {
        try {
          const resp = await fetch(`/api/race-photos?url=${encodeURIComponent(scriptUrl)}`);
          if (resp.ok) {
            const text = await resp.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              data = JSON.parse(text.trim());
            }
          }
        } catch {}
      }

      // 3. Fallback qua CORS proxy
      if (!data) {
        try {
          const corsProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(scriptUrl)}`;
          const corsResp = await fetch(corsProxy);
          if (corsResp.ok) {
            const text = await corsResp.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              data = JSON.parse(text.trim());
            }
          }
        } catch {}
      }

      if (!data) {
        throw new Error('Không thể kết nối hoặc nhận phản hồi JSON từ Google Apps Script.');
      }

      const total =
        data.total ||
        (Array.isArray(data.data) ? data.data.length : data.photos ? data.photos.length : 0);
      setPhotosScriptTestResult({
        success: true,
        count: total,
        message: `✅ Kết nối thành công! Đã tìm thấy ${total} bản ghi ảnh từ Google Sheet.`,
      });
    } catch (err: any) {
      setPhotosScriptTestResult({
        success: false,
        message: `Lỗi kết nối script ảnh: ${err.message || 'Không thể lấy dữ liệu'}`,
      });
    } finally {
      setIsTestingPhotosScript(false);
    }
  };

  // Test Checking Script Connection (Sheet CHECKING)
  const handleTestCheckingScript = async () => {
    const scriptUrl = formCheckingScriptUrl.trim();
    if (!scriptUrl) {
      setCheckingScriptTestResult({
        success: false,
        message: 'Vui lòng nhập đường link Google Apps Script cho sheet CHECKING trước khi kiểm tra.',
      });
      return;
    }

    setIsTestingCheckingScript(true);
    setCheckingScriptTestResult(null);

    try {
      const resp = await fetch('/api/log-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checking',
          timestamp: new Date().toISOString(),
          bib: 'TEST_99999',
          race: formName.trim() || 'VnExpress Marathon Test',
          time: '10s (Test)',
          scriptUrl,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success !== false) {
        setCheckingScriptTestResult({
          success: true,
          message: '✅ Kết nối thành công! Đã gửi thành công dòng log mẫu [TIMESTAMP, BIB, RACE, TIME] vào tab "CHECKING".',
        });
      } else {
        setCheckingScriptTestResult({
          success: false,
          message: `Lỗi ghi log: ${data.error || 'Google Apps Script trả về lỗi hoặc chưa bật quyền Anyone'}`,
        });
      }
    } catch (err: any) {
      setCheckingScriptTestResult({
        success: false,
        message: `Lỗi kết nối: ${err.message || 'Không thể gửi dữ liệu'}`,
      });
    } finally {
      setIsTestingCheckingScript(false);
    }
  };

  // Test Supabase connection
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const globalCfg = getGlobalSupabaseConfig();
      const res = await testSupabaseConnection(
        {
          url: formSupabaseUrl.trim() || globalCfg.url || '',
          anonKey: formSupabaseAnonKey.trim() || globalCfg.anonKey || '',
          table: formSupabaseTable.trim() || 'runners',
          raceColumn: formSupabaseRaceColumn.trim() || 'Race',
          raceValue: formSupabaseRaceFilter.trim() || formCode.trim() || formSlug.trim(),
        },
        formSupabaseRaceFilter.trim() || formCode.trim() || formSlug.trim()
      );
      setSupabaseTestResult(res);
    } catch (err: any) {
      setSupabaseTestResult({
        success: false,
        message: err.message || 'Lỗi khi kiểm tra kết nối Supabase.',
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Save race
  const handleSubmitRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Vui lòng nhập Tên giải đấu.');
      return;
    }
    if (!formSlug.trim()) {
      setFormError('Vui lòng nhập URL vào trang (slug).');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSaveSuccessMsg(null);

    try {
      const cleanSlug = slugify(formSlug);
      const racePayload = {
        id: editingRace?.id || cleanSlug,
        slug: cleanSlug,
        code: formCode.trim() || cleanSlug.toUpperCase().slice(0, 6),
        name: formName.trim(),
        shortName: formName.trim(),
        defaultBgUrl: formBgUrl,
        appsScriptUrl: formScriptUrl.trim(),
        photosScriptUrl: formPhotosScriptUrl.trim(),
        checkingScriptUrl: formCheckingScriptUrl.trim(),
        supabaseUrl: formSupabaseUrl.trim(),
        supabaseAnonKey: formSupabaseAnonKey.trim(),
        supabaseTable: formSupabaseTable.trim() || 'runners',
        supabaseRaceColumn: formSupabaseRaceColumn.trim() || 'Race',
        supabaseRaceFilter: formSupabaseRaceFilter.trim() || formCode.trim() || cleanSlug,
        date: formDate.trim() || '2026',
        locationFull: formLocation.trim() || 'Việt Nam',
        placements: editingRace?.placements || currentPlacements,
      };

      const resp = await fetch('/api/admin/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: sessionStorage.getItem('vm_admin_password') || '',
          race: racePayload,
          backgroundDataUrl: formBgDataUrl,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Lỗi khi lưu giải đấu');
      }

      await onRefreshRaces();
      setSaveSuccessMsg(`Đã lưu thành công giải "${data.race.name}"!`);
      setSavedRaceForExport(data.race);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối tới máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete race
  const handleDeleteRace = async (race: Race) => {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xoá giải "${race.name}"?`);
    if (!confirmed) return;

    try {
      try {
        localStorage.removeItem('vm_all_races_cache_v2');
      } catch {}
      const resp = await fetch(`/api/admin/races/${race.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': sessionStorage.getItem('vm_admin_password') || '' },
      });
      if (resp.ok) {
        await onRefreshRaces();
      } else {
        const d = await resp.json();
        alert(d.error || 'Lỗi xoá giải');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  const copyUrl = (slug: string) => {
    const full = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(full);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Import */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJsonFile}
        className="hidden"
      />

      {/* Top Banner & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-stone-850 p-5 rounded-2xl border border-stone-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Quản Lý & Tạo Giải Đấu</h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-900/60 border border-teal-700 text-teal-300 text-xs font-semibold">
              {races.length} giải đấu
            </span>
          </div>
          <p className="text-stone-400 text-xs max-w-2xl leading-relaxed">
            Mỗi giải đấu có tên riêng, đường dẫn URL vào trang riêng, phôi nền Certificate chuẩn HD và Google Apps Script riêng để gọi dữ liệu VĐV.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Scan folder button */}
          <button
            type="button"
            onClick={handleScanRacesFolder}
            disabled={isScanningFolder}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Quét lại thư mục public/races/ để tự động nhận các file .json mới được thêm vào code"
          >
            <FolderSync className={`w-3.5 h-3.5 text-sky-400 ${isScanningFolder ? 'animate-spin' : ''}`} />
            <span>{isScanningFolder ? 'Đang quét...' : 'Quét public/races/'}</span>
          </button>

          {/* Import JSON button */}
          <button
            type="button"
            onClick={() => jsonFileInputRef.current?.click()}
            disabled={isImportingJson}
            className="px-3 py-2 bg-sky-950/70 hover:bg-sky-900/90 border border-sky-700/80 text-sky-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Nạp cấu hình giải từ file API tĩnh (.json)"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>{isImportingJson ? 'Đang đọc...' : 'Nhập File API (.json)'}</span>
          </button>

          {/* Create race */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Giải Mới</span>
          </button>
        </div>
      </div>

      {/* Folder Scan Notification Toast */}
      {folderScanMsg && (
        <div className="p-3.5 bg-sky-950/60 border border-sky-600/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-sky-200 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{folderScanMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFolderScanMsg(null)}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Guide Banner for Static Races Folder in Code */}
      <div className="bg-gradient-to-r from-sky-950/40 via-stone-900 to-teal-950/40 border border-sky-800/40 rounded-2xl p-4 text-xs text-stone-300 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-sky-300">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Cơ chế ném file API tĩnh vào source code để tự động sinh giải mới</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] bg-stone-950/80 border border-stone-800 px-2.5 py-1 rounded-lg text-amber-300">
            <span>📁 Thư mục code:</span>
            <code className="text-teal-400 font-bold">/public/races/</code>
          </div>
        </div>
        <p className="text-stone-400 leading-relaxed text-[11px]">
          Tại mỗi giải đấu bên dưới, bạn có thể bấm <strong>"Xuất API Tĩnh (.json)"</strong> để tải về file cấu hình đầy đủ toạ độ phôi và thông số giải. Sau đó, ném file này vào thư mục <code className="px-1.5 py-0.5 bg-stone-950 text-sky-300 rounded font-mono border border-stone-800">public/races/</code> (ví dụ: <code className="px-1.5 py-0.5 bg-stone-950 text-amber-300 rounded font-mono border border-stone-800">public/races/ha-long-2026.json</code>). Hệ thống sẽ tự động quét thư mục này và khởi tạo giải chạy mới với đầy đủ thông số và toạ độ phôi chuẩn xác!
        </p>
      </div>

      {/* Races Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => {
          const isActive = race.id === activeRaceId;
          const pageUrl = `${window.location.origin}/${race.slug}`;

          return (
            <div
              key={race.id}
              className={`bg-stone-850 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-teal-500/80 ring-2 ring-teal-500/20 shadow-lg'
                  : 'border-stone-800 hover:border-stone-700 shadow-md'
              }`}
            >
              {/* Card Header with Background Preview Banner */}
              <div className="relative h-32 bg-stone-900 overflow-hidden border-b border-stone-800 flex items-center justify-center group">
                <img
                  src={race.defaultBgUrl || '/NA26.png'}
                  alt={race.name}
                  className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-stone-900/90 border border-stone-700 text-white font-mono text-[11px] font-bold">
                    {race.code || race.slug.toUpperCase()}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Đang chọn</span>
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <h3 className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow-md">
                    {race.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-stone-300 mt-0.5">
                    {race.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{race.date}</span>
                      </span>
                    )}
                    {race.locationFull && (
                      <span className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{race.locationFull}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                {/* 1. URL Path */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-teal-400" />
                      <span>URL Vào Trang:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyUrl(race.slug)}
                      className="text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    >
                      {copiedSlug === race.slug ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-teal-300 text-[11px] truncate select-all">
                    /{race.slug}
                  </div>
                </div>

                {/* 2. Supabase Database Info */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Database className="w-3 h-3" />
                      <span>Cơ sở dữ liệu Supabase:</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {race.supabaseTable || 'runners'}
                    </span>
                  </div>
                  <div className="font-mono text-stone-300 text-[11px] truncate flex items-center justify-between">
                    <span>Cột {race.supabaseRaceColumn || 'Race'} =</span>
                    <span className="text-amber-300 font-bold px-1.5 py-0.2 bg-stone-800 rounded">
                      "{race.supabaseRaceFilter || race.code || race.slug}"
                    </span>
                  </div>
                  {race.checkingScriptUrl && (
                    <div className="text-[10px] font-mono text-amber-400 pt-0.5 border-t border-stone-800/80 truncate">
                      ✓ Script Log CHECKING: Đã cấu hình
                    </div>
                  )}
                </div>

                {/* 3. Action Buttons */}
                <div className="pt-2 border-t border-stone-800 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* View Page */}
                    <button
                      type="button"
                      onClick={() => onNavigateToRace(race.slug)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Mở trang tra cứu của giải này"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                      <span>Vào trang</span>
                    </button>

                    {/* Placements Studio */}
                    <button
                      type="button"
                      onClick={() => onSelectRaceForPlacements(race)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/80 text-teal-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Chỉnh toạ độ và kích thước chữ trên phôi giải này"
                    >
                      <Sliders className="w-3.5 h-3.5 text-teal-400" />
                      <span>Chỉnh phôi</span>
                    </button>
                  </div>

                  {/* Export Static API JSON (.json) */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetPlacements =
                        (race.id === activeRaceId && currentPlacements && Object.keys(currentPlacements).length > 0)
                          ? currentPlacements
                          : (race.placements || currentPlacements);
                      exportRaceStaticApi(race, targetPlacements);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-sky-950/70 hover:bg-sky-900/90 border border-sky-700/80 text-sky-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title="Xuất file API tĩnh (.json) chứa thông số và toạ độ phôi mới nhất của giải này"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Xuất API Tĩnh (.json)</span>
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/60">
                    <span className="text-[10px] text-stone-500 font-mono truncate">
                      public/races/{race.slug}.json
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Clone / Nhân bản */}
                      <button
                        type="button"
                        onClick={() => handleOpenCloneModal(race)}
                        className="px-2 py-1 rounded-lg bg-teal-950/70 hover:bg-teal-900/90 border border-teal-700/80 text-teal-300 hover:text-white transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                        title="Nhân bản (Clone) giải này để tạo giải mới nhanh chóng"
                      >
                        <Copy className="w-3 h-3 text-teal-400" />
                        <span>Nhân bản</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(race)}
                        className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                        title="Chỉnh sửa giải đấu"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>

                      {/* Delete (if not default) */}
                      {race.id !== 'nghe-an-2026' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRace(race)}
                          className="p-1 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                          title="Xoá giải đấu"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT / CLONE RACE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-5 flex justify-center items-start">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full my-auto sm:my-6 shadow-2xl text-stone-100 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header: PINNED AT TOP (Không bao giờ bị cụt phần đầu) */}
            <div className="flex items-center justify-between border-b border-stone-800 p-5 sm:p-6 pb-4 bg-stone-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingRace
                      ? 'Chỉnh Sửa Cài Đặt Giải Đấu'
                      : formName.includes('(Bản sao)')
                      ? 'Nhân Bản & Tạo Giải Mới'
                      : 'Tạo Giải Đấu Mới'}
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Cấu hình gồm Tên giải, URL vào trang, Phôi nền Certificate và Nguồn dữ liệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                title="Đóng popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content (Toàn bộ các mục form cuộn mượt bên trong) */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Success message banner with Export Excel action */}
              {saveSuccessMsg && (
                <div className="mb-4 p-4 bg-emerald-950/70 border border-emerald-600 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {savedRaceForExport && (
                      <button
                        type="button"
                        onClick={() => exportRaceStaticApi(savedRaceForExport, currentPlacements)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Tải file API tĩnh (.json) để ném vào public/races/"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Xuất File API Tĩnh (.json)</span>
                      </button>
                    )}
                    {savedRaceForExport && (
                      <button
                        type="button"
                        onClick={() => onNavigateToRace(savedRaceForExport.slug)}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem trang giải ngay</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="race-edit-form" onSubmit={handleSubmitRace} className="space-y-4">
              {/* 1/ Tên giải */}
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  1/ Tên Giải Đấu <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: VnExpress Marathon Ha Long 2026"
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              {/* 2/ URL ĐỂ VÀO TRANG */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-200 mb-1">
                    2/ URL Để Vào Trang (Slug) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus-within:border-teal-500">
                    <span className="text-stone-500 font-mono select-none">/</span>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(slugify(e.target.value))}
                      placeholder="ha-long-2026"
                      className="w-full bg-transparent text-teal-300 font-mono focus:outline-none ml-0.5"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Ví dụ truy cập: <span className="font-mono text-teal-400">{window.location.origin}/{formSlug || 'ten-giai'}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Mã giải (Code)
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="HL26"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* 3/ Background cho phần Certificate */}
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  3/ Background Cho Phần Certificate (Giống ảnh NA26)
                </label>
                <div className="p-3 bg-stone-800/80 border border-stone-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail preview */}
                    <div className="w-16 h-24 rounded-lg bg-stone-900 border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {formBgUrl ? (
                        <img
                          src={formBgUrl}
                          alt="Certificate Background Preview"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-stone-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={bgFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgFileSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh phôi mới (PNG/JPG)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormBgUrl('/NA26.png');
                            setFormBgDataUrl(null);
                          }}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 text-[11px] rounded-lg border border-stone-700 cursor-pointer"
                        >
                          Dùng phôi NA26
                        </button>
                      </div>

                      {/* Hoặc dán link ảnh Online / Google Drive */}
                      <div className="mt-2 space-y-1">
                        <label className="text-[11px] text-stone-300 font-medium flex items-center gap-1.5">
                          <span>Hoặc dán link ảnh online (Google Drive / Imgur / CDN):</span>
                        </label>
                        <input
                          type="text"
                          value={formBgUrl.startsWith('data:') ? '' : formBgUrl}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setFormBgUrl(val || '/NA26.png');
                            setFormBgDataUrl(null);
                          }}
                          placeholder="https://drive.google.com/file/d/... hoặc /backgrounds/ten_anh.png"
                          className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-teal-500 font-mono"
                        />
                      </div>

                      <div className="text-[11px] text-stone-400">
                        {formBgDataUrl ? (
                          <span className="text-emerald-400 font-medium">✓ Đã chọn ảnh mới từ máy (sẽ được lưu vào hệ thống)</span>
                        ) : (
                          <span>Đang dùng: <code className="text-teal-400 font-mono">{formBgUrl}</code> (Kích thước in chuẩn HD: 1469 × 3508 px)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4/ Kết Nối Database Supabase */}
              <div className="p-4 bg-stone-900 border border-emerald-800/60 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>4/ Cơ Sở Dữ Liệu Supabase (Data Runners)</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-700">
                          Khuyên dùng
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Kết nối trực tiếp database Supabase thay thế Google Apps Script
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isTestingSupabase ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Kiểm tra kết nối Supabase</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Supabase URL */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      API URL (Project URL)
                    </label>
                    <input
                      type="text"
                      value={formSupabaseUrl}
                      onChange={(e) => setFormSupabaseUrl(e.target.value)}
                      placeholder="https://xyzproject.supabase.co"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-emerald-300 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Supabase Anon Key */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Publishable key (Anon Key)
                    </label>
                    <input
                      type="password"
                      value={formSupabaseAnonKey}
                      onChange={(e) => setFormSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOi... hoặc để trống dùng key chung"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Table name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1 flex items-center gap-1">
                      <TableIcon className="w-3 h-3 text-sky-400" />
                      <span>Tên Bảng (Table)</span>
                    </label>
                    <input
                      type="text"
                      value={formSupabaseTable}
                      onChange={(e) => setFormSupabaseTable(e.target.value)}
                      placeholder="runners"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-sky-300 placeholder-stone-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Race column */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-purple-400" />
                      <span>Cột lọc giải (Race)</span>
                    </label>
                    <input
                      type="text"
                      value={formSupabaseRaceColumn}
                      onChange={(e) => setFormSupabaseRaceColumn(e.target.value)}
                      placeholder="Race"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-purple-300 placeholder-stone-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Race filter value */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Giá trị lọc của giải này
                    </label>
                    <input
                      type="text"
                      value={formSupabaseRaceFilter}
                      onChange={(e) => setFormSupabaseRaceFilter(e.target.value)}
                      placeholder={formCode || formSlug || 'Ví dụ: NA26'}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Supabase test feedback */}
                {supabaseTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      supabaseTestResult.success
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-600 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {supabaseTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{supabaseTestResult.message}</span>
                    </div>

                    {supabaseTestResult.detectedRaces && supabaseTestResult.detectedRaces.length > 0 && (
                      <div className="pt-1.5 border-t border-emerald-800/40 text-[11px] flex items-center gap-2 flex-wrap">
                        <span className="text-stone-400">Các giải có sẵn:</span>
                        {supabaseTestResult.detectedRaces.map((rVal) => (
                          <button
                            key={rVal}
                            type="button"
                            onClick={() => setFormSupabaseRaceFilter(rVal)}
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-750 text-amber-300 font-mono text-[10px] border border-stone-700 cursor-pointer"
                          >
                            {rVal}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Legacy Apps Script URL input */}
                <details className="text-[11px] text-stone-400 pt-1 border-t border-stone-800">
                  <summary className="cursor-pointer hover:text-stone-300 py-1 font-medium">
                    Tuỳ chọn thay thế: Dùng Google Apps Script cũ (nếu có)
                  </summary>
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      value={formScriptUrl}
                      onChange={(e) => setFormScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-stone-300"
                    />
                  </div>
                </details>
              </div>

              {/* 5/ Script Ảnh Thi Đấu (Cột BIB & IMG từ Google Sheet) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-200">
                    5/ Script Ảnh Thi Đấu (Google Sheet: Cột BIB & Cột IMG)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScriptModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Xem & Copy mã Script</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestPhotosScript}
                      disabled={isTestingPhotosScript || !formPhotosScriptUrl.trim()}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingPhotosScript ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Kiểm tra ảnh</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formPhotosScriptUrl}
                  onChange={(e) => setFormPhotosScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 font-mono focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Đường link Web App Google Apps Script lấy ảnh theo 2 cột: <strong>BIB</strong> và <strong>IMG</strong> (Link Google Drive hoặc URL ảnh trực tiếp).
                </p>

                {photosScriptTestResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      photosScriptTestResult.success
                        ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                        : 'bg-amber-950/50 border-amber-700 text-amber-300'
                    }`}
                  >
                    {photosScriptTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{photosScriptTestResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 6/ Script Ghi Log Tải Ảnh (Sheet: CHECKING) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-200">
                    6/ Script Ghi Log Tải Ảnh HD (Sheet: CHECKING - 4 Cột: TIMESTAMP, BIB, RACE, TIME)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckingScriptModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Xem & Copy mã Script</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestCheckingScript}
                      disabled={isTestingCheckingScript || !formCheckingScriptUrl.trim()}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingCheckingScript ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Kiểm tra ghi log</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formCheckingScriptUrl}
                  onChange={(e) => setFormCheckingScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec (Để trống sẽ dùng chung script giải hoặc mặc định)"
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 font-mono focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Khi user bấm nút "Tải ảnh HD", hệ thống sẽ tự động lưu 4 thông tin: <strong>TIMESTAMP</strong> (thời gian click), <strong>BIB</strong> (số BIB), <strong>RACE</strong> (tên giải), <strong>TIME</strong> (thời gian vào trang đến lúc click) vào tab <strong>CHECKING</strong>.
                </p>

                {/* Checking script test result badge */}
                {checkingScriptTestResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      checkingScriptTestResult.success
                        ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                        : 'bg-amber-950/50 border-amber-700 text-amber-300'
                    }`}
                  >
                    {checkingScriptTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{checkingScriptTestResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin bổ sung */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Ngày diễn ra giải
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="26/07/2026"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Địa điểm tổ chức
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="TP. Hạ Long, Quảng Ninh"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              </form>
            </div>

            {/* Pinned Modal Footer (Các nút bấm luôn cố định dưới chân, không cần cuộn) */}
            <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-900/95 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                form="race-edit-form"
                disabled={isSaving}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{editingRace ? 'Lưu Thay Đổi' : 'Lưu & Khởi Tạo Giải'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MÃ GOOGLE APPS SCRIPT CHO GOOGLE SHEET ẢNH (2 CỘT: BIB & IMG) */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-5 flex justify-center items-start">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full my-auto sm:my-6 shadow-2xl text-stone-100 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 p-5 sm:p-6 pb-3.5 bg-stone-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mã Google Apps Script: Lấy ảnh thi đấu theo BIB
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Gắn vào Google Sheet 2 cột (Cột A: BIB, Cột B: IMG link ảnh)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">

            {/* Quick 3-Step Guide */}
            <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl text-xs space-y-1.5 text-stone-300">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3 Bước triển khai cực nhanh:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                <li>
                  Tạo Google Sheet có 2 cột: Cột 1 là <strong>BIB</strong>, Cột 2 là <strong>IMG</strong> (Link ảnh Drive hoặc web).
                </li>
                <li>
                  Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>, xoá hết code cũ rồi dán toàn bộ đoạn mã bên dưới vào.
                </li>
                <li>
                  Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Bản triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web App)</strong> &gt; Tại mục <i>Ai có quyền truy cập</i> chọn <strong>Bất kỳ ai (Anyone)</strong> &gt; Triển khai và copy đường link dán vào ô trên!
                </li>
              </ol>
            </div>

            {/* Code Box with Copy Button */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-stone-800 rounded-t-xl border border-stone-700 border-b-0 text-[11px] text-stone-400 font-mono">
                <span>Code.gs (Google Apps Script)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_PHOTOS_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Đã sao chép!' : 'Sao chép toàn bộ code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-stone-950 border border-stone-700 rounded-b-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-72 scrollbar-thin">
                {GOOGLE_APPS_SCRIPT_PHOTOS_CODE}
              </pre>
            </div>

            </div>

            <div className="flex items-center justify-end p-4 border-t border-stone-800 bg-stone-900 shrink-0">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MÃ GOOGLE APPS SCRIPT CHO SHEET CHECKING (TIMESTAMP, BIB, RACE, TIME) */}
      {showCheckingScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-5 flex justify-center items-start">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full my-auto sm:my-6 shadow-2xl text-stone-100 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 p-5 sm:p-6 pb-3.5 bg-stone-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mã Google Apps Script: Ghi Log Tải Ảnh (Sheet: CHECKING)
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Tự động ghi 4 trường: TIMESTAMP, BIB, RACE, TIME mỗi khi user bấm "Tải ảnh HD"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckingScriptModal(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">

            {/* Quick 3-Step Guide */}
            <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl text-xs space-y-1.5 text-stone-300">
              <div className="font-bold text-teal-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hướng dẫn cài đặt nhanh:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                <li>
                  Mở Google Sheet của bạn (chứa hoặc sẽ tạo tab <strong>CHECKING</strong>).
                </li>
                <li>
                  Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>, dán toàn bộ đoạn code bên dưới vào và bấm lưu (Ctrl+S).
                </li>
                <li>
                  Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Bản triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web App)</strong> &gt; Tại mục <i>Ai có quyền truy cập (Who has access)</i> chọn <strong>Bất kỳ ai (Anyone)</strong> &gt; Bấm Triển khai và copy đường link Web App dán vào hệ thống!
                </li>
              </ol>
            </div>

            {/* Code Box with Copy Button */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-stone-800 rounded-t-xl border border-stone-700 border-b-0 text-[11px] text-stone-400 font-mono">
                <span>Code.gs (Ghi log CHECKING)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CHECKING_CODE);
                    setCopiedCheckingScript(true);
                    setTimeout(() => setCopiedCheckingScript(false), 3000);
                  }}
                  className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {copiedCheckingScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCheckingScript ? 'Đã sao chép!' : 'Sao chép toàn bộ code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-stone-950 border border-stone-700 rounded-b-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-72 scrollbar-thin">
                {GOOGLE_APPS_SCRIPT_CHECKING_CODE}
              </pre>
            </div>

            </div>

            <div className="flex items-center justify-end p-4 border-t border-stone-800 bg-stone-900 shrink-0">
              <button
                type="button"
                onClick={() => setShowCheckingScriptModal(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
