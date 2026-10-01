import { Runner, CertificateConfig, PersonalPhotoOverlayConfig } from '../types';
import { DEFAULT_NGHE_AN_PLACEMENTS } from '../data/certificatePlacements';

// Global cache for NA26.png to ensure it renders instantly and reliably
let cachedNA26Img: HTMLImageElement | null = null;
let na26LoadPromise: Promise<HTMLImageElement> | null = null;

export const getNA26Image = (): Promise<HTMLImageElement> => {
  if (cachedNA26Img && cachedNA26Img.complete && cachedNA26Img.naturalWidth > 0) {
    return Promise.resolve(cachedNA26Img);
  }
  if (!na26LoadPromise) {
    na26LoadPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/NA26.png';
      img.onload = () => {
        cachedNA26Img = img;
        resolve(img);
      };
      img.onerror = () => {
        cachedNA26Img = img;
        resolve(img);
      };
    });
  }
  return na26LoadPromise;
};

// Start preloading NA26.png immediately at module load time
if (typeof window !== 'undefined') {
  getNA26Image();
}

export interface DrawOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
  scale?: number; // scale multiplier for export
  raceId?: string;
  defaultBgUrl?: string;
  activeFieldId?: string;
  showGuide?: boolean;
}

/**
 * Draws the finisher certificate onto the provided canvas.
 */
export const drawCertificate = async (options: DrawOptions): Promise<void> => {
  const { canvas, runner, config, customImageObj } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background: Use customImageObj, or options.defaultBgUrl / config.customBgDataUrl, or fallback to /NA26.png
  let bgImgToDraw: HTMLImageElement | null = null;
  if (
    customImageObj &&
    customImageObj.complete &&
    customImageObj.naturalWidth > 0 &&
    !customImageObj.src.includes('QN26') &&
    !customImageObj.src.includes('quynhon')
  ) {
    bgImgToDraw = customImageObj;
  }

  // If customImageObj is not ready or null, try loading options.defaultBgUrl or config.customBgDataUrl
  if (!bgImgToDraw) {
    const targetUrl = options.defaultBgUrl || config.customBgDataUrl;
    if (targetUrl && targetUrl !== '/NA26.png' && !targetUrl.includes('QN26') && !targetUrl.includes('quynhon')) {
      try {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = targetUrl;
        await new Promise<void>((resolve) => {
          if (bgImg.complete && bgImg.naturalWidth > 0) return resolve();
          bgImg.onload = () => resolve();
          bgImg.onerror = () => resolve();
          setTimeout(resolve, 800);
        });
        if (bgImg.naturalWidth > 0) {
          bgImgToDraw = bgImg;
        }
      } catch {}
    }
  }

  // Final fallback to cached NA26.png
  if (!bgImgToDraw) {
    bgImgToDraw = await getNA26Image();
  }

  if (bgImgToDraw && bgImgToDraw.complete && bgImgToDraw.naturalWidth > 0) {
    ctx.drawImage(bgImgToDraw, 0, 0, width, height);
  } else {
    try {
      await new Promise<void>((resolve) => {
        if (bgImgToDraw && bgImgToDraw.complete && bgImgToDraw.naturalWidth > 0) return resolve();
        if (bgImgToDraw) {
          bgImgToDraw.onload = () => resolve();
          bgImgToDraw.onerror = () => resolve();
        }
        setTimeout(resolve, 300);
      });
      if (bgImgToDraw && bgImgToDraw.naturalWidth > 0) {
        ctx.drawImage(bgImgToDraw, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#061e36';
        ctx.fillRect(0, 0, width, height);
      }
    } catch {
      ctx.fillStyle = '#061e36';
      ctx.fillRect(0, 0, width, height);
    }
  }

  const fontMultiplier = config.fontSizeMultiplier || 1.0;
    // =========================================================================
    // NGHỆ AN 2026 CERTIFICATE (NA26.png):
    // Phôi Nghệ An 2026 đã in sẵn tất cả các nhãn và ô đồ họa.
    // Các giá trị tham số được vẽ theo cấu hình tùy chỉnh vị trí, cỡ chữ (placements):
    // - Tên VĐV: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Cự ly: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Số BIB: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Chip Time: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Finish Time: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Overall Rank: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Gender Rank: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // - Age Group: Tùy chỉnh vị trí X, Y, font size, màu, căn lề
    // =========================================================================
    ctx.save();

    const placements = {
      ...DEFAULT_NGHE_AN_PLACEMENTS,
      ...(config.placements || {}),
    };

    // Helper tính cỡ chữ theo tỉ lệ chiều ngang canvas (chuẩn 1469px) và fontMultiplier
    const calcFontSize = (basePx: number) => Math.max(10, Math.round((basePx / 1469) * width * fontMultiplier));

    // 1/ Tên Vận động viên
    const pName = placements.name;
    const displayName = config.uppercaseName ? runner.name.toUpperCase() : runner.name;
    const nameFontSize = calcFontSize(pName.fontSize);
    ctx.font = `${pName.fontWeight} ${nameFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pName.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pName.color;
    ctx.fillText(displayName, width * (pName.x / 100), height * (pName.y / 100));

    // 2/ Cự ly (giữ nguyên chuỗi từ Google Sheet: VD 21K, 42K, 10K, 5K)
    const pDist = placements.distance;
    const distText = runner.distance || '21K';
    const distFontSize = calcFontSize(pDist.fontSize);
    ctx.font = `${pDist.fontWeight} ${distFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pDist.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pDist.color;
    ctx.fillText(distText, width * (pDist.x / 100), height * (pDist.y / 100));

    // 3/ BIB
    const pBib = placements.bib;
    const bibText = String(runner.bib || '-');
    const bibFontSize = calcFontSize(pBib.fontSize);
    ctx.font = `${pBib.fontWeight} ${bibFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pBib.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pBib.color;
    ctx.fillText(bibText, width * (pBib.x / 100), height * (pBib.y / 100));

    // 4/ CHIP TIME
    const pChip = placements.chipTime;
    const chipText = String(runner.chipTime || '--:--:--');
    const chipFontSize = calcFontSize(pChip.fontSize);
    ctx.font = `${pChip.fontWeight} ${chipFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pChip.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pChip.color;
    ctx.fillText(chipText, width * (pChip.x / 100), height * (pChip.y / 100));

    // 5/ FINISH TIME (Gun Time)
    const pFinish = placements.finishTime;
    const gunText = String(runner.gunTime || '--:--:--');
    const finishFontSize = calcFontSize(pFinish.fontSize);
    ctx.font = `${pFinish.fontWeight} ${finishFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pFinish.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pFinish.color;
    ctx.fillText(gunText, width * (pFinish.x / 100), height * (pFinish.y / 100));

    // 6/ OVERALL RANK
    const pOverall = placements.overallRank;
    const overallText = String(runner.overallRank || '-');
    const overallFontSize = calcFontSize(pOverall.fontSize);
    ctx.font = `${pOverall.fontWeight} ${overallFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pOverall.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pOverall.color;
    ctx.fillText(overallText, width * (pOverall.x / 100), height * (pOverall.y / 100));

    // 7/ GENDER RANK
    const pGender = placements.genderRank;
    const genderRankText = String(runner.genderRank || '-');
    const genderFontSize = calcFontSize(pGender.fontSize);
    ctx.font = `${pGender.fontWeight} ${genderFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pGender.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pGender.color;
    ctx.fillText(genderRankText, width * (pGender.x / 100), height * (pGender.y / 100));

    // 8/ AGE GROUP RANK
    const pAg = placements.ageGroupRank;
    const agRankText = runner.ageGroupRank
      ? `${runner.ageGroupRank}${runner.ag && runner.ag !== '-' ? ` (${runner.ag})` : ''}`
      : String(runner.ag || '-');
    const agFontSize = calcFontSize(pAg.fontSize);
    ctx.font = `${pAg.fontWeight} ${agFontSize}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = pAg.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pAg.color;
    ctx.fillText(agRankText, width * (pAg.x / 100), height * (pAg.y / 100));

    // 9/ Tâm định vị (Guide Target) khi người dùng bật thước căn chỉnh trực tiếp
    if (options.showGuide && options.activeFieldId && placements[options.activeFieldId]) {
      const activeP = placements[options.activeFieldId];
      const targetX = width * (activeP.x / 100);
      const targetY = height * (activeP.y / 100);

      ctx.save();
      // Vòng tròn neon chỉ điểm neo
      ctx.strokeStyle = '#06b6d4'; // cyan-500
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = Math.max(3, Math.round(width * 0.003));
      ctx.setLineDash([8, 6]);

      const radius = Math.max(18, Math.round(width * 0.016));
      ctx.beginPath();
      ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dấu chữ thập tâm
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
      ctx.beginPath();
      ctx.moveTo(targetX - radius * 1.5, targetY);
      ctx.lineTo(targetX + radius * 1.5, targetY);
      ctx.moveTo(targetX, targetY - radius * 1.5);
      ctx.lineTo(targetX, targetY + radius * 1.5);
      ctx.stroke();

      ctx.restore();
    }

  ctx.restore();
};

/**
 * Utility for drawing rounded rectangles on canvas
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface PhotoFilters {
  brightness?: number; // default 100 (50 - 150)
  contrast?: number;   // default 100 (50 - 150)
  saturation?: number; // default 100 (0 - 200)
  warmth?: number;     // default 0 (-50 to +50)
}

// Detection for native CanvasRenderingContext2D.filter support (broken / disabled on iOS Safari / WebKit)
let _canvasFilterSupported: boolean | null = null;
export function isCanvasFilterSupported(): boolean {
  if (_canvasFilterSupported !== null) return _canvasFilterSupported;
  if (typeof document === 'undefined') return false;

  // iOS Safari / WebKit has notorious issues with ctx.filter on drawImage
  if (typeof navigator !== 'undefined') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      _canvasFilterSupported = false;
      return false;
    }
  }

  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 2;
    testCanvas.height = 2;
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx || typeof testCtx.filter !== 'string') {
      _canvasFilterSupported = false;
      return false;
    }
    testCtx.filter = 'invert(100%)';
    if (testCtx.filter === 'none' || !testCtx.filter) {
      _canvasFilterSupported = false;
      return false;
    }
    testCtx.fillStyle = '#ffffff';
    testCtx.fillRect(0, 0, 2, 2);
    const p = testCtx.getImageData(0, 0, 1, 1).data;
    _canvasFilterSupported = p[0] < 50;
    return _canvasFilterSupported;
  } catch {
    _canvasFilterSupported = false;
    return false;
  }
}

// In-memory cache for mobile filtered personal image to maintain 60fps pan/zoom
interface FilterCache {
  srcImage: HTMLImageElement;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  canvas: HTMLCanvasElement;
}

let filterCache: FilterCache | null = null;

/**
 * Applies color adjustments (brightness, contrast, saturation, warmth) directly via
 * high-performance pixel LUT on an offscreen canvas.
 * Guaranteed to work identically across ALL mobile devices (iOS Safari, Android Chrome) and PC.
 */
export function getFilteredImageSource(
  img: HTMLImageElement,
  filters?: PhotoFilters
): CanvasImageSource {
  const brightness = filters?.brightness ?? 100;
  const contrast = filters?.contrast ?? 100;
  const saturation = filters?.saturation ?? 100;
  const warmth = filters?.warmth ?? 0;

  const isDefault =
    brightness === 100 &&
    contrast === 100 &&
    saturation === 100 &&
    warmth === 0;

  if (isDefault) {
    return img;
  }

  if (
    filterCache &&
    filterCache.srcImage === img &&
    filterCache.brightness === brightness &&
    filterCache.contrast === contrast &&
    filterCache.saturation === saturation &&
    filterCache.warmth === warmth
  ) {
    return filterCache.canvas;
  }

  try {
    const offCanvas = document.createElement('canvas');
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return img;

    offCtx.drawImage(img, 0, 0, w, h);
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const len = data.length;

    // 1. Build 256-entry Look-Up Table for Contrast + Brightness
    const lut = new Uint8ClampedArray(256);
    const cFactor = contrast / 100;
    const bOffset = ((brightness / 100) - 1) * 255;
    for (let i = 0; i < 256; i++) {
      const v = (i - 128) * cFactor + 128 + bOffset;
      lut[i] = v;
    }

    const satFactor = saturation / 100;
    const hasSat = saturation !== 100;
    const rShift = warmth > 0 ? (warmth / 40) * 28 : 0;
    const bShift = warmth < 0 ? (Math.abs(warmth) / 40) * 28 : 0;

    for (let i = 0; i < len; i += 4) {
      let r = lut[data[i]];
      let g = lut[data[i + 1]];
      let b = lut[data[i + 2]];

      if (hasSat) {
        if (saturation === 0) {
          const gray = (r * 77 + g * 150 + b * 29) >> 8;
          r = gray;
          g = gray;
          b = gray;
        } else {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + satFactor * (r - gray);
          g = gray + satFactor * (g - gray);
          b = gray + satFactor * (b - gray);
        }
      }

      if (warmth !== 0) {
        if (rShift > 0) {
          r = Math.min(255, r + rShift);
          b = Math.max(0, b - rShift * 0.4);
        } else if (bShift > 0) {
          b = Math.min(255, b + bShift);
          r = Math.max(0, r - bShift * 0.4);
        }
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    offCtx.putImageData(imgData, 0, 0);

    filterCache = {
      srcImage: img,
      brightness,
      contrast,
      saturation,
      warmth,
      canvas: offCanvas,
    };

    return offCanvas;
  } catch (err) {
    console.warn('Canvas pixel adjustment fallback failed (CORS or canvas limit):', err);
    return img;
  }
}

export interface DrawCollageOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  personalImageObj?: HTMLImageElement | null;
  photoZoom?: number; // default 1.0
  photoOffsetX?: number; // offset in px
  photoOffsetY?: number; // offset in px
  photoSide?: 'left' | 'right'; // default 'left' (photo on left, cert on right)
  photoRatio?: '2:1' | '1:1' | '3:5'; // default '1:1' (equal width with cert) or '2:1' (wide 2x)
  photoFilters?: PhotoFilters; // user-adjusted photo filters
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
  photoOverlayConfig?: PersonalPhotoOverlayConfig;
  raceId?: string;
  defaultBgUrl?: string;
  activeFieldId?: string;
  showGuide?: boolean;
}

/**
 * Draws the Certificate Collage: Personal Photo (1:1 Equal, 2:1 Wide, or 3:5 Compact) + Finisher Certificate
 * The personal photo area shows the runner's photo with user adjustments and adaptive telemetry CP HUD.
 */
export const drawCollageFrame = async (options: DrawCollageOptions): Promise<void> => {
  const {
    canvas,
    runner,
    config,
    personalImageObj,
    photoZoom = 1.0,
    photoOffsetX = 0,
    photoOffsetY = 0,
    photoSide = 'left',
    photoRatio = '1:1',
    photoFilters,
    customImageObj,
    generatedImageObj,
    photoOverlayConfig,
    raceId,
    defaultBgUrl,
    activeFieldId,
    showGuide,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Base certificate natural dimensions (NA26.png: 1469 x 3508)
  const certW = 1469;
  const certH = 3508;

  // Personal photo width option:
  // - '1:1': Tỉ lệ 1:1 ngang bằng khung Certificate (photoW = certW = 1080px)
  // - '2:1': Tỉ lệ 2:1 rộng gấp đôi Certificate (photoW = 2 * certW = 2160px)
  // - '3:5': Tỉ lệ 3/5 thu gọn (photoW = 0.6 * certW = 648px)
  const isCompactRatio = photoRatio === '3:5';
  const isEqualRatio = photoRatio === '1:1';
  const photoMultiplier =
    photoRatio === '1:1'
      ? 1
      : photoRatio === '3:5'
      ? (3 / 5)
      : 2;
  const photoW = Math.round(certW * photoMultiplier);
  const photoH = certH;

  // Combined total dimensions
  const totalW = photoW + certW;
  const totalH = certH;

  if (canvas.width !== totalW || canvas.height !== totalH) {
    canvas.width = totalW;
    canvas.height = totalH;
  }

  // Clear canvas
  ctx.clearRect(0, 0, totalW, totalH);

  const isPhotoLeft = photoSide === 'left';
  const photoX = isPhotoLeft ? 0 : certW;
  const certX = isPhotoLeft ? photoW : 0;

  // 1. Draw Certificate on its designated 1/3 section
  const offscreenCert = document.createElement('canvas');
  offscreenCert.width = certW;
  offscreenCert.height = certH;

  await drawCertificate({
    canvas: offscreenCert,
    runner,
    config,
    customImageObj,
    generatedImageObj,
    raceId,
    defaultBgUrl,
    activeFieldId,
    showGuide,
  });

  ctx.drawImage(offscreenCert, certX, 0, certW, totalH);

  // 2. Draw Personal Photo on its designated 2/3 section
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, 0, photoW, totalH);
  ctx.clip();

  // Draw background color #f4f4f4 underneath the inserted photo
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(photoX, 0, photoW, totalH);

  if (personalImageObj && personalImageObj.complete && personalImageObj.naturalWidth > 0) {
    const imgW = personalImageObj.naturalWidth;
    const imgH = personalImageObj.naturalHeight;

    // Cover scale to fill the 2W x 1H area
    const baseScale = Math.max(photoW / imgW, totalH / imgH);
    const scale = baseScale * photoZoom;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const centerX = photoX + photoW / 2 + photoOffsetX;
    const centerY = totalH / 2 + photoOffsetY;

    // Prepare manual filter values (default is 100% / 0 - no automatic filter)
    const brightness = photoFilters?.brightness ?? 100;
    const contrast = photoFilters?.contrast ?? 100;
    const saturation = photoFilters?.saturation ?? 100;
    const warmth = photoFilters?.warmth ?? 0;

    const useNativeFilter = isCanvasFilterSupported();
    let filterSource: CanvasImageSource = personalImageObj;

    if (useNativeFilter) {
      const filterParts: string[] = [];
      if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
      if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
      if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);

      if (filterParts.length > 0) {
        ctx.filter = filterParts.join(' ');
      } else {
        ctx.filter = 'none';
      }
    } else {
      // Mobile / iOS Safari fallback: pixel LUT on offscreen canvas
      ctx.filter = 'none';
      filterSource = getFilteredImageSource(personalImageObj, photoFilters);
    }

    ctx.drawImage(filterSource, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    ctx.filter = 'none';

    // Warmth / Color temperature tint (applied via overlay on desktop native mode; on mobile LUT already computed it)
    if (useNativeFilter && warmth !== 0) {
      ctx.save();
      if (warmth > 0) {
        ctx.fillStyle = `rgba(255, 175, 75, ${Math.min(0.28, (warmth / 50) * 0.22)})`;
        ctx.globalCompositeOperation = 'color';
        ctx.fillRect(photoX, 0, photoW, totalH);
      } else {
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(0.28, (Math.abs(warmth) / 50) * 0.22)})`;
        ctx.globalCompositeOperation = 'color';
        ctx.fillRect(photoX, 0, photoW, totalH);
      }
      ctx.restore();
    }
  } else {
    // Elegant light placeholder background #f4f4f4
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(photoX, 0, photoW, totalH);

    const centerX = photoX + photoW / 2;
    const centerY = totalH * 0.44;

    const isCompact = isCompactRatio;
    const cardW = Math.min(Math.round(photoW * 0.90), isCompact ? 950 : 1350);
    const cardH = Math.min(Math.round(totalH * 0.48), isCompact ? 1450 : 1650);
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    // Draw Dropzone Card Container
    ctx.save();
    // Card background: Clean crisp white with gentle border
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, cardX, cardY, cardW, cardH, 44);
    ctx.fill();

    // High contrast dashed border for drop zone
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.setLineDash([28, 20]);
    roundRect(ctx, cardX, cardY, cardW, cardH, 44);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Big Camera Icon Circle with Add (+) Badge
    const iconCircleR = isCompact ? 135 : isEqualRatio ? 170 : 190;
    const iconCenterY = cardY + cardH * 0.31;

    ctx.save();
    // Outer subtle ring
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(centerX, iconCenterY, iconCircleR + 22, 0, Math.PI * 2);
    ctx.fill();

    // Inner icon circle
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(centerX, iconCenterY, iconCircleR, 0, Math.PI * 2);
    ctx.fill();

    // Camera vector icon
    ctx.strokeStyle = '#0369a1';
    ctx.fillStyle = '#0369a1';
    ctx.lineWidth = isCompact ? 10 : 13;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const icW = iconCircleR * 0.92;
    const icH = iconCircleR * 0.68;
    const icX = centerX;
    const icY = iconCenterY;

    // Camera body
    roundRect(ctx, icX - icW / 2, icY - icH / 2 + 6, icW, icH, 18);
    ctx.stroke();

    // Camera lens
    ctx.beginPath();
    ctx.arc(icX, icY + 6, iconCircleR * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    // Camera flash notch
    roundRect(ctx, icX - icW * 0.22, icY - icH / 2 - 10, icW * 0.44, 16, 5);
    ctx.fill();

    // Small lens reflection
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.arc(icX + iconCircleR * 0.28, icY - icH / 2 + 18, 8, 0, Math.PI * 2);
    ctx.fill();

    // Plus (+) Badge at bottom-right of icon circle
    const badgeR = iconCircleR * 0.36;
    const badgeX = centerX + iconCircleR * 0.65;
    const badgeY = iconCenterY + iconCircleR * 0.65;

    // Badge background with border
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.stroke();

    // Plus symbol
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const plusSize = badgeR * 0.50;
    ctx.beginPath();
    ctx.moveTo(badgeX - plusSize, badgeY);
    ctx.lineTo(badgeX + plusSize, badgeY);
    ctx.moveTo(badgeX, badgeY - plusSize);
    ctx.lineTo(badgeX, badgeY + plusSize);
    ctx.stroke();

    ctx.restore();

    // Minimalist, high-contrast action text (significantly enlarged for readability)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Primary Action Pill Button: "THÊM ẢNH CỦA BẠN"
    const btnW = Math.min(cardW * 0.88, isCompact ? 800 : 1060);
    const btnH = isCompact ? 150 : 176;
    const btnY = cardY + cardH * 0.59;
    const btnX = centerX - btnW / 2;

    ctx.save();
    // Subtle shadow for button
    ctx.shadowColor = 'rgba(2, 132, 199, 0.28)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, '#0369a1');
    btnGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fill();
    ctx.restore();

    const btnFontSize = isCompact ? 64 : isEqualRatio ? 76 : 82;
    ctx.font = `800 ${btnFontSize}px 'Montserrat', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('THÊM ẢNH CỦA BẠN', centerX, btnY + btnH / 2);

    // 2. Clear, high-contrast subtext: "Chạm hoặc kéo thả ảnh vào đây"
    const subFontSize = isCompact ? 52 : isEqualRatio ? 60 : 66;
    ctx.font = `700 ${subFontSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#0f172a';
    const subY = btnY + btnH + (isCompact ? 80 : 100);
    ctx.fillText('Chạm hoặc kéo thả ảnh vào đây', centerX, subY);
  }

  ctx.restore();
};

export interface DrawSquareFrameOptions {
  canvas: HTMLCanvasElement;
  runner: Runner;
  config: CertificateConfig;
  personalImageObj?: HTMLImageElement | null;
  photoZoom?: number; // default 1.0
  photoOffsetX?: number; // offset in px
  photoOffsetY?: number; // offset in px
  photoSide?: 'left' | 'right'; // default 'left'
  showPhotoBadge?: boolean; // default true
  customImageObj?: HTMLImageElement | null;
  generatedImageObj?: HTMLImageElement | null;
  raceId?: string;
  defaultBgUrl?: string;
}

/**
 * Draws the 1:1 Square Social Media Frame (Width = 2x certificate width, sharp square corners)
 * One half is user's personal running photo, the other half is the finisher certificate.
 */
export const drawSquareSocialFrame = async (options: DrawSquareFrameOptions): Promise<void> => {
  const {
    canvas,
    runner,
    config,
    personalImageObj,
    photoZoom = 1.0,
    photoOffsetX = 0,
    photoOffsetY = 0,
    photoSide = 'left',
    showPhotoBadge = true,
    customImageObj,
    generatedImageObj,
    raceId,
    defaultBgUrl,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width; // Square canvas: width == height (e.g. 2160)
  const halfWidth = size / 2; // e.g. 1080 (Matches cert width, so frame is double cert width!)

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  const photoX = photoSide === 'left' ? 0 : halfWidth;
  const certX = photoSide === 'left' ? halfWidth : 0;

  // 1. Draw Certificate on its designated half
  const offscreenCert = document.createElement('canvas');
  offscreenCert.width = halfWidth;
  offscreenCert.height = size;

  await drawCertificate({
    canvas: offscreenCert,
    runner,
    config,
    customImageObj,
    generatedImageObj,
    raceId,
    defaultBgUrl,
  });

  ctx.drawImage(offscreenCert, certX, 0, halfWidth, size);

  // 2. Draw Personal Photo on the other half
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, 0, halfWidth, size);
  ctx.clip();

  // Background color #f4f4f4 under photo
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(photoX, 0, halfWidth, size);

  if (personalImageObj && personalImageObj.complete && personalImageObj.naturalWidth > 0) {
    const imgW = personalImageObj.naturalWidth;
    const imgH = personalImageObj.naturalHeight;

    // Cover scale
    const baseScale = Math.max(halfWidth / imgW, size / imgH);
    const scale = baseScale * photoZoom;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const centerX = photoX + halfWidth / 2 + photoOffsetX;
    const centerY = size / 2 + photoOffsetY;

    ctx.drawImage(personalImageObj, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    // Athletic gradient placeholder background
    const placeholderGrad = ctx.createLinearGradient(photoX, 0, photoX + halfWidth, size);
    placeholderGrad.addColorStop(0, '#0a1d37');
    placeholderGrad.addColorStop(0.5, '#072448');
    placeholderGrad.addColorStop(1, '#051329');
    ctx.fillStyle = placeholderGrad;
    ctx.fillRect(photoX, 0, halfWidth, size);

    // Decorative track curves
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(photoX + halfWidth / 2, size * 0.42, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle runner graphic
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(photoX + halfWidth / 2, size * 0.36, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(photoX + halfWidth / 2 - 50, size * 0.44);
    ctx.lineTo(photoX + halfWidth / 2 + 50, size * 0.44);
    ctx.lineTo(photoX + halfWidth / 2 + 80, size * 0.58);
    ctx.lineTo(photoX + halfWidth / 2 - 80, size * 0.58);
    ctx.closePath();
    ctx.fill();

    // Guidance text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(size * 0.026)}px 'Montserrat', sans-serif`;
    ctx.fillText('THÊM ẢNH CỦA BẠN', photoX + halfWidth / 2, size * 0.63);

    ctx.fillStyle = '#bae6fd';
    ctx.font = `600 ${Math.round(size * 0.018)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText('Chạm hoặc kéo thả ảnh vào đây', photoX + halfWidth / 2, size * 0.68);
  }

  // 3. Optional Overlay Badge on the Photo
  if (showPhotoBadge) {
    // Bottom scrim gradient
    const scrimHeight = size * 0.24;
    const scrimGrad = ctx.createLinearGradient(0, size - scrimHeight, 0, size);
    scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrimGrad.addColorStop(0.35, 'rgba(3, 15, 30, 0.7)');
    scrimGrad.addColorStop(1, 'rgba(2, 10, 20, 0.95)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(photoX, size - scrimHeight, halfWidth, scrimHeight);

    // Pill badge: FINISHER 2026
    const badgeY = size - scrimHeight + 35;
    const badgeW = 240;
    const badgeH = 42;
    const badgeX = photoX + (halfWidth - badgeW) / 2;

    ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 21);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 18px 'Montserrat', sans-serif`;
    ctx.fillText('★ FINISHER 2026 ★', photoX + halfWidth / 2, badgeY + badgeH / 2);

    // Runner Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(size * 0.022)}px 'Montserrat', sans-serif`;
    ctx.fillText(runner.name.toUpperCase(), photoX + halfWidth / 2, size - 100);

    // Distance & Time
    ctx.fillStyle = '#fddfac';
    ctx.font = `600 ${Math.round(size * 0.016)}px 'Montserrat', sans-serif`;
    ctx.fillText(`${runner.distance} • BIB: ${runner.bib} • Chip: ${runner.chipTime}`, photoX + halfWidth / 2, size - 60);
  }

  ctx.restore();
};
