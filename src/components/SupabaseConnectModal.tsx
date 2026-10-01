import React, { useState, useEffect } from 'react';
import {
  Database,
  KeyRound,
  Table as TableIcon,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Zap,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { Race } from '../data/races';
import { SupabaseConfig, Runner } from '../types';
import {
  getGlobalSupabaseConfig,
  saveGlobalSupabaseConfig,
  testSupabaseConnection,
  SupabaseTestResult,
} from '../services/supabaseService';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRace: Race;
  onSaveAndSync: (config: SupabaseConfig, applyToRaceOnly: boolean) => Promise<void>;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
  activeRace,
  onSaveAndSync,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [table, setTable] = useState('runners');
  const [raceColumn, setRaceColumn] = useState('Race');
  const [raceValue, setRaceValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [applyGlobally, setApplyGlobally] = useState(true);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SupabaseTestResult | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Initialize values when opened
  useEffect(() => {
    if (!isOpen) return;
    const globalCfg = getGlobalSupabaseConfig();
    setUrl(activeRace.supabaseUrl || globalCfg.url || '');
    setAnonKey(activeRace.supabaseAnonKey || globalCfg.anonKey || '');
    setTable(activeRace.supabaseTable || globalCfg.table || 'runners');
    setRaceColumn(activeRace.supabaseRaceColumn || globalCfg.raceColumn || 'Race');
    setRaceValue(
      activeRace.supabaseRaceFilter ||
        globalCfg.raceValue ||
        activeRace.code ||
        activeRace.slug ||
        ''
    );
    setTestResult(null);
  }, [isOpen, activeRace]);

  if (!isOpen) return null;

  const currentConfig: SupabaseConfig = {
    url: url.trim(),
    anonKey: anonKey.trim(),
    table: table.trim() || 'runners',
    raceColumn: raceColumn.trim() || 'Race',
    raceValue: raceValue.trim(),
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(currentConfig, raceValue.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi khi gửi yêu cầu tới Supabase.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Vui lòng nhập API URL của Supabase');
      return;
    }
    if (!anonKey.trim()) {
      alert('Vui lòng nhập Publishable key (Anon key)');
      return;
    }

    setIsSaving(true);
    try {
      if (applyGlobally) {
        saveGlobalSupabaseConfig({
          url: url.trim(),
          anonKey: anonKey.trim(),
          table: table.trim() || 'runners',
          raceColumn: raceColumn.trim() || 'Race',
        });
      }
      await onSaveAndSync(currentConfig, !applyGlobally);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Kết Nối Supabase Database</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  REST API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập thông tin kết nối bảng dữ liệu kết quả vận động viên từ dự án Supabase của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Active Race Target Info */}
          <div className="p-3 bg-slate-800/70 border border-slate-700/80 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Giải đang áp dụng:</span>
              <span className="font-bold text-white">{activeRace.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-[#FFD100] border border-rose-800/80 font-mono font-bold">
              Mã: {activeRace.code}
            </span>
          </div>

          {/* 1. API URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                API URL (Project URL) <span className="text-rose-400">*</span>
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzprojectref.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lấy tại: Project Settings &rarr; API &rarr; Project URL
            </p>
          </div>

          {/* 2. Publishable key */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Publishable key (Anon Public Key) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOi... hoặc sb_publishable_..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-amber-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Khóa công khai (anon/public) an toàn để gọi trực tiếp từ trình duyệt web.
            </p>
          </div>

          {/* 3 & 4. Table name & Race column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-sky-400" />
                Tên Bảng (Table) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="runners"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-sky-300 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tên bảng lưu kết quả VĐV (mặc định: <code>runners</code>)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                Cột lọc giải (Race column) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={raceColumn}
                onChange={(e) => setRaceColumn(e.target.value)}
                placeholder="Race"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tên cột trong bảng dùng để phân biệt các giải (mặc định: <code>Race</code>)
              </p>
            </div>
          </div>

          {/* 5. Race filter value */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                Giá trị lọc ở cột {raceColumn || 'Race'} cho giải này
              </span>
              <span className="text-[11px] text-slate-400">
                Để trống nếu muốn lấy toàn bộ bảng
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={raceValue}
                onChange={(e) => setRaceValue(e.target.value)}
                placeholder={activeRace.code || activeRace.slug || 'Ví dụ: NA26, VM26...'}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setRaceValue(activeRace.code || activeRace.slug || '')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Dùng mã giải mặc định"
              >
                Gợi ý: {activeRace.code || activeRace.slug}
              </button>
            </div>

            {/* Quick selector if distinct races detected from test query */}
            {testResult?.detectedRaces && testResult.detectedRaces.length > 0 && (
              <div className="mt-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Phát hiện các giải có sẵn trong cột {raceColumn} của bảng:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {testResult.detectedRaces.map((rVal) => (
                    <button
                      key={rVal}
                      type="button"
                      onClick={() => setRaceValue(rVal)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        raceValue === rVal
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {rVal}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test connection action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url.trim() || !anonKey.trim()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Đang kiểm tra kết nối Supabase...' : 'Kiểm tra kết nối & Xem trước dữ liệu'}</span>
            </button>
          </div>

          {/* Test Results Display */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2.5 animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-600/70 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium leading-relaxed">
                  {testResult.message}
                </div>
              </div>

              {testResult.success && testResult.sampleRunners && testResult.sampleRunners.length > 0 && (
                <div className="pt-2 border-t border-emerald-800/50 space-y-1.5">
                  <div className="text-[11px] text-emerald-300 font-semibold flex items-center justify-between">
                    <span>Mẫu VĐV tìm thấy ({testResult.sampleRunners.length} người đầu):</span>
                    {testResult.durationMs && (
                      <span className="font-mono text-[10px] text-emerald-400">
                        Phản hồi: {testResult.durationMs}ms
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {testResult.sampleRunners.map((r, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 bg-slate-900/80 border border-emerald-900/60 rounded-lg flex items-center justify-between text-[11px] font-mono text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300">BIB {r.bib}</span>
                          <span className="text-white truncate max-w-[140px] font-sans font-medium">
                            {r.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <span className="px-1.5 py-0.2 bg-slate-800 rounded text-emerald-300">
                            {r.distance}
                          </span>
                          <span className="text-amber-200">{r.chipTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option: Apply globally */}
          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyGlobally}
                onChange={(e) => setApplyGlobally(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
              />
              <span>Lưu API URL & Key làm cấu hình mặc định cho tất cả các giải khác</span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !url.trim() || !anonKey.trim()}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu & tải dữ liệu...' : 'Lưu & Đồng Bộ Dữ Liệu Ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
