import { Runner, PersonalPhotoOverlayConfig } from '../types';
import { getRunnerSplitData, RunnerSplitData, CheckpointSplit } from './runnerSplits';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

export interface DrawPhotoTelemetryOptions {
  ctx: CanvasRenderingContext2D;
  photoX: number;
  photoW: number;
  photoH: number;
  runner: Runner;
  overlayConfig?: PersonalPhotoOverlayConfig;
}

/**
 * Draws the Running Telemetry HUD & CP Segments Pace Chart directly onto the runner's personal photo.
 * REFINED DESIGN:
 * 1. NO opaque background card: does NOT block the runner's photo or body.
 * 2. Gentle dark gradient (semi-transparent scrim) at the bottom just enough to make bright numbers pop.
 * 3. NO personal info: completely removed name, bib, age, category, finisher tags (those are on the certificate).
 * 4. Larger, high-contrast, crystal-clear typography for all metrics (GunTime, ChipTime, Avg Pace, CP times & paces).
 * 5. Clean, energetic neon pace curve with glowing nodes and clear pace labels.
 */
export function drawPhotoTelemetryHUD(options: DrawPhotoTelemetryOptions): void {
  const { ctx, photoX, photoW, photoH, runner, overlayConfig } = options;

  if (overlayConfig && !overlayConfig.showOverlay) {
    return;
  }

  const splitData: RunnerSplitData = getRunnerSplitData(runner);
  const isTop = overlayConfig?.position === 'top';
  const showChart = overlayConfig?.showChart ?? true;

  // Detect layout profile:
  // - 'wide': 2x certificate width (~2160px)
  // - 'equal': 1:1 equal with certificate (~1080px)
  // - 'narrow': 3/5 certificate width (~648px)
  const profile: 'wide' | 'equal' | 'narrow' =
    photoW >= 1600 ? 'wide' : photoW >= 850 ? 'equal' : 'narrow';

  const isCompact = profile === 'narrow';
  const scale = profile === 'wide' ? photoW / 2160 : 1.0;

  ctx.save();

  // 1. Soft Gradient Scrim: smooth dark vignette so the runner's photo remains visible
  const scrimH =
    profile === 'wide'
      ? (showChart ? 660 * scale : 340 * scale)
      : profile === 'equal'
      ? (showChart ? 640 : 280)
      : (showChart ? 660 : 280);

  const scrimY = isTop ? 0 : photoH - scrimH;
  const scrimGrad = ctx.createLinearGradient(
    0,
    isTop ? scrimH : scrimY,
    0,
    isTop ? 0 : photoH
  );
  scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrimGrad.addColorStop(0.25, profile === 'wide' ? 'rgba(3, 7, 18, 0.45)' : 'rgba(3, 7, 18, 0.55)');
  scrimGrad.addColorStop(0.65, profile === 'wide' ? 'rgba(3, 7, 18, 0.75)' : 'rgba(3, 7, 18, 0.85)');
  scrimGrad.addColorStop(1, 'rgba(2, 6, 16, 0.95)');

  ctx.fillStyle = scrimGrad;
  ctx.fillRect(photoX, scrimY, photoW, scrimH);

  // Content boundaries
  const padX = profile === 'wide' ? 80 * scale : profile === 'equal' ? 36 : 24;
  const contentX = photoX + padX;
  const contentW = photoW - padX * 2;

  // 2. Top Metric Bar (Minimalist, Large Font, No Personal Info):
  // Displays: GUN TIME  •  CHIP TIME  •  AVERAGE PACE
  const topMetricsY =
    profile === 'wide'
      ? (isTop ? 70 * scale : photoH - (showChart ? 580 * scale : 260 * scale))
      : profile === 'equal'
      ? (isTop ? 50 : photoH - (showChart ? 565 : 230))
      : (isTop ? 45 : photoH - (showChart ? 590 : 230));

  const keyMetrics = [
    {
      label: 'GUN TIME',
      value: splitData.gunTime,
      color: '#FFFFFF',
    },
    {
      label: 'CHIP TIME',
      value: splitData.chipTime,
      color: '#4ade80', // vibrant neon emerald/mint
    },
    {
      label: 'AVG PACE',
      value: splitData.avgPace,
      color: '#facc15', // vivid energetic yellow
    },
  ];

  const colWidth = contentW / keyMetrics.length;

  keyMetrics.forEach((metric, idx) => {
    const centerX = contentX + colWidth * idx + colWidth / 2;

    // Label with drop shadow for clarity
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = profile === 'wide' ? 10 * scale : profile === 'equal' ? 8 : 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = profile === 'wide' ? 3 * scale : 2;

    ctx.fillStyle = '#94a3b8';
    const labelFontSize =
      profile === 'wide'
        ? Math.round(20 * scale)
        : profile === 'equal'
        ? 16
        : 13;
    ctx.font = `800 ${labelFontSize}px 'Montserrat', sans-serif`;
    ctx.fillText(metric.label, centerX, topMetricsY);

    // Large high-contrast value
    ctx.fillStyle = metric.color;
    const valFontSize =
      profile === 'wide'
        ? Math.round(44 * scale)
        : profile === 'equal'
        ? 34
        : 26;
    ctx.font = `900 ${valFontSize}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;
    const valOffsetY = profile === 'wide' ? 30 * scale : profile === 'equal' ? 24 : 20;
    ctx.fillText(metric.value, centerX, topMetricsY + valOffsetY);
  });

  // Reset shadows
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  if (!showChart) {
    ctx.restore();
    return;
  }

  // 3. Subtle translucent hairline divider
  const lineY =
    profile === 'wide'
      ? topMetricsY + 95 * scale
      : profile === 'equal'
      ? topMetricsY + 76
      : topMetricsY + 62;
  const dividerGrad = ctx.createLinearGradient(contentX, 0, contentX + contentW, 0);
  dividerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  dividerGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.25)');
  dividerGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
  dividerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.strokeStyle = dividerGrad;
  ctx.lineWidth = profile === 'wide' ? 1.5 * scale : 1.5;
  ctx.beginPath();
  ctx.moveTo(contentX, lineY);
  ctx.lineTo(contentX + contentW, lineY);
  ctx.stroke();

  // 4. Checkpoint Pace Chart Section
  const chartY =
    profile === 'wide'
      ? lineY + 30 * scale
      : profile === 'equal'
      ? lineY + 24
      : lineY + 22;
  const chartH =
    profile === 'wide'
      ? 200 * scale
      : profile === 'equal'
      ? 180
      : 160;
  const chartBaselineY = chartY + chartH;

  const checkpoints: CheckpointSplit[] = splitData.checkpoints;
  const pointCount = checkpoints.length;

  const chartMarginX =
    profile === 'wide'
      ? 90 * scale
      : profile === 'equal'
      ? 48
      : 32;
  const chartInnerW = contentW - chartMarginX * 2;

  // Min & Max pace for smooth auto-scaling
  const paceSecondsList = checkpoints.map((c) => c.paceSeconds).filter((s) => s > 0);
  const minPaceSec = Math.min(...paceSecondsList, 240);
  const maxPaceSec = Math.max(...paceSecondsList, 600);
  const paceRange = Math.max(maxPaceSec - minPaceSec, 60);

  // Calculate coordinates of each checkpoint node
  const points = checkpoints.map((cp, idx) => {
    const x = contentX + chartMarginX + (idx / (pointCount - 1)) * chartInnerW;
    // Faster pace = higher Y coordinate in chart
    const normalized = (cp.paceSeconds - minPaceSec) / paceRange;
    const y =
      profile === 'wide'
        ? chartY + 35 * scale + normalized * (chartH - 65 * scale)
        : profile === 'equal'
        ? chartY + 28 + normalized * (chartH - 56)
        : chartY + 25 + normalized * (chartH - 50);
    return { cp, x, y };
  });

  // Background subtle guideline dashes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = profile === 'wide' ? 1 * scale : 1;
  ctx.setLineDash(profile === 'wide' ? [8 * scale, 8 * scale] : [6, 6]);
  [0.3, 0.7].forEach((ratio) => {
    const gy = chartY + ratio * chartH;
    ctx.beginPath();
    ctx.moveTo(contentX, gy);
    ctx.lineTo(contentX + contentW, gy);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Vertical guideline drops from nodes
  points.forEach((pt) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = profile === 'wide' ? 1.5 * scale : 1.5;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x, chartBaselineY + (profile === 'wide' ? 15 * scale : 12));
    ctx.stroke();
  });

  // Glowing Gradient Fill Under the Curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, chartBaselineY);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i];
    const pNext = points[i + 1];
    const cpX1 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY1 = pCurrent.y;
    const cpX2 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY2 = pNext.y;
    ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pNext.x, pNext.y);
  }

  ctx.lineTo(points[points.length - 1].x, chartBaselineY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartBaselineY);
  areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  areaGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.18)');
  areaGrad.addColorStop(1, 'rgba(3, 105, 161, 0.01)');
  ctx.fillStyle = areaGrad;
  ctx.fill();
  ctx.restore();

  // High-Energy Glowing Line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i];
    const pNext = points[i + 1];
    const cpX1 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY1 = pCurrent.y;
    const cpX2 = pCurrent.x + (pNext.x - pCurrent.x) / 2;
    const cpY2 = pNext.y;
    ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pNext.x, pNext.y);
  }

  // Neon line glow
  ctx.shadowColor = 'rgba(56, 189, 248, 0.95)';
  ctx.shadowBlur = profile === 'wide' ? 16 * scale : 12;
  const lineGrad = ctx.createLinearGradient(contentX, 0, contentX + contentW, 0);
  lineGrad.addColorStop(0, '#38bdf8');
  lineGrad.addColorStop(0.5, '#2dd4bf');
  lineGrad.addColorStop(1, '#facc15');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = profile === 'wide' ? 5 * scale : 4;
  ctx.stroke();
  ctx.restore();

  // Nodes & Floating Pace Callout Badges
  points.forEach((pt, idx) => {
    // Outer halo
    ctx.fillStyle = idx === points.length - 1 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(45, 212, 191, 0.35)';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, profile === 'wide' ? 16 * scale : profile === 'equal' ? 12 : 10, 0, Math.PI * 2);
    ctx.fill();

    // Node circle border
    ctx.strokeStyle = idx === points.length - 1 ? '#facc15' : '#38bdf8';
    ctx.lineWidth = profile === 'wide' ? 3.5 * scale : 3;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, profile === 'wide' ? 9 * scale : profile === 'equal' ? 7 : 6, 0, Math.PI * 2);
    ctx.stroke();

    // Node core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, profile === 'wide' ? 4.5 * scale : 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Floating Pace Bubble above node
    if (idx > 0) {
      const paceVal = pt.cp.pace;
      const bubbleW = profile === 'wide' ? 110 * scale : profile === 'equal' ? 86 : 68;
      const bubbleH = profile === 'wide' ? 36 * scale : profile === 'equal' ? 28 : 24;
      const bubbleX = pt.x - bubbleW / 2;
      const bubbleY = pt.y - bubbleH - (profile === 'wide' ? 15 * scale : profile === 'equal' ? 10 : 8);

      ctx.save();
      // Translucent bubble with sharp contrast
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = profile === 'wide' ? 8 * scale : 6;
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, profile === 'wide' ? 10 * scale : 7);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = idx === points.length - 1 ? 'rgba(250, 204, 21, 0.8)' : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = profile === 'wide' ? 1.5 * scale : 1;
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, profile === 'wide' ? 10 * scale : 7);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = idx === points.length - 1 ? '#facc15' : '#78ffd8';
      const bubbleFont =
        profile === 'wide'
          ? Math.round(17 * scale)
          : profile === 'equal'
          ? 13
          : 11;
      ctx.font = `900 ${bubbleFont}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;
      ctx.fillText(`${paceVal}${profile === 'narrow' ? '' : '/km'}`, pt.x, bubbleY + bubbleH / 2);
    }
  });

  // 5. Checkpoint Labels & Clear Big Data (Under Baseline)
  const infoRowY = chartBaselineY + (profile === 'wide' ? 28 * scale : profile === 'equal' ? 20 : 16);

  points.forEach((pt, idx) => {
    const isStart = idx === 0;
    const isFinish = idx === points.length - 1;

    // Checkpoint pill title
    const maxPillWidth = (chartInnerW / pointCount) - (profile === 'wide' ? 10 : 8);
    const pillW =
      profile === 'wide'
        ? 120 * scale
        : profile === 'equal'
        ? Math.min(100, maxPillWidth)
        : Math.min(78, maxPillWidth);
    const pillH = profile === 'wide' ? 34 * scale : profile === 'equal' ? 26 : 22;
    const pillX = pt.x - pillW / 2;
    const pillY = infoRowY;

    ctx.fillStyle = isFinish
      ? 'rgba(234, 179, 8, 0.25)'
      : isStart
      ? 'rgba(148, 163, 184, 0.25)'
      : 'rgba(56, 189, 248, 0.25)';

    ctx.strokeStyle = isFinish
      ? 'rgba(234, 179, 8, 0.8)'
      : isStart
      ? 'rgba(148, 163, 184, 0.7)'
      : 'rgba(56, 189, 248, 0.7)';

    roundRect(ctx, pillX, pillY, pillW, pillH, profile === 'wide' ? 17 * scale : 13);
    ctx.fill();
    ctx.lineWidth = profile === 'wide' ? 1.5 * scale : 1;
    roundRect(ctx, pillX, pillY, pillW, pillH, profile === 'wide' ? 17 * scale : 13);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isFinish ? '#facc15' : isStart ? '#f1f5f9' : '#38bdf8';
    const pillFont =
      profile === 'wide'
        ? Math.round(15 * scale)
        : profile === 'equal'
        ? 12
        : 10;
    ctx.font = `800 ${pillFont}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;

    const pillLabel =
      profile === 'wide'
        ? `${pt.cp.label.toUpperCase()} (${pt.cp.km}K)`
        : profile === 'equal'
        ? (pointCount <= 4 ? `${pt.cp.label.toUpperCase()} (${pt.cp.km}K)` : `${pt.cp.km}K`)
        : isStart ? 'START' : isFinish ? 'FINISH' : `${pt.cp.km}K`;
    ctx.fillText(pillLabel, pt.x, pillY + pillH / 2);

    // Large Time Text
    const timeY = pillY + pillH + (profile === 'wide' ? 28 * scale : profile === 'equal' ? 22 : 18);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = profile === 'wide' ? 8 * scale : 6;
    ctx.fillStyle = '#FFFFFF';
    const timeFont =
      profile === 'wide'
        ? Math.round(26 * scale)
        : profile === 'equal'
        ? 21
        : 17;
    ctx.font = `900 ${timeFont}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;
    ctx.fillText(pt.cp.time, pt.x, timeY);
    ctx.shadowBlur = 0;

    // Segment Pace info
    const paceDescY = timeY + (profile === 'wide' ? 28 * scale : profile === 'equal' ? 22 : 18);
    if (isStart) {
      ctx.fillStyle = '#94a3b8';
      const paceFont = profile === 'wide' ? Math.round(15 * scale) : profile === 'equal' ? 13 : 11;
      ctx.font = `700 ${paceFont}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;
      ctx.fillText('Xuất phát', pt.x, paceDescY);
    } else {
      ctx.fillStyle = isFinish ? '#fde047' : '#78ffd8';
      const paceFont = profile === 'wide' ? Math.round(17 * scale) : profile === 'equal' ? 14 : 12;
      ctx.font = `800 ${paceFont}px 'Neue Plak Bold', 'Neue Plak', 'Montserrat', sans-serif`;
      ctx.fillText(`Pace: ${pt.cp.pace}`, pt.x, paceDescY);
    }
  });

  ctx.restore();
}
