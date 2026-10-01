import { Runner } from '../types';

export interface CheckpointSplit {
  id: string;
  label: string;
  km: number;
  time: string; // formatted time e.g. "01:26:40"
  pace: string; // formatted pace e.g. "8:40" or "8:40 /km"
  paceSeconds: number; // numeric pace in seconds/km for chart scaling
}

export interface RunnerSplitData {
  startTime: string;
  cp1: string;
  cp1Pace: string;
  cp2: string;
  cp2Pace: string;
  cp3: string;
  cp3Pace: string;
  avgPace: string;
  finishPace: string;
  gunTime: string;
  chipTime: string;
  distanceKm: number;
  checkpoints: CheckpointSplit[];
}

/**
 * Parses time string like "6:25:24" or "06:25:24" or "59:13" into total seconds
 */
export function timeStringToSeconds(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(/[^\d:]/g, '');
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatSecondsToTime(totalSeconds: number, forceHours: boolean = false): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '--:--:--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0 || forceHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats seconds per km into pace string "M:SS"
 */
export function formatPace(secondsPerKm: number): string {
  if (isNaN(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parses pace string like "8:40" or "8:40 /km" or "8'40\"" into seconds/km
 */
export function paceStringToSeconds(paceStr: string | undefined): number {
  if (!paceStr) return 0;
  const match = paceStr.match(/(\d+)[:'m]\s*(\d+)/i);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  }
  const numeric = parseFloat(paceStr.replace(/[^\d.]/g, ''));
  if (!isNaN(numeric) && numeric > 0 && numeric < 30) {
    // decimal minutes like 8.5 min/km
    return Math.round(numeric * 60);
  }
  return 0;
}

/**
 * Determines total race distance in KM from distance string
 */
export function getDistanceKm(distanceStr: string): number {
  const upper = (distanceStr || '').toUpperCase();
  if (upper.includes('FULL') || upper.includes('42') || upper === 'FM' || upper === 'M') return 42.195;
  if (upper.includes('HALF') || upper.includes('21') || upper === 'HM') return 21.0975;
  if (upper.includes('10') || upper === '10K' || upper === '10KM') return 10.0;
  if (upper.includes('5') || upper === '5K' || upper === '5KM') return 5.0;
  return 42.195;
}

/**
 * Returns complete split data and checkpoints for a given runner.
 * If the runner has direct values from sheet/script, uses them.
 * Otherwise, realistically estimates CP1, CP2, CP3 based on chipTime & distance.
 */
export function getRunnerSplitData(runner: Runner): RunnerSplitData {
  const totalDistanceKm = getDistanceKm(runner.distance);
  const chipSeconds = timeStringToSeconds(runner.chipTime) || 14400; // fallback 4h if invalid
  const gunSeconds = timeStringToSeconds(runner.gunTime) || chipSeconds + 23;

  // 1. Calculate or get Start Time
  const defaultStartTime = totalDistanceKm > 30 ? '03:00:00' : totalDistanceKm > 15 ? '04:00:00' : totalDistanceKm > 8 ? '05:00:00' : '05:30:00';
  const startTime = runner.startTime || defaultStartTime;

  // 2. Calculate or get Average Pace
  const calculatedAvgPaceSec = totalDistanceKm > 0 ? chipSeconds / totalDistanceKm : 360;
  const avgPaceStr = runner.avgPace || `${formatPace(calculatedAvgPaceSec)} /km`;

  // Milestone distances based on race category
  let cp1Km = 10.0;
  let cp2Km = 21.1;
  let cp3Km = 30.0;

  if (totalDistanceKm <= 6.0) {
    // 5KM race
    cp1Km = 1.5;
    cp2Km = 3.0;
    cp3Km = 4.0;
  } else if (totalDistanceKm <= 12.0) {
    // 10KM race
    cp1Km = 2.5;
    cp2Km = 5.0;
    cp3Km = 7.5;
  } else if (totalDistanceKm <= 25.0) {
    // Half Marathon 21.1KM
    cp1Km = 5.0;
    cp2Km = 10.0;
    cp3Km = 15.0;
  } else {
    // Full Marathon 42.195KM
    cp1Km = 10.0;
    cp2Km = 21.0975;
    cp3Km = 30.0;
  }

  // Realistic split pacing: Runners usually start slightly faster (negative pace variation),
  // sustain during middle, and slow slightly near CP3, then sprint or hold to finish.
  const paceCp1Ratio = 0.96; // slightly faster than avg
  const paceCp2Ratio = 0.99; // near avg
  const paceCp3Ratio = 1.05; // slightly slower at 30km wall
  const paceFinishRatio = 1.02; // sprint to finish

  const paceCp1Sec = runner.cp1Pace ? paceStringToSeconds(runner.cp1Pace) : calculatedAvgPaceSec * paceCp1Ratio;
  const paceCp2Sec = runner.cp2Pace ? paceStringToSeconds(runner.cp2Pace) : calculatedAvgPaceSec * paceCp2Ratio;
  const paceCp3Sec = runner.cp3Pace ? paceStringToSeconds(runner.cp3Pace) : calculatedAvgPaceSec * paceCp3Ratio;
  const paceFinishSec = runner.finishPace ? paceStringToSeconds(runner.finishPace) : calculatedAvgPaceSec * paceFinishRatio;

  // Cumulative times
  const timeCp1Sec = runner.cp1 ? timeStringToSeconds(runner.cp1) : Math.round(cp1Km * paceCp1Sec);
  const timeCp2Sec = runner.cp2 ? timeStringToSeconds(runner.cp2) : Math.round(timeCp1Sec + (cp2Km - cp1Km) * paceCp2Sec);
  const timeCp3Sec = runner.cp3 ? timeStringToSeconds(runner.cp3) : Math.round(timeCp2Sec + (cp3Km - cp2Km) * paceCp3Sec);

  const cp1Time = runner.cp1 || formatSecondsToTime(timeCp1Sec, totalDistanceKm > 20);
  const cp1Pace = runner.cp1Pace || `${formatPace(paceCp1Sec)} /km`;

  const cp2Time = runner.cp2 || formatSecondsToTime(timeCp2Sec, totalDistanceKm > 20);
  const cp2Pace = runner.cp2Pace || `${formatPace(paceCp2Sec)} /km`;

  const cp3Time = runner.cp3 || formatSecondsToTime(timeCp3Sec, totalDistanceKm > 20);
  const cp3Pace = runner.cp3Pace || `${formatPace(paceCp3Sec)} /km`;

  const finishPace = runner.finishPace || `${formatPace(paceFinishSec)} /km`;

  // Build Checkpoints array for the Chart
  const checkpoints: CheckpointSplit[] = [
    {
      id: 'start',
      label: 'Start',
      km: 0,
      time: startTime,
      pace: '-',
      paceSeconds: calculatedAvgPaceSec,
    },
    {
      id: 'cp1',
      label: 'CP1',
      km: Math.round(cp1Km * 10) / 10,
      time: cp1Time,
      pace: cp1Pace.replace(/\s*\/km/i, ''),
      paceSeconds: paceCp1Sec,
    },
    {
      id: 'cp2',
      label: 'CP2',
      km: Math.round(cp2Km * 10) / 10,
      time: cp2Time,
      pace: cp2Pace.replace(/\s*\/km/i, ''),
      paceSeconds: paceCp2Sec,
    },
    {
      id: 'cp3',
      label: 'CP3',
      km: Math.round(cp3Km * 10) / 10,
      time: cp3Time,
      pace: cp3Pace.replace(/\s*\/km/i, ''),
      paceSeconds: paceCp3Sec,
    },
    {
      id: 'finish',
      label: 'Finish',
      km: Math.round(totalDistanceKm * 10) / 10,
      time: runner.chipTime || formatSecondsToTime(chipSeconds, totalDistanceKm > 20),
      pace: finishPace.replace(/\s*\/km/i, ''),
      paceSeconds: paceFinishSec,
    },
  ];

  return {
    startTime,
    cp1: cp1Time,
    cp1Pace,
    cp2: cp2Time,
    cp2Pace,
    cp3: cp3Time,
    cp3Pace,
    avgPace: avgPaceStr,
    finishPace,
    gunTime: runner.gunTime || formatSecondsToTime(gunSeconds, totalDistanceKm > 20),
    chipTime: runner.chipTime || formatSecondsToTime(chipSeconds, totalDistanceKm > 20),
    distanceKm: totalDistanceKm,
    checkpoints,
  };
}
