import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  Share2,
  RefreshCw,
  Check,
  RotateCcw,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Move,
  Trash2,
  Layout,
  Upload,
  SlidersHorizontal,
  Sliders,
  Sun,
  Contrast,
  Flame,
  Palette,
  X,
  Smartphone,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Runner, CertificateConfig } from '../types';
import { Race } from '../data/races';
import { DEMO_PHOTOS, getDemoPhoto } from '../data/mockRunners';
import { RacePhotosSelector } from './RacePhotosSelector';
import { drawCertificate, drawCollageFrame, PhotoFilters } from '../utils/canvasDrawer';
import { PlacementEditorPanel } from './PlacementEditorPanel';
import {
  getSavedPlacements,
  savePlacements,
  resetPlacements,
} from '../data/certificatePlacements';
import {
  saveBackgroundImage,
  getSavedBackgroundImage,
  removeSavedBackgroundImage,
  savePersonalPhoto,
  getSavedPersonalPhoto,
  removeSavedPersonalPhoto,
} from '../utils/imageStorage';
import {
  logCheckingDownload,
  formatTimeSpentOnPage,
  formatCurrentTimestamp,
} from '../services/logService';
const generatedBgUrl = '/NA26.png';

// Default sample runner photo (Phùng Hữu Thanh: /1.jpg)
const SAMPLE_RUNNER_PHOTO = '/1.jpg';

// Neutral default filters: NO filters applied automatically
const DEFAULT_PHOTO_FILTERS: PhotoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
};

interface CertificateCanvasProps {
  runner: Runner;
  config: CertificateConfig;
  onChangeConfig: (newConfig: CertificateConfig) => void;
  raceName?: string;
  defaultBgUrl?: string;
  raceId?: string;
  activeRace?: Race;
  showAdminPlacementTool?: boolean;
}

export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  runner,
  config,
  onChangeConfig,
  raceName,
  defaultBgUrl,
  raceId,
  activeRace,
  showAdminPlacementTool = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const personalFileInputRef = useRef<HTMLInputElement>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // View mode: 'single' (Chỉ chứng nhận) | 'collage' (Ghép ảnh cá nhân + Chứng nhận)
  const [viewMode, setViewMode] = useState<'single' | 'collage'>('collage');

  // Personal Photo State for Collage
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<'left' | 'right'>('right'); // Default: Cert on Left, Photo on Right
  const [photoRatio, setPhotoRatio] = useState<'2:1' | '1:1' | '3:5'>('1:1'); // '1:1' (equal width with cert), '2:1' (wide 2x), '3:5' (compact 0.6x)
  const [photoZoom, setPhotoZoom] = useState<number>(1.0);
  const [photoOffsetX, setPhotoOffsetX] = useState<number>(0);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);

  // Manual Photo Filter & Smoothing State (Default: 100% neutral, user can adjust manually)
  const [photoFilters, setPhotoFilters] = useState<PhotoFilters>(DEFAULT_PHOTO_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // Mobile Save to Photos Modal State
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [exportedImageFile, setExportedImageFile] = useState<File | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string>('');

  // Placement Tool Studio State (Live Preview, No Popup Overlay)
  const [showPlacementTool, setShowPlacementTool] = useState<boolean>(false);
  const [activeFieldId, setActiveFieldId] = useState<string>('name');
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Ensure config has placements initialized from activeRace or defaults
  useEffect(() => {
    if (!config.placements) {
      const priorityPlacements =
        (activeRace && activeRace.placements && Object.keys(activeRace.placements).length > 0)
          ? activeRace.placements
          : getSavedPlacements();
      onChangeConfig({ ...config, placements: priorityPlacements });
    }
  }, [config.placements, activeRace?.placements, onChangeConfig]);

  // Check if any filter is non-default
  const isFilterActive =
    (photoFilters.brightness ?? 100) !== 100 ||
    (photoFilters.contrast ?? 100) !== 100 ||
    (photoFilters.saturation ?? 100) !== 100 ||
    (photoFilters.warmth ?? 0) !== 0;

  // Interactive Pan on Canvas State
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Cached image elements
  const customImgRef = useRef<HTMLImageElement | null>(null);
  const generatedImgRef = useRef<HTMLImageElement | null>(null);
  const personalImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  // Load custom certificate background from server, IndexedDB, or fallback to defaultBgUrl (/NA26.png)
  useEffect(() => {
    async function loadSavedBg() {
      // Purge any legacy background from IndexedDB / localStorage
      await removeSavedBackgroundImage();

      const targetBg = defaultBgUrl || activeRace?.defaultBgUrl || '/NA26.png';
      onChangeConfig({
        ...config,
        bgMode: 'custom',
        customBgDataUrl: targetBg,
      });
    }
    loadSavedBg();
  }, [raceId, defaultBgUrl, activeRace?.defaultBgUrl]);

  // Track user custom uploaded photo separately so changing runners switches to the runner's photo if present
  const [userUploadedPhoto, setUserUploadedPhoto] = useState<string | null>(null);

  // Load photo on mount
  useEffect(() => {
    async function loadPersonalPhoto() {
      // Nếu là 1 trong 3 VĐV Mẫu (Phùng Hữu Thanh -> 1.jpg, Yuki Yokota -> 2.jpg, Ilyina Iryna -> 3.jpg)
      const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name);
      if (demoPhoto) {
        setPersonalPhotoUrl(demoPhoto);
        return;
      }
      if (runner.photoUrl) {
        setPersonalPhotoUrl(runner.photoUrl);
        return;
      }
      try {
        const savedPhoto = await getSavedPersonalPhoto();
        if (savedPhoto) {
          setUserUploadedPhoto(savedPhoto);
          setPersonalPhotoUrl(savedPhoto);
        } else {
          setPersonalPhotoUrl(null);
        }
      } catch {
        setPersonalPhotoUrl(null);
      }
    }
    loadPersonalPhoto();
  }, []);

  // When selected runner changes, sync photo precisely
  useEffect(() => {
    // 1. Nếu là 1 trong 3 VĐV Mẫu cố định: luôn đặt ảnh tương ứng của người đó
    const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name);
    if (demoPhoto) {
      setPersonalPhotoUrl(demoPhoto);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhotoZoom(1.0);
      return;
    }

    // 2. Nếu là runner từ nguồn tra cứu có photoUrl riêng
    if (runner.photoUrl) {
      setPersonalPhotoUrl(runner.photoUrl);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhotoZoom(1.0);
      return;
    }

    // 3. Nếu là runner từ nguồn tra cứu không có ảnh sẵn:
    // Dùng ảnh người dùng tự upload (nếu có), nếu chưa upload thì null
    if (userUploadedPhoto) {
      setPersonalPhotoUrl(userUploadedPhoto);
    } else {
      setPersonalPhotoUrl(null);
    }
  }, [runner.bib, runner.name, runner.photoUrl, userUploadedPhoto]);

  // Preload generated image as fallback
  useEffect(() => {
    const genImg = new Image();
    genImg.crossOrigin = 'anonymous';
    genImg.src = generatedBgUrl;
    genImg.onload = () => {
      generatedImgRef.current = genImg;
      setImagesReady((prev) => !prev);
    };
  }, []);

  // Preload custom cert background image with automatic fallback to public /NA26.png or defaultBgUrl
  useEffect(() => {
    const raceDefault = defaultBgUrl || activeRace?.defaultBgUrl;
    const rawBg = config.customBgDataUrl && config.customBgDataUrl !== '/NA26.png'
      ? config.customBgDataUrl
      : (raceDefault || '/NA26.png');

    const bgUrl =
      rawBg &&
      !rawBg.includes('QN26') &&
      !rawBg.includes('quynhon') &&
      !rawBg.includes('17cfwL9HAxh2_tRgvdMp66URxzh6wLj46')
        ? rawBg
        : (raceDefault || '/NA26.png');
    const custImg = new Image();
    custImg.crossOrigin = 'anonymous';
    custImg.src = bgUrl;
    custImg.onload = () => {
      customImgRef.current = custImg;
      setImagesReady((prev) => !prev);
    };
    custImg.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.src = raceDefault || '/NA26.png';
      fallbackImg.onload = () => {
        customImgRef.current = fallbackImg;
        setImagesReady((prev) => !prev);
      };
      fallbackImg.onerror = () => {
        customImgRef.current = null;
        setImagesReady((prev) => !prev);
      };
    };
  }, [config.customBgDataUrl, defaultBgUrl, activeRace?.defaultBgUrl]);

  // Preload personal runner photo for collage
  useEffect(() => {
    if (personalPhotoUrl) {
      const pImg = new Image();
      pImg.crossOrigin = 'anonymous';

      // On static servers, googleusercontent, data URLs and local assets load directly with CORS
      const isDirectOrigin =
        personalPhotoUrl.startsWith('data:') ||
        personalPhotoUrl.startsWith('/') ||
        personalPhotoUrl.includes('googleusercontent.com');

      const srcUrl = isDirectOrigin
        ? personalPhotoUrl
        : `/api/proxy-image?url=${encodeURIComponent(personalPhotoUrl)}`;

      pImg.src = srcUrl;
      pImg.onload = () => {
        personalImgRef.current = pImg;
        setImagesReady((prev) => !prev);
      };
      pImg.onerror = () => {
        // Fallback to direct URL if proxy failed
        if (srcUrl !== personalPhotoUrl) {
          const directImg = new Image();
          directImg.crossOrigin = 'anonymous';
          directImg.src = personalPhotoUrl;
          directImg.onload = () => {
            personalImgRef.current = directImg;
            setImagesReady((prev) => !prev);
          };
          directImg.onerror = () => {
            personalImgRef.current = null;
            setImagesReady((prev) => !prev);
          };
        } else {
          personalImgRef.current = null;
          setImagesReady((prev) => !prev);
        }
      };
    } else {
      personalImgRef.current = null;
      setImagesReady((prev) => !prev);
    }
  }, [personalPhotoUrl]);

  // Render on canvas whenever runner, config, viewMode, or personal photo params change
  const renderCurrent = useCallback(async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const certW = customImgRef.current?.naturalWidth || 1469;
    const certH = customImgRef.current?.naturalHeight || 3508;

    if (viewMode === 'single') {
      if (canvas.width !== certW || canvas.height !== certH) {
        canvas.width = certW;
        canvas.height = certH;
      }
      await drawCertificate({
        canvas,
        runner,
        config,
        customImageObj: customImgRef.current,
        generatedImageObj: generatedImgRef.current,
        raceId,
        defaultBgUrl,
        activeFieldId: showPlacementTool ? activeFieldId : undefined,
        showGuide: showPlacementTool && showGuide,
      });
    } else {
      // Collage mode: Personal photo is 1:1 (equal cert width), 2:1 (2x cert width), or 3:5 (0.6x cert width)
      const photoMultiplier = photoRatio === '1:1' ? 1 : photoRatio === '3:5' ? (3 / 5) : 2;
      const photoW = Math.round(certW * photoMultiplier);
      const totalW = photoW + certW;
      const totalH = certH;
      if (canvas.width !== totalW || canvas.height !== totalH) {
        canvas.width = totalW;
        canvas.height = totalH;
      }
      await drawCollageFrame({
        canvas,
        runner,
        config,
        personalImageObj: personalImgRef.current,
        customImageObj: customImgRef.current,
        generatedImageObj: generatedImgRef.current,
        photoSide,
        photoRatio,
        photoZoom,
        photoOffsetX,
        photoOffsetY,
        photoFilters,
        raceId,
        defaultBgUrl,
        activeFieldId: showPlacementTool ? activeFieldId : undefined,
        showGuide: showPlacementTool && showGuide,
      });
    }
  }, [
    runner,
    config,
    viewMode,
    photoSide,
    photoRatio,
    photoZoom,
    photoOffsetX,
    photoOffsetY,
    photoFilters,
    imagesReady,
    showPlacementTool,
    activeFieldId,
    showGuide,
  ]);

  useEffect(() => {
    renderCurrent();
  }, [renderCurrent]);

  // Process certificate background file upload
  const processCertBgFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await saveBackgroundImage(dataUrl);
      try {
        await fetch('/api/upload-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        });
      } catch {
        // ignore
      }
      onChangeConfig({
        ...config,
        bgMode: 'custom',
        customBgDataUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  // Process personal runner photo file upload
  const processPersonalPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await savePersonalPhoto(dataUrl);
      setUserUploadedPhoto(dataUrl);
      setPersonalPhotoUrl(dataUrl);
      setViewMode('collage');
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhotoZoom(1.0);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (viewMode === 'collage') {
      processPersonalPhotoFile(file);
    } else {
      processCertBgFile(file);
    }
  };

  // Support Ctrl+V paste image directly from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (viewMode === 'collage') {
              processPersonalPhotoFile(file);
            } else {
              processCertBgFile(file);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [viewMode, config]);

  // Interactive Pan / Drag handlers on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'collage') return;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: photoOffsetX,
      startY: photoOffsetY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || viewMode !== 'collage' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasRef.current.width / rect.width;
    const deltaX = (e.clientX - panStartRef.current.clientX) * scaleFactor;
    const deltaY = (e.clientY - panStartRef.current.clientY) * scaleFactor;
    setPhotoOffsetX(panStartRef.current.startX + deltaX);
    setPhotoOffsetY(panStartRef.current.startY + deltaY);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const moved = Math.hypot(
        e.clientX - panStartRef.current.clientX,
        e.clientY - panStartRef.current.clientY
      );
      if (moved < 8 && !personalPhotoUrl && viewMode === 'collage') {
        personalFileInputRef.current?.click();
      }
    }
    setIsPanning(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'collage' || e.touches.length !== 1) return;
    setIsPanning(true);
    const touch = e.touches[0];
    panStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      startX: photoOffsetX,
      startY: photoOffsetY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanning || viewMode !== 'collage' || !canvasRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasRef.current.width / rect.width;
    const deltaX = (touch.clientX - panStartRef.current.clientX) * scaleFactor;
    const deltaY = (touch.clientY - panStartRef.current.clientY) * scaleFactor;
    setPhotoOffsetX(panStartRef.current.startX + deltaX);
    setPhotoOffsetY(panStartRef.current.startY + deltaY);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning && !personalPhotoUrl && viewMode === 'collage') {
      const touch = e.changedTouches[0];
      if (touch) {
        const moved = Math.hypot(
          touch.clientX - panStartRef.current.clientX,
          touch.clientY - panStartRef.current.clientY
        );
        if (moved < 12) {
          personalFileInputRef.current?.click();
        }
      }
    }
    setIsPanning(false);
  };

  // Reset Photo Offset & Zoom
  const handleResetPhotoPosition = () => {
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
  };

  // Reset Photo Filters back to original untouched
  const handleResetFilters = () => {
    setPhotoFilters(DEFAULT_PHOTO_FILTERS);
  };

  // Apply Quick Style Presets
  const applyPreset = (preset: 'original' | 'vivid' | 'warm' | 'cool' | 'bw') => {
    switch (preset) {
      case 'original':
        setPhotoFilters(DEFAULT_PHOTO_FILTERS);
        break;
      case 'vivid':
        setPhotoFilters({
          brightness: 105,
          contrast: 112,
          saturation: 120,
          warmth: 0,
        });
        break;
      case 'warm':
        setPhotoFilters({
          brightness: 102,
          contrast: 104,
          saturation: 108,
          warmth: 16,
        });
        break;
      case 'cool':
        setPhotoFilters({
          brightness: 102,
          contrast: 106,
          saturation: 95,
          warmth: -16,
        });
        break;
      case 'bw':
        setPhotoFilters({
          brightness: 105,
          contrast: 120,
          saturation: 0,
          warmth: 0,
        });
        break;
    }
  };

  // Remove personal photo
  const handleRemovePhoto = async () => {
    await removeSavedPersonalPhoto();
    setUserUploadedPhoto(null);
    const fallback = DEMO_PHOTOS[runner.bib] || runner.photoUrl || null;
    setPersonalPhotoUrl(fallback);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
    setPhotoFilters(DEFAULT_PHOTO_FILTERS);
  };

  // Set sample runner photo
  const handleUseSamplePhoto = () => {
    setUserUploadedPhoto(null);
    const sample = DEMO_PHOTOS[runner.bib] || runner.photoUrl || SAMPLE_RUNNER_PHOTO;
    setPersonalPhotoUrl(sample);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhotoZoom(1.0);
  };

  // High Resolution Export Download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Record log for sheet CHECKING: TIMESTAMP, BIB, RACE, TIME
      try {
        const { formatted: timeFormatted } = formatTimeSpentOnPage();
        const currentTimestamp = formatCurrentTimestamp();
        const targetRaceName = activeRace?.name || raceName || 'VnExpress Marathon';
        const targetScriptUrl =
          activeRace?.checkingScriptUrl ||
          (typeof window !== 'undefined' ? localStorage.getItem('vm_checking_script_url') || '' : '') ||
          activeRace?.appsScriptUrl;

        logCheckingDownload({
          timestamp: currentTimestamp,
          bib: runner.bib,
          race: targetRaceName,
          time: timeFormatted,
          scriptUrl: targetScriptUrl,
        }).catch((err) => {
          console.warn('[Log Checking] Warning:', err);
        });
      } catch (logErr) {
        console.warn('[Log Checking] Error capturing metrics:', logErr);
      }

      const certW = customImgRef.current?.naturalWidth || 1080;
      const certH = customImgRef.current?.naturalHeight || 2400;

      const exportCanvas = document.createElement('canvas');
      const safeName = runner.name.replace(/[^a-zA-Z0-9]/g, '_');

      if (viewMode === 'single') {
        exportCanvas.width = certW;
        exportCanvas.height = certH;
        await drawCertificate({
          canvas: exportCanvas,
          runner,
          config,
          customImageObj: customImgRef.current,
          generatedImageObj: generatedImgRef.current,
          raceId,
          defaultBgUrl,
        });
      } else {
        // Collage: 1:1 (photoW = certW), 2:1 (2x certW), or 3:5 (0.6x certW)
        const photoMultiplier = photoRatio === '1:1' ? 1 : photoRatio === '3:5' ? (3 / 5) : 2;
        const exportPhotoW = Math.round(certW * photoMultiplier);
        exportCanvas.width = exportPhotoW + certW;
        exportCanvas.height = certH;
        await drawCollageFrame({
          canvas: exportCanvas,
          runner,
          config,
          personalImageObj: personalImgRef.current,
          customImageObj: customImgRef.current,
          generatedImageObj: generatedImgRef.current,
          photoSide,
          photoRatio,
          photoZoom,
          photoOffsetX,
          photoOffsetY,
          photoFilters,
          raceId,
          defaultBgUrl,
        });
      }

      const ratioTag =
        photoRatio === '1:1'
          ? 'Collage_1_1_CanDoi'
          : photoRatio === '3:5'
          ? 'Collage_3_5_Gon'
          : 'Collage_2_1_ToanCanh';

      const racePrefix = 'VM_NgheAn2026';
      const fileName = `${racePrefix}_${
        viewMode === 'collage' ? ratioTag : 'Certificate'
      }_${runner.bib}_${safeName}.png`;
      const dataUrl = exportCanvas.toDataURL('image/png', 1.0);

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2dd4bf', '#38bdf8', '#f59e0b', '#ffffff'],
      });

      // Detect mobile device (iOS/Android or small touch screen)
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (typeof window !== 'undefined' && window.innerWidth < 768));

      if (isMobile) {
        // Prepare blob and file for Web Share API (which allows direct "Save Image" to Photos app on iOS/Android)
        const blob = await new Promise<Blob | null>((resolve) =>
          exportCanvas.toBlob(resolve, 'image/png', 1.0)
        );
        const file = blob
          ? new File([blob], fileName, { type: 'image/png' })
          : null;

        setExportedImageUrl(dataUrl);
        setExportedImageFile(file);
        setExportedFileName(fileName);
        setShowSaveModal(true);

        // If Web Share API with files is supported, prompt it directly (gives "Lưu hình ảnh" to Photos)
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Chứng nhận VnExpress Marathon - ${runner.name}`,
            });
          } catch (shareErr: any) {
            // User dismissed the share sheet or cancelled; modal remains open with long-press guide
            console.log('Share prompt dismissed:', shareErr);
          }
        }
      } else {
        // Desktop PC download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Share certificate
  const handleShare = async () => {
    const raceTitle = raceName || 'VnExpress Marathon';
    const shareUrl = `${window.location.origin}${window.location.pathname}?bib=${runner.bib}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chứng nhận ${raceTitle} - ${runner.name} (BIB: ${runner.bib})`,
          text: `Chúc mừng ${runner.name} đã hoàn thành cự ly ${runner.distance} tại ${raceTitle} với thành tích Chip Time: ${runner.chipTime}!`,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // Fallback
      }
    }

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      className="flex flex-col items-center w-full transition-all duration-300 mx-auto"
      id="certificate-canvas-wrapper"
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={personalFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processPersonalPhotoFile(file);
        }}
      />
      <input
        type="file"
        ref={certFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processCertBgFile(file);
        }}
      />

      {/* Top Mode Segmented Switcher & Action Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3 px-1">
        {/* Mode Toggle: Single vs Collage */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl shadow-xs self-start sm:self-auto">
          <button
            type="button"
            id="mode-single-btn"
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'single'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Chứng nhận đơn</span>
            <span className="text-[10px] text-slate-400 font-normal">(1080×2400)</span>
          </button>
          <button
            type="button"
            id="mode-collage-btn"
            onClick={() => setViewMode('collage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'collage'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Ghép ảnh cá nhân</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-[#9F224E] font-bold border border-rose-200/60">
              {photoRatio}
            </span>
          </button>
        </div>

        {/* Action Buttons: Placement Tool (Admin only), Share, Download */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {showAdminPlacementTool && (
            <button
              type="button"
              id="toggle-placement-tool-btn"
              onClick={() => setShowPlacementTool((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 ${
                showPlacementTool
                  ? 'bg-[#0F2847] text-white shadow-sm ring-2 ring-[#0F2847]/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
              title="Bật/Tắt công cụ chỉnh vị trí và cỡ chữ với preview trực tiếp"
            >
              <Sliders className={`w-4 h-4 ${showPlacementTool ? 'text-amber-400' : 'text-slate-600'}`} />
              <span>{showPlacementTool ? 'Đang chỉnh vị trí' : 'Chỉnh vị trí & Size text'}</span>
              {showPlacementTool && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />}
            </button>
          )}

          <button
            type="button"
            id="share-cert-btn"
            onClick={handleShare}
            className="p-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            title="Chia sẻ đường dẫn"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
          </button>

          <button
            type="button"
            id="download-cert-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4.5 py-2.5 bg-gradient-to-r from-[#9F224E] via-[#B81B4B] to-[#9F224E] hover:from-[#881337] hover:to-[#9F224E] text-white font-bold text-xs rounded-xl shadow-md shadow-rose-950/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin text-white/80" /> : <Download className="w-4 h-4" />}
            <span>
              {isDownloading
                ? 'Đang xuất ảnh...'
                : viewMode === 'collage'
                ? photoRatio === '3:5'
                  ? 'Tải ảnh HD (1728×2400)'
                  : 'Tải ảnh HD (3240×2400)'
                : 'Tải chứng nhận HD (1080×2400)'}
            </span>
          </button>
        </div>
      </div>

      {/* Race Photos Gallery (BIB Mapping from Google Sheet / Data) */}
      <RacePhotosSelector
        runner={runner}
        activePhotoUrl={personalPhotoUrl}
        activeRace={activeRace}
        onSelectPhoto={(url) => {
          setPersonalPhotoUrl(url);
          setUserUploadedPhoto(url);
          if (viewMode !== 'collage') {
            setViewMode('collage');
          }
          setPhotoOffsetX(0);
          setPhotoOffsetY(0);
          setPhotoZoom(1.0);
        }}
      />

      {/* Collage Control Panel (Only visible in collage mode) */}
      {viewMode === 'collage' && (
        <div
          id="collage-control-bar"
          className="w-full mb-3 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs"
        >
          {/* Left: Upload & Photo Source Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="upload-personal-photo-btn"
              onClick={() => personalFileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#0F2847] hover:bg-[#1E3A5F] text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Tải ảnh chạy bộ của bạn lên"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{personalPhotoUrl ? 'Đổi ảnh cá nhân' : 'Chọn ảnh cá nhân'}</span>
            </button>

            {personalPhotoUrl ? (
              <button
                type="button"
                id="remove-personal-photo-btn"
                onClick={handleRemovePhoto}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Xóa ảnh hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa ảnh</span>
              </button>
            ) : (
              <button
                type="button"
                id="sample-photo-btn"
                onClick={handleUseSamplePhoto}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Dùng ảnh vận động viên mẫu để xem trước"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Dùng ảnh mẫu</span>
              </button>
            )}

            {/* Layout switch: Photo on Left vs Photo on Right */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                id="layout-photo-left-btn"
                onClick={() => setPhotoSide('left')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoSide === 'left' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Ảnh cá nhân bên Trái, Chứng nhận bên Phải"
              >
                Ảnh Trái • Certi Phải
              </button>
              <button
                type="button"
                id="layout-photo-right-btn"
                onClick={() => setPhotoSide('right')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoSide === 'right' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Chứng nhận bên Trái, Ảnh cá nhân bên Phải"
              >
                Certi Trái • Ảnh Phải
              </button>
            </div>

            {/* Frame Ratio Selector: Cân đối (1:1 Bằng Cert) vs Rộng (2:1) vs Gọn (3/5) */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold px-1 hidden sm:inline">Khung ảnh:</span>
              <button
                type="button"
                id="ratio-equal-btn"
                onClick={() => setPhotoRatio('1:1')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  photoRatio === '1:1' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Khung ảnh cá nhân ngang bằng với khung Certificate (Tỉ lệ 1:1 - Cân đối, Tổng 2160×2400)"
              >
                <span>Bằng Cert (1:1)</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">Cân đối</span>
              </button>
              <button
                type="button"
                id="ratio-wide-btn"
                onClick={() => setPhotoRatio('2:1')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoRatio === '2:1' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Khung ảnh cá nhân rộng gấp đôi chứng nhận (Tỉ lệ 2:1 Toàn cảnh - Tổng 3240×2400)"
              >
                Rộng (2:1)
              </button>
              <button
                type="button"
                id="ratio-compact-btn"
                onClick={() => setPhotoRatio('3:5')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  photoRatio === '3:5' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Khung ảnh cá nhân bằng 3/5 chiều ngang chứng nhận (Thu gọn - Tổng 1728×2400)"
              >
                Gọn (3/5)
              </button>
            </div>
          </div>

          {/* Right: Zoom & Pan & Badge options */}
          <div className="flex items-center gap-2.5 flex-wrap md:justify-end">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                id="photo-zoom-slider"
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={photoZoom}
                onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                className="w-20 accent-[#9F224E] h-1 bg-slate-200 rounded cursor-pointer"
                title="Phóng to / Thu nhỏ ảnh"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-mono text-slate-700 w-9 text-right font-medium">
                {Math.round(photoZoom * 100)}%
              </span>
            </div>

            {/* Reset position button */}
            <button
              type="button"
              id="reset-photo-pos-btn"
              onClick={handleResetPhotoPosition}
              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Đặt lại vị trí căn giữa ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Filter Panel */}
            <button
              type="button"
              id="toggle-photo-filters-btn"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showFilterPanel || isFilterActive
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
              title="Mở bảng chỉnh màu sắc, độ sáng, tương phản"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Chỉnh màu</span>
              {isFilterActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Photo Filter Sub-Panel */}
      {viewMode === 'collage' && showFilterPanel && (
        <div
          id="photo-filters-panel"
          className="w-full mb-3 p-3.5 bg-white border border-stone-200/90 rounded-2xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header with Presets & Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-stone-700" />
              <div>
                <span className="text-xs font-bold text-stone-900 block sm:inline mr-1.5">
                  Chỉnh màu sắc ảnh
                </span>
                <span className="text-[10px] text-stone-500 font-normal">
                  (Độ sáng, tương phản, tươi màu, tông ấm/lạnh)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-stone-500">Mẫu:</span>
              <div className="inline-flex gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[10px]">
                <button
                  type="button"
                  onClick={() => applyPreset('original')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    !isFilterActive
                      ? 'bg-white text-stone-900 shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Ảnh gốc không qua chỉnh sửa"
                >
                  Gốc
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('vivid')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Màu tươi tắn, tương phản cao"
                >
                  Tươi tắn
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('warm')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Tông nắng ấm"
                >
                  Nắng ấm
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('cool')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Tông dịu mát"
                >
                  Dịu mát
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('bw')}
                  className="px-2 py-0.5 rounded font-medium text-stone-600 hover:text-stone-900 hover:bg-white transition-colors cursor-pointer"
                  title="Trắng đen cổ điển"
                >
                  Trắng đen
                </button>
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  id="reset-filters-btn"
                  onClick={handleResetFilters}
                  className="px-2 py-1 text-[11px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Đặt lại màu gốc nguyên bản"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại gốc</span>
                </button>
              )}
            </div>
          </div>

          {/* Sliders Grid: Brightness, Contrast, Saturation, Warmth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* Độ sáng */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-brightness-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Độ sáng</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.brightness ?? 100}%
                </span>
              </div>
              <input
                id="filter-brightness-slider"
                type="range"
                min="60"
                max="140"
                step="2"
                value={photoFilters.brightness ?? 100}
                onChange={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    brightness: parseInt(e.target.value, 10),
                  }))
                }
                onInput={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    brightness: parseInt((e.target as HTMLInputElement).value, 10),
                  }))
                }
                className="w-full accent-stone-800 h-1.5 bg-stone-200 rounded cursor-pointer touch-pan-x"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>60%</span>
                <span>100%</span>
                <span>140%</span>
              </div>
            </div>

            {/* Độ tương phản */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-contrast-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Contrast className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tương phản</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.contrast ?? 100}%
                </span>
              </div>
              <input
                id="filter-contrast-slider"
                type="range"
                min="60"
                max="140"
                step="2"
                value={photoFilters.contrast ?? 100}
                onChange={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    contrast: parseInt(e.target.value, 10),
                  }))
                }
                onInput={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    contrast: parseInt((e.target as HTMLInputElement).value, 10),
                  }))
                }
                className="w-full accent-stone-800 h-1.5 bg-stone-200 rounded cursor-pointer touch-pan-x"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>60%</span>
                <span>100%</span>
                <span>140%</span>
              </div>
            </div>

            {/* Độ bão hòa màu */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-saturation-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Palette className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tươi màu</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {photoFilters.saturation ?? 100}%
                </span>
              </div>
              <input
                id="filter-saturation-slider"
                type="range"
                min="0"
                max="180"
                step="5"
                value={photoFilters.saturation ?? 100}
                onChange={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    saturation: parseInt(e.target.value, 10),
                  }))
                }
                onInput={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    saturation: parseInt((e.target as HTMLInputElement).value, 10),
                  }))
                }
                className="w-full accent-stone-800 h-1.5 bg-stone-200 rounded cursor-pointer touch-pan-x"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>Trắng đen</span>
                <span>100%</span>
                <span>180%</span>
              </div>
            </div>

            {/* Tông ấm / lạnh */}
            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label
                  htmlFor="filter-warmth-slider"
                  className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Tông ấm / lạnh</span>
                </label>
                <span className="text-stone-900 font-mono font-bold text-[11px]">
                  {(photoFilters.warmth ?? 0) > 0
                    ? `+${photoFilters.warmth}`
                    : (photoFilters.warmth ?? 0) < 0
                    ? `${photoFilters.warmth}`
                    : 'Chuẩn'}
                </span>
              </div>
              <input
                id="filter-warmth-slider"
                type="range"
                min="-40"
                max="40"
                step="2"
                value={photoFilters.warmth ?? 0}
                onChange={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    warmth: parseInt(e.target.value, 10),
                  }))
                }
                onInput={(e) =>
                  setPhotoFilters((prev) => ({
                    ...prev,
                    warmth: parseInt((e.target as HTMLInputElement).value, 10),
                  }))
                }
                className="w-full accent-stone-800 h-1.5 bg-stone-200 rounded cursor-pointer touch-pan-x"
              />
              <div className="flex justify-between text-[9px] text-stone-400">
                <span>Lạnh (-40)</span>
                <span>Chuẩn (0)</span>
                <span>Ấm (+40)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio Work Area: Canvas on Left/Center, Live Placement Tool on Right (No popup) */}
      <div
        className={`w-full flex flex-col ${
          showPlacementTool ? 'lg:flex-row gap-5 items-start justify-center' : 'items-center'
        }`}
      >
        {/* Canvas Display Frame with Drag-and-Drop & Pan Support */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative ${
            showPlacementTool ? 'flex-1 w-full min-w-0' : 'w-full'
          } rounded-2xl overflow-hidden shadow-xs border bg-slate-100/70 flex flex-col items-center justify-center p-2 sm:p-4 group transition-all ${
            isDragging ? 'border-[#9F224E] ring-2 ring-[#9F224E]/20' : 'border-slate-200/90'
          }`}
        >
          {/* Visual helper badge */}
          <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 backdrop-blur-md text-[11px] text-slate-700 shadow-xs pointer-events-none">
            {showPlacementTool ? (
              <>
                <Target className="w-3.5 h-3.5 text-[#9F224E] animate-pulse" />
                <span className="font-semibold text-slate-900">Live Preview trực tiếp</span>
              </>
            ) : viewMode === 'collage' ? (
              <>
                <Move className="w-3.5 h-3.5 text-slate-500" />
                <span>Kéo chuột trên ảnh để căn chỉnh vị trí</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#9F224E]"></span>
                <span className="font-medium text-slate-700">Kéo thả ảnh để đổi phôi chứng nhận</span>
              </>
            )}
          </div>

          {/* Canvas Element with interactive drag-to-pan in collage mode */}
          <canvas
            ref={canvasRef}
            id="certificate-canvas"
            width={viewMode === 'collage' ? (photoRatio === '3:5' ? 2350 : (photoRatio === '1:1' ? 2938 : 4407)) : 1469}
            height={3508}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`w-full ${
              showPlacementTool ? 'max-h-[75vh] lg:max-h-[82vh]' : 'max-h-[78vh]'
            } object-contain rounded-xl shadow-md transition-transform duration-150 ${
              viewMode === 'single'
                ? showPlacementTool
                  ? 'max-w-md sm:max-w-lg mx-auto'
                  : 'max-w-md sm:max-w-lg md:max-w-xl mx-auto'
                : ''
            } ${
              viewMode === 'collage' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
            }`}
          />
        </div>

        {/* Live Placement Editor Studio Panel (Inline side panel, NO popup!) */}
        {showPlacementTool && (
          <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 lg:sticky lg:top-20 z-20">
            <PlacementEditorPanel
              placements={config.placements || getSavedPlacements()}
              onChangePlacements={(newPlacements) => {
                savePlacements(newPlacements);
                onChangeConfig({ ...config, placements: newPlacements });
              }}
              onResetPlacements={() => {
                const def = resetPlacements();
                onChangeConfig({ ...config, placements: def });
              }}
              onClose={() => setShowPlacementTool(false)}
              activeFieldId={activeFieldId}
              onSelectFieldId={setActiveFieldId}
              showGuide={showGuide}
              onToggleGuide={() => setShowGuide((prev) => !prev)}
            />
          </div>
        )}
      </div>

      {/* Mobile Save Image to Photos Modal */}
      {showSaveModal && exportedImageUrl && (
        <div
          id="mobile-save-image-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-3 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#9F224E]" />
                <span className="font-bold text-slate-900 text-sm">
                  Lưu ảnh vào Thư viện điện thoại
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Instructions & High-res Image Preview */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Highlight Instruction Box */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-slate-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs text-[#9F224E]">
                  <span>💡 Cách lưu thẳng vào Thư viện ảnh (Cuộn camera):</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  • <strong>Cách 1 (Dễ nhất):</strong> Chạm và <strong>GIỮ tay vào ảnh</strong> bên dưới 1-2 giây &gt; Chọn <strong>"Lưu vào Ảnh"</strong> (Save to Photos) hoặc <strong>"Tải hình ảnh xuống"</strong>.
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  • <strong>Cách 2:</strong> Bấm nút <strong>"Lưu vào Thư viện ảnh"</strong> bên dưới để mở bảng chia sẻ hệ thống và chọn "Lưu hình ảnh".
                </p>
              </div>

              {/* High-Resolution Rendered Image Preview (Supports Long-Press Save) */}
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center p-1.5 shadow-inner">
                <img
                  src={exportedImageUrl}
                  alt={`Chứng nhận Finisher ${runner.name}`}
                  className="w-full max-h-[46vh] object-contain rounded-lg select-auto"
                />
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row gap-2">
              {exportedImageFile && (
                <button
                  type="button"
                  id="mobile-share-sheet-btn"
                  onClick={async () => {
                    if (navigator.canShare && navigator.canShare({ files: [exportedImageFile] })) {
                      try {
                        await navigator.share({
                          files: [exportedImageFile],
                          title: `Chứng nhận VnExpress Marathon - ${runner.name}`,
                        });
                      } catch (e) {
                        console.log('Share cancelled', e);
                      }
                    } else {
                      const link = document.createElement('a');
                      link.download = exportedFileName;
                      link.href = exportedImageUrl;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 bg-[#9F224E] hover:bg-[#881337] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-white/90" />
                  <span>Lưu vào Thư viện ảnh (Share)</span>
                </button>
              )}

              <button
                type="button"
                id="mobile-download-file-btn"
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = exportedFileName;
                  link.href = exportedImageUrl;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải file về máy (Tệp / Downloads)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
