/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarketItem, TimezoneMetadata, UtcOffset } from '../data/timezones';

/**
 * Convierte un UtcOffset ('-04:00', '+05:30', 'Z') a minutos totales.
 */
export function parseOffsetToMinutes(offset: UtcOffset): number {
  if (offset === 'Z') return 0;
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

/**
 * Convierte minutos del día a string 'HH:mm' con 2 dígitos (24h).
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convierte minutos del día a formato 12 horas con AM/PM legible.
 */
export function formatMinutesTo12h(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const rawHours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convierte string 'HH:mm' a minutos transcurridos desde medianoche.
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((val) => parseInt(val, 10));
  return (h || 0) * 60 + (m || 0);
}

export interface BoxCalculationResult {
  // Horas en formato 24h 'HH:mm'
  marketOpenUtc: string;
  marketOpenLocal: string;
  marketOpenLocal12h: string;
  boxStartLocal: string;
  boxStartLocal12h: string;
  boxEndLocal: string;
  boxEndLocal12h: string;
  // Parámetro para TradingView
  tradingViewInterval: string;
  tradingViewFormatted: string; // ej: '08:30 — 10:00'
  dayShiftNotice?: string; // Si cruza medianoche respecto al día UTC
  userOffsetFormatted: string; // ej: 'UTC-4'
  marketOffsetFormatted: string; // ej: 'UTC-4' o 'UTC-5'
  boxDurationMinutes: number; // Siempre 90 minutos
}

/**
 * Determina si una fecha específica (o la fecha actual) cae en horario de verano en EE. UU.
 */
export function isUsDst(date: Date = new Date()): boolean {
  // EE. UU. DST: Segundo domingo de marzo hasta primer domingo de noviembre
  const year = date.getUTCFullYear();
  // Segundo domingo de marzo
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const secondSundayMarch = 1 + ((7 - marchFirst.getUTCDay()) % 7) + 7;
  const dstStart = new Date(Date.UTC(year, 2, secondSundayMarch, 7, 0)); // 2 AM EST = 7 AM UTC

  // Primer domingo de noviembre
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const firstSundayNov = 1 + ((7 - novFirst.getUTCDay()) % 7);
  const dstEnd = new Date(Date.UTC(year, 10, firstSundayNov, 6, 0)); // 2 AM EDT = 6 AM UTC

  return date >= dstStart && date < dstEnd;
}

/**
 * Determina si una fecha cae en horario de verano en Europa (Reino Unido / UE).
 */
export function isEuropeDst(date: Date = new Date()): boolean {
  // Europa: Último domingo de marzo hasta último domingo de octubre
  const year = date.getUTCFullYear();
  const marchLast = new Date(Date.UTC(year, 2, 31));
  const lastSundayMarch = 31 - marchLast.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, lastSundayMarch, 1, 0));

  const octLast = new Date(Date.UTC(year, 9, 31));
  const lastSundayOct = 31 - octLast.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 9, lastSundayOct, 1, 0));

  return date >= dstStart && date < dstEnd;
}

/**
 * Calcula todos los horarios de la Estrategia de la Caja.
 */
export function calculateBoxSchedule(params: {
  userTimezone: TimezoneMetadata;
  userDstActive: boolean;
  market: MarketItem;
  marketSeason: 'dst' | 'standard';
}): BoxCalculationResult {
  const { userTimezone, userDstActive, market, marketSeason } = params;

  // 1. Obtener el offset del usuario en minutos
  const effectiveUserOffset =
    userTimezone.observesDst && userDstActive && userTimezone.dstOffset
      ? userTimezone.dstOffset
      : userTimezone.standardOffset;

  const userOffsetMinutes = parseOffsetToMinutes(effectiveUserOffset);

  // 2. Obtener la hora de apertura del mercado en UTC (según temporada de mercado seleccionada)
  const marketSeasonSchedule =
    market.hasDst && marketSeason === 'dst'
      ? market.utcSchedule.dst
      : market.utcSchedule.standard;

  const marketOpenUtcMinutes = timeStringToMinutes(marketSeasonSchedule.open);

  // 3. Convertir la apertura del mercado a la hora local del usuario
  const marketOpenLocalMinutes = marketOpenUtcMinutes + userOffsetMinutes;

  // 4. Estrategia de la caja:
  // - Abre 1 hora (60 min) antes de la apertura oficial
  // - Cierra 30 minutos después de la apertura oficial
  const boxStartMinutes = marketOpenLocalMinutes - 60;
  const boxEndMinutes = marketOpenLocalMinutes + 30;

  const marketOpenLocal = formatMinutesToTime(marketOpenLocalMinutes);
  const boxStartLocal = formatMinutesToTime(boxStartMinutes);
  const boxEndLocal = formatMinutesToTime(boxEndMinutes);

  // Formato de offset amigable para TradingView (ej: 'UTC-4', 'UTC+1', 'UTC')
  const formatOffsetLabel = (mins: number) => {
    if (mins === 0) return 'UTC';
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m > 0 ? `UTC${sign}${h}:${m.toString().padStart(2, '0')}` : `UTC${sign}${h}`;
  };

  const userOffsetFormatted = formatOffsetLabel(userOffsetMinutes);

  // Calcular el offset aproximado del mercado
  const marketLocalOpenMinutes = timeStringToMinutes(market.localOpenTime);
  const marketOffsetCalc = marketLocalOpenMinutes - marketOpenUtcMinutes;
  // Normalizar offset del mercado en rango de -720 a +720
  const normalizedMarketOffset = ((((marketOffsetCalc + 720) % 1440) + 1440) % 1440) - 720;
  const marketOffsetFormatted = formatOffsetLabel(normalizedMarketOffset);

  const tradingViewInterval = `${boxStartLocal}-${boxEndLocal}`;
  const tradingViewFormatted = `${boxStartLocal} — ${boxEndLocal}`;

  // Verificar si hay cruce de día
  let dayShiftNotice: string | undefined;
  if (marketOpenLocalMinutes < 0) {
    dayShiftNotice = 'La apertura ocurre la noche del día anterior en tu hora local.';
  } else if (marketOpenLocalMinutes >= 1440) {
    dayShiftNotice = 'La apertura ocurre la madrugada del día siguiente en tu hora local.';
  }

  return {
    marketOpenUtc: marketSeasonSchedule.open,
    marketOpenLocal,
    marketOpenLocal12h: formatMinutesTo12h(marketOpenLocalMinutes),
    boxStartLocal,
    boxStartLocal12h: formatMinutesTo12h(boxStartMinutes),
    boxEndLocal,
    boxEndLocal12h: formatMinutesTo12h(boxEndMinutes),
    tradingViewInterval,
    tradingViewFormatted,
    dayShiftNotice,
    userOffsetFormatted,
    marketOffsetFormatted,
    boxDurationMinutes: 90,
  };
}

export type SessionProgressStatus =
  | 'BEFORE_BOX' // Aún no abre la caja (fuera de rango)
  | 'IN_BOX_PRE_OPEN' // Dentro de la caja (entre -60m y apertura)
  | 'IN_BOX_POST_OPEN' // Dentro de la caja (entre apertura y +30m)
  | 'AFTER_BOX'; // Pasó la caja de hoy (fuera de rango)

export interface RealTimeProgressInfo {
  status: SessionProgressStatus;
  statusLabel: string;
  statusColor: 'emerald' | 'cyan' | 'amber' | 'slate';
  isInsideBox: boolean;
  boxProgressPercent: number; // 0% a 100% dentro de los 90 minutos
  userNowMinutes: number;
  userNowTimeFormatted: string;
  countdownToOpenText: string;
  countdownToBoxStartText: string;
  countdownToBoxEndText: string;
  primaryCountdownLabel: string;
  primaryCountdownValue: string;
}

/**
 * Calcula el estado y progreso en tiempo real de la sesión y la caja.
 */
export function getSessionProgress(params: {
  boxCalculation: BoxCalculationResult;
  userOffsetMinutes: number;
  simulatedTimeMinutes?: number; // Para poder simular horas (ej: 08:00, 10:00, 12:00)
  currentDate?: Date;
}): RealTimeProgressInfo {
  const { boxCalculation, userOffsetMinutes, simulatedTimeMinutes } = params;
  const now = params.currentDate || new Date();

  // Calcular los minutos actuales en la hora local del usuario
  let nowLocalMinutes: number;
  let nowSeconds = 0;

  if (simulatedTimeMinutes !== undefined) {
    nowLocalMinutes = simulatedTimeMinutes;
    nowSeconds = 0;
  } else {
    // Tomar hora UTC exacta
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    nowSeconds = now.getUTCSeconds();
    const utcTotal = utcHours * 60 + utcMins + nowSeconds / 60;
    nowLocalMinutes = ((utcTotal + userOffsetMinutes) % 1440 + 1440) % 1440;
  }

  const boxStartMins = timeStringToMinutes(boxCalculation.boxStartLocal);
  const openMins = timeStringToMinutes(boxCalculation.marketOpenLocal);
  const boxEndMins = timeStringToMinutes(boxCalculation.boxEndLocal);

  // Minutos transcurridos desde el inicio exacto de la caja (0 a 1439)
  const diffFromBoxStart = (nowLocalMinutes - boxStartMins + 1440) % 1440;

  // La caja siempre dura exactamente 90 minutos (60m pre + 30m post)
  const isInside = diffFromBoxStart >= 0 && diffFromBoxStart <= 90;

  let status: SessionProgressStatus = 'BEFORE_BOX';
  let boxProgressPercent = 0;

  if (isInside) {
    // Progreso exacto de 0 a 100% dentro de los 90 minutos
    boxProgressPercent = Math.min(100, Math.max(0, (diffFromBoxStart / 90) * 100));

    // Si pasaron menos de 60 minutos, estamos en fase de pre-apertura
    if (diffFromBoxStart < 60) {
      status = 'IN_BOX_PRE_OPEN';
    } else {
      // Entre 60m y 90m estamos en fase de post-apertura (ruptura activa)
      status = 'IN_BOX_POST_OPEN';
    }
  } else {
    // Fuera de rango: determinar si es antes de la caja de hoy o después de que cerró
    const minsUntilStart = (boxStartMins - nowLocalMinutes + 1440) % 1440;
    if (minsUntilStart <= 720) {
      status = 'BEFORE_BOX';
    } else {
      status = 'AFTER_BOX';
    }
  }

  // Cálculos de cuenta regresiva en segundos
  const nowTotalSeconds = Math.floor(nowLocalMinutes * 60);

  const calcDiffSeconds = (targetMins: number) => {
    const targetSecs = targetMins * 60;
    const diff = (targetSecs - nowTotalSeconds + 86400) % 86400;
    return diff;
  };

  const formatCountdown = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const secsToOpen = calcDiffSeconds(openMins);
  const secsToBoxStart = calcDiffSeconds(boxStartMins);
  const secsToBoxEnd = calcDiffSeconds(boxEndMins);

  const countdownToOpenText = formatCountdown(secsToOpen);
  const countdownToBoxStartText = formatCountdown(secsToBoxStart);
  const countdownToBoxEndText = formatCountdown(secsToBoxEnd);

  let statusLabel = 'Fuera de rango';
  let statusColor: 'emerald' | 'cyan' | 'amber' | 'slate' = 'slate';
  let primaryCountdownLabel = 'Para la apertura del mercado:';
  let primaryCountdownValue = countdownToOpenText;

  if (status === 'IN_BOX_PRE_OPEN') {
    statusLabel = 'En rango: Fase 1 (Pre-apertura / Acumulación)';
    statusColor = 'cyan';
    primaryCountdownLabel = 'Apertura del mercado (Campana 0m) en:';
    primaryCountdownValue = countdownToOpenText;
  } else if (status === 'IN_BOX_POST_OPEN') {
    statusLabel = 'En rango: Fase 2 (Post-apertura / Ruptura activa)';
    statusColor = 'emerald';
    primaryCountdownLabel = 'Cierre de la caja en:';
    primaryCountdownValue = countdownToBoxEndText;
  } else if (status === 'BEFORE_BOX') {
    statusLabel = 'Fuera de rango (Esperando inicio de caja)';
    statusColor = 'amber';
    primaryCountdownLabel = 'Inicio de la caja en:';
    primaryCountdownValue = countdownToBoxStartText;
  } else {
    statusLabel = 'Fuera de rango (Caja del día finalizada)';
    statusColor = 'slate';
    primaryCountdownLabel = 'Próxima caja en:';
    primaryCountdownValue = countdownToBoxStartText;
  }

  const userNowHours = Math.floor(nowLocalMinutes / 60);
  const userNowMins = Math.floor(nowLocalMinutes % 60);
  const userNowTimeFormatted = `${userNowHours.toString().padStart(2, '0')}:${userNowMins.toString().padStart(2, '0')}:${Math.floor(nowSeconds).toString().padStart(2, '0')}`;

  return {
    status,
    statusLabel,
    statusColor,
    isInsideBox: isInside,
    boxProgressPercent,
    userNowMinutes: nowLocalMinutes,
    userNowTimeFormatted,
    countdownToOpenText,
    countdownToBoxStartText,
    countdownToBoxEndText,
    primaryCountdownLabel,
    primaryCountdownValue,
  };
}

