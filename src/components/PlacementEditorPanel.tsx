import React from 'react';
import {
  RotateCcw,
  Sliders,
  Type,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  X,
  Target,
  Save,
  Copy,
  Check,
  Loader2,
  FileCode,
} from 'lucide-react';
import { CertificatePlacements, CertificateFieldPlacement } from '../types';
import { DEFAULT_NGHE_AN_PLACEMENTS } from '../data/certificatePlacements';

interface PlacementEditorPanelProps {
  placements: CertificatePlacements;
  onChangePlacements: (newPlacements: CertificatePlacements) => void;
  onResetPlacements: () => void;
  onClose: () => void;
  activeFieldId: string;
  onSelectFieldId: (id: string) => void;
  showGuide: boolean;
  onToggleGuide: () => void;
  onSaveToRace?: () => void;
  isSavingToRace?: boolean;
  onExportStaticApi?: () => void;
  onCopyCode?: () => void;
}

const PRESET_COLORS = [
  { label: 'Trắng', hex: '#FFFFFF' },
  { label: 'Vàng chanh', hex: '#FFF100' },
  { label: 'Xanh đen', hex: '#042738' },
  { label: 'Đen', hex: '#000000' },
  { label: 'Mint', hex: '#2DD4BF' },
  { label: 'Cam', hex: '#F97316' },
  { label: 'Gold', hex: '#FACC15' },
];

export const PlacementEditorPanel: React.FC<PlacementEditorPanelProps> = ({
  placements,
  onChangePlacements,
  onResetPlacements,
  onClose,
  activeFieldId,
  onSelectFieldId,
  showGuide,
  onToggleGuide,
  onSaveToRace,
  isSavingToRace,
  onExportStaticApi,
  onCopyCode,
}) => {
  const fields: CertificateFieldPlacement[] = Object.values(placements);

  const activeField: CertificateFieldPlacement =
    placements[activeFieldId] ||
    DEFAULT_NGHE_AN_PLACEMENTS[activeFieldId] ||
    fields[0] ||
    DEFAULT_NGHE_AN_PLACEMENTS.name;

  const updateField = (patch: Partial<CertificateFieldPlacement>) => {
    const updated = {
      ...placements,
      [activeField.id]: {
        ...activeField,
        ...patch,
      },
    };
    onChangePlacements(updated);
  };

  const handleResetCurrentField = () => {
    const defaultVal = DEFAULT_NGHE_AN_PLACEMENTS[activeField.id];
    if (defaultVal) {
      updateField(defaultVal);
    }
  };

  return (
    <div
      id="placement-editor-inline-panel"
      className="w-full bg-white rounded-2xl shadow-lg border border-teal-200/90 flex flex-col overflow-hidden animate-in fade-in duration-200"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-900 to-stone-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
            <Sliders className="w-3.5 h-3.5 text-teal-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold truncate tracking-tight">Chỉnh Vị Trí & Size Text</h3>
            <p className="text-[10px] text-teal-300/80 truncate">Preview thời gian thực trên phôi</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Guide Crosshair */}
          <button
            type="button"
            onClick={onToggleGuide}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showGuide
                ? 'bg-cyan-500 text-stone-950 font-bold shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-teal-200'
            }`}
            title="Bật/Tắt tâm định vị trên ảnh chứng nhận"
          >
            <Target className="w-3 h-3" />
            <span className="hidden xs:inline">Tâm</span>
            <span className="text-[9px] uppercase">{showGuide ? 'Bật' : 'Tắt'}</span>
          </button>

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng bảng công cụ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Field Selector Tabs */}
      <div className="p-2.5 bg-stone-50 border-b border-stone-200/80">
        <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Chọn giá trị cần chỉnh:</span>
          <span className="text-[10px] font-mono text-teal-700 font-bold">8 trường dữ liệu</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {fields.map((field) => {
            const isSelected = field.id === activeField.id;
            return (
              <button
                key={field.id}
                type="button"
                id={`tab-field-${field.id}`}
                onClick={() => onSelectFieldId(field.id)}
                className={`px-2 py-1.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center justify-between gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-xs font-bold ring-2 ring-teal-600/30'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                <span className="truncate text-[11px]">{field.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Area for Active Field */}
      <div className="p-3.5 space-y-3.5 max-h-[calc(100vh-280px)] lg:max-h-[620px] overflow-y-auto">
        {/* Active Field Header & Quick Reset */}
        <div className="flex items-center justify-between bg-teal-50/60 border border-teal-100 rounded-xl p-2 px-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            <span className="text-xs font-bold text-teal-950">{activeField.label}</span>
            <span className="text-[10px] text-teal-700 font-mono">({activeField.id})</span>
          </div>
          <button
            type="button"
            onClick={handleResetCurrentField}
            className="text-[11px] font-semibold text-teal-800 hover:text-teal-950 flex items-center gap-1 hover:underline cursor-pointer"
            title="Khôi phục giá trị mặc định cho mục này"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Mặc định</span>
          </button>
        </div>

        {/* 1. Tọa độ X (%) */}
        <div className="space-y-1.5 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-teal-600" />
              <span>Tọa độ ngang X (%)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={activeField.x}
                onChange={(e) => updateField({ x: parseFloat(e.target.value) || 0 })}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold bg-white border border-stone-300 rounded-lg text-teal-900"
              />
              <span className="text-stone-500 font-mono text-xs">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateField({ x: Math.max(0, parseFloat((activeField.x - 0.5).toFixed(2))) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch sang trái 0.5%"
            >
              -0.5%
            </button>
            <button
              type="button"
              onClick={() => updateField({ x: Math.max(0, parseFloat((activeField.x - 0.1).toFixed(2))) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch sang trái 0.1%"
            >
              -0.1%
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={activeField.x}
              onChange={(e) => updateField({ x: parseFloat(e.target.value) })}
              className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => updateField({ x: Math.min(100, parseFloat((activeField.x + 0.1).toFixed(2))) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch sang phải 0.1%"
            >
              +0.1%
            </button>
            <button
              type="button"
              onClick={() => updateField({ x: Math.min(100, parseFloat((activeField.x + 0.5).toFixed(2))) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch sang phải 0.5%"
            >
              +0.5%
            </button>
          </div>
        </div>

        {/* 2. Tọa độ Y (%) */}
        <div className="space-y-1.5 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-teal-600 rotate-90" />
              <span>Tọa độ dọc Y (%)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={activeField.y}
                onChange={(e) => updateField({ y: parseFloat(e.target.value) || 0 })}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold bg-white border border-stone-300 rounded-lg text-teal-900"
              />
              <span className="text-stone-500 font-mono text-xs">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateField({ y: Math.max(0, parseFloat((activeField.y - 0.5).toFixed(2))) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch lên trên 0.5%"
            >
              -0.5%
            </button>
            <button
              type="button"
              onClick={() => updateField({ y: Math.max(0, parseFloat((activeField.y - 0.1).toFixed(2))) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch lên trên 0.1%"
            >
              -0.1%
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={activeField.y}
              onChange={(e) => updateField({ y: parseFloat(e.target.value) })}
              className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => updateField({ y: Math.min(100, parseFloat((activeField.y + 0.1).toFixed(2))) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch xuống dưới 0.1%"
            >
              +0.1%
            </button>
            <button
              type="button"
              onClick={() => updateField({ y: Math.min(100, parseFloat((activeField.y + 0.5).toFixed(2))) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Dịch xuống dưới 0.5%"
            >
              +0.5%
            </button>
          </div>
        </div>

        {/* 3. Cỡ chữ (Font Size - px) */}
        <div className="space-y-1.5 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-teal-600" />
              <span>Cỡ chữ (Font size)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="1"
                min="10"
                max="160"
                value={activeField.fontSize}
                onChange={(e) => updateField({ fontSize: parseInt(e.target.value, 10) || 10 })}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold bg-white border border-stone-300 rounded-lg text-teal-900"
              />
              <span className="text-stone-500 font-mono text-xs">px</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateField({ fontSize: Math.max(10, activeField.fontSize - 2) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Giảm 2px"
            >
              -2px
            </button>
            <button
              type="button"
              onClick={() => updateField({ fontSize: Math.max(10, activeField.fontSize - 1) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Giảm 1px"
            >
              -1px
            </button>
            <input
              type="range"
              min="12"
              max="140"
              step="1"
              value={activeField.fontSize}
              onChange={(e) => updateField({ fontSize: parseInt(e.target.value, 10) })}
              className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => updateField({ fontSize: Math.min(160, activeField.fontSize + 1) })}
              className="px-1.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Tăng 1px"
            >
              +1px
            </button>
            <button
              type="button"
              onClick={() => updateField({ fontSize: Math.min(160, activeField.fontSize + 2) })}
              className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer active:scale-95"
              title="Tăng 2px"
            >
              +2px
            </button>
          </div>
        </div>

        {/* 4. Căn lề & Độ đậm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Căn lề */}
          <div className="space-y-1 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
            <label className="text-[11px] font-semibold text-stone-600 block">Căn lề chữ:</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => updateField({ align: 'left' })}
                className={`py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  activeField.align === 'left'
                    ? 'bg-teal-700 text-white border-teal-700 font-bold'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <AlignLeft className="w-3 h-3" />
                <span className="text-[10px]">Trái</span>
              </button>
              <button
                type="button"
                onClick={() => updateField({ align: 'center' })}
                className={`py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  activeField.align === 'center'
                    ? 'bg-teal-700 text-white border-teal-700 font-bold'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <AlignCenter className="w-3 h-3" />
                <span className="text-[10px]">Giữa</span>
              </button>
              <button
                type="button"
                onClick={() => updateField({ align: 'right' })}
                className={`py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  activeField.align === 'right'
                    ? 'bg-teal-700 text-white border-teal-700 font-bold'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <AlignRight className="w-3 h-3" />
                <span className="text-[10px]">Phải</span>
              </button>
            </div>
          </div>

          {/* Độ đậm font */}
          <div className="space-y-1 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
            <label className="text-[11px] font-semibold text-stone-600 block">Độ đậm (Weight):</label>
            <div className="grid grid-cols-4 gap-1">
              {([600, 700, 800, 900] as const).map((weight) => (
                <button
                  key={weight}
                  type="button"
                  onClick={() => updateField({ fontWeight: weight })}
                  className={`py-1 rounded-lg text-[10px] font-mono transition-colors border cursor-pointer ${
                    activeField.fontWeight === weight
                      ? 'bg-teal-700 text-white border-teal-700 font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Màu chữ (Color) */}
        <div className="space-y-1.5 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200/70">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-stone-700">Màu chữ:</label>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs"
                style={{ backgroundColor: activeField.color }}
              />
              <span className="font-mono text-xs font-bold text-stone-800 uppercase">{activeField.color}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_COLORS.map((col) => (
              <button
                key={col.hex}
                type="button"
                onClick={() => updateField({ color: col.hex })}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                  activeField.color.toLowerCase() === col.hex.toLowerCase()
                    ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50 text-teal-900 font-bold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-stone-300"
                  style={{ backgroundColor: col.hex }}
                />
                <span>{col.label}</span>
              </button>
            ))}

            <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer">
              <span>Khác</span>
              <input
                type="color"
                value={activeField.color}
                onChange={(e) => updateField({ color: e.target.value })}
                className="w-4 h-4 rounded cursor-pointer border-0 p-0"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3.5 py-2.5 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Khôi phục toàn bộ 8 thông số về tọa độ và kích thước mặc định ban đầu?')) {
                onResetPlacements();
              }
            }}
            className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-red-700 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Khôi phục tất cả</span>
          </button>

          {onCopyCode && (
            <button
              type="button"
              onClick={onCopyCode}
              className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sao chép code TypeScript vào clipboard"
            >
              <Copy className="w-3 h-3" />
              <span>Copy code TS</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSaveToRace && (
            <button
              type="button"
              id="save-race-placements-btn"
              onClick={onSaveToRace}
              disabled={isSavingToRace}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Lưu các toạ độ này trực tiếp vào giải đấu"
            >
              {isSavingToRace ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSavingToRace ? 'Đang lưu...' : 'Lưu vào giải'}</span>
            </button>
          )}

          {onExportStaticApi && (
            <button
              type="button"
              id="export-static-api-from-panel-btn"
              onClick={onExportStaticApi}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tải file API tĩnh (.json) chứa toạ độ vừa chỉnh"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Xuất API Tĩnh</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-700 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
