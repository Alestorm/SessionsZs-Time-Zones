/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Copy,
  Check,
  Globe,
  Sun,
  Moon,
  Info,
  ChevronDown,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  RotateCcw,
  Timer,
  AlertCircle,
  Radio,
  Filter,
  Settings2,
  Plus,
  Minus,
  Activity,
} from 'lucide-react';
import {
  TIMEZONE_REGISTRY,
  TimezoneKey,
  TimezoneMetadata,
  ALL_MARKETS,
  MarketItem,
  UtcOffset,
} from './data/timezones';
import {
  calculateBoxSchedule,
  getSessionProgress,
  parseOffsetToMinutes,
  formatMinutesToTime,
  timeStringToMinutes,
  isUsDst,
  isEuropeDst,
} from './utils/timeCalculations';

// Formateador para colocar el offset GMT al inicio de cada opción
function formatGmtPrefix(offset: UtcOffset): string {
  if (offset === 'Z') return '[GMT+0]';
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return `[GMT${offset}]`;
  const sign = match[1];
  const hours = parseInt(match[2], 10);
  const mins = match[3];
  return mins === '00' ? `[GMT${sign}${hours}]` : `[GMT${sign}${hours}:${mins}]`;
}

export default function App() {
  // Estado de selección principal del usuario
  const [selectedTimezoneKey, setSelectedTimezoneKey] =
    useState<TimezoneKey>('AMERICA_LA_PAZ'); // Por defecto Bolivia (GMT-4)
  const [userDstActive, setUserDstActive] = useState<boolean>(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('NYSE_NASDAQ');
  const [marketSeason, setMarketSeason] = useState<'dst' | 'standard'>('standard');
  const [copied, setCopied] = useState<boolean>(false);

  // Reloj en tiempo real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modo Simulación de Hora
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(600); // 10:00 AM inicial

  // Estado para la tabla de Resumen Multi-Mercado
  const [tableTimezoneMode, setTableTimezoneMode] = useState<'SYNC_USER' | 'CUSTOM'>('SYNC_USER');
  const [customTableTimezoneKey, setCustomTableTimezoneKey] = useState<TimezoneKey>('AMERICA_NEW_YORK');
  const [customTableDst, setCustomTableDst] = useState<boolean>(false);
  const [tableMarketCategory, setTableMarketCategory] = useState<'EXCHANGES' | 'FOREX' | 'ALL'>('EXCHANGES');
  const [tableManualHourOffset, setTableManualHourOffset] = useState<number>(0); // Horas manuales (+1h, -1h, etc.)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Zona horaria del usuario seleccionada
  const userTimezone: TimezoneMetadata =
    TIMEZONE_REGISTRY[selectedTimezoneKey] || TIMEZONE_REGISTRY.AMERICA_LA_PAZ;

  // Mercado seleccionado
  const selectedMarket: MarketItem = useMemo(() => {
    return (
      ALL_MARKETS.find((m) => m.id === selectedMarketId) ||
      ALL_MARKETS[0]
    );
  }, [selectedMarketId]);

  // Detección automática sugerida de temporada del mercado según la fecha actual
  useEffect(() => {
    if (!selectedMarket.hasDst) {
      setMarketSeason('standard');
      return;
    }
    // Si es New York / EE. UU.
    if (
      selectedMarket.localTimezone.includes('New_York') ||
      selectedMarket.localTimezone.includes('Chicago')
    ) {
      setMarketSeason(isUsDst(currentTime) ? 'dst' : 'standard');
    } else if (
      selectedMarket.localTimezone.includes('London') ||
      selectedMarket.localTimezone.includes('Berlin')
    ) {
      setMarketSeason(isEuropeDst(currentTime) ? 'dst' : 'standard');
    }
  }, [selectedMarketId, selectedMarket.hasDst, selectedMarket.localTimezone]);

  // Si la zona horaria del usuario cambia y no tiene DST, reiniciar toggle de DST
  useEffect(() => {
    if (!userTimezone.observesDst) {
      setUserDstActive(false);
    }
  }, [selectedTimezoneKey, userTimezone.observesDst]);

  // Offset efectivo del usuario en minutos
  const effectiveUserOffset =
    userTimezone.observesDst && userDstActive && userTimezone.dstOffset
      ? userTimezone.dstOffset
      : userTimezone.standardOffset;

  const userOffsetMinutes = useMemo(
    () => parseOffsetToMinutes(effectiveUserOffset),
    [effectiveUserOffset]
  );

  // Cálculo de los horarios de la caja para el mercado activo
  const boxCalculation = useMemo(() => {
    return calculateBoxSchedule({
      userTimezone,
      userDstActive,
      market: selectedMarket,
      marketSeason,
    });
  }, [userTimezone, userDstActive, selectedMarket, marketSeason]);

  // Minutos de apertura del mercado activo en la hora local del usuario
  const marketOpenMinutes = useMemo(() => {
    return timeStringToMinutes(boxCalculation.marketOpenLocal);
  }, [boxCalculation.marketOpenLocal]);

  // Presets dinámicos del simulador de horas adaptados AL MERCADO Y ZONA SELECCIONADOS
  const dynamicPresets = useMemo(() => {
    // 1. 1h 30m antes de la apertura (Fuera de rango)
    const tBefore = (marketOpenMinutes - 90 + 1440) % 1440;
    // 2. 30m antes de la apertura (En rango · Pre-apertura)
    const tPreOpen = (marketOpenMinutes - 30 + 1440) % 1440;
    // 3. Campana de apertura oficial (0m)
    const tOpen = marketOpenMinutes;
    // 4. 15m después de la apertura (En rango · Post-apertura)
    const tPostOpen = (marketOpenMinutes + 15 + 1440) % 1440;
    // 5. 1h 30m después de la apertura (Fuera de rango · Caja cerrada)
    const tAfter = (marketOpenMinutes + 90 + 1440) % 1440;

    return [
      {
        minutes: tBefore,
        timeFormatted: formatMinutesToTime(tBefore),
        categoryTag: 'PRE-CAJA',
        shortLabel: '-1h 30m',
        statusType: 'Fuera de rango',
        colorTheme: 'amber',
      },
      {
        minutes: tPreOpen,
        timeFormatted: formatMinutesToTime(tPreOpen),
        categoryTag: 'PRE-MERCADO',
        shortLabel: '-30m',
        statusType: 'En rango (Fase 1)',
        colorTheme: 'cyan',
      },
      {
        minutes: tOpen,
        timeFormatted: formatMinutesToTime(tOpen),
        categoryTag: 'CAMPANA 0m',
        shortLabel: 'Apertura',
        statusType: 'Campana Oficial',
        colorTheme: 'emerald',
      },
      {
        minutes: tPostOpen,
        timeFormatted: formatMinutesToTime(tPostOpen),
        categoryTag: 'POST-APERTURA',
        shortLabel: '+15m',
        statusType: 'En rango (Fase 2)',
        colorTheme: 'indigo',
      },
      {
        minutes: tAfter,
        timeFormatted: formatMinutesToTime(tAfter),
        categoryTag: 'POST-CAJA',
        shortLabel: '+1h 30m',
        statusType: 'Fuera de rango',
        colorTheme: 'slate',
      },
    ];
  }, [marketOpenMinutes]);

  // Si cambiamos de mercado o zona horaria mientras estamos en simulación,
  // podemos mantener la hora elegida o adaptarla
  const sessionProgress = useMemo(() => {
    return getSessionProgress({
      boxCalculation,
      userOffsetMinutes,
      simulatedTimeMinutes: isSimulationMode ? simulatedMinutes : undefined,
      currentDate: currentTime,
    });
  }, [
    boxCalculation,
    userOffsetMinutes,
    isSimulationMode,
    simulatedMinutes,
    currentTime,
  ]);

  // Manejador para copiar el intervalo de TradingView
  const handleCopyInterval = async (customFormat?: string) => {
    const textToCopy = customFormat || boxCalculation.tradingViewInterval;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Formato de hora UTC en vivo
  const utcFormatted = useMemo(() => {
    const h = currentTime.getUTCHours().toString().padStart(2, '0');
    const m = currentTime.getUTCMinutes().toString().padStart(2, '0');
    const s = currentTime.getUTCSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [currentTime]);

  // Hora local en vivo o simulada
  const userLocalLiveTime = useMemo(() => {
    if (isSimulationMode) {
      return `${formatMinutesToTime(simulatedMinutes)} (Simulada)`;
    }
    const utcHours = currentTime.getUTCHours();
    const utcMins = currentTime.getUTCMinutes();
    const utcSecs = currentTime.getUTCSeconds();
    const utcTotalMinutes = utcHours * 60 + utcMins + utcSecs / 60;
    const localTotalMinutes = ((utcTotalMinutes + userOffsetMinutes) % 1440 + 1440) % 1440;
    const lh = Math.floor(localTotalMinutes / 60);
    const lm = Math.floor(localTotalMinutes % 60);
    return `${lh.toString().padStart(2, '0')}:${lm.toString().padStart(2, '0')}:${utcSecs.toString().padStart(2, '0')}`;
  }, [currentTime, userOffsetMinutes, isSimulationMode, simulatedMinutes]);

  // Horas de diferencia respecto a UTC
  const utcDiffText = useMemo(() => {
    if (userOffsetMinutes === 0) return '0 horas';
    const sign = userOffsetMinutes > 0 ? '+' : '-';
    const abs = Math.abs(userOffsetMinutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (m === 0) {
      return `${sign}${h} horas`;
    }
    return `${sign}${h}:${m.toString().padStart(2, '0')} horas`;
  }, [userOffsetMinutes]);

  // Formato de fecha actual
  const dateFormatted = useMemo(() => {
    return currentTime.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [currentTime]);

  // Mapa de aperturas de todos los mercados convertidas a la hora local del usuario
  const marketOpenInUserTimeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of ALL_MARKETS) {
      const calc = calculateBoxSchedule({
        userTimezone,
        userDstActive,
        market: m,
        marketSeason: m.hasDst ? marketSeason : 'standard',
      });
      map[m.id] = calc.marketOpenLocal;
    }
    return map;
  }, [userTimezone, userDstActive, marketSeason]);

  // ─── CÁLCULOS DINÁMICOS PARA LA TABLA MULTI-MERCADO ───
  // Zona horaria que rige la tabla: sincronizada con la del usuario o manual personalizada
  const effectiveTableTimezone = useMemo(() => {
    if (tableTimezoneMode === 'SYNC_USER') {
      return userTimezone;
    }
    return TIMEZONE_REGISTRY[customTableTimezoneKey] || userTimezone;
  }, [tableTimezoneMode, userTimezone, customTableTimezoneKey]);

  const effectiveTableDst = useMemo(() => {
    if (tableTimezoneMode === 'SYNC_USER') {
      return userDstActive;
    }
    return customTableDst;
  }, [tableTimezoneMode, userDstActive, customTableDst]);

  const effectiveTableOffsetStr = useMemo(() => {
    return effectiveTableTimezone.observesDst && effectiveTableDst && effectiveTableTimezone.dstOffset
      ? effectiveTableTimezone.dstOffset
      : effectiveTableTimezone.standardOffset;
  }, [effectiveTableTimezone, effectiveTableDst]);

  const effectiveTableOffsetMinutes = useMemo(() => {
    return parseOffsetToMinutes(effectiveTableOffsetStr);
  }, [effectiveTableOffsetStr]);

  // Lista de mercados evaluados dinámicamente para la tabla Multi-Mercado
  const multiMarketRows = useMemo(() => {
    const filteredMarkets = ALL_MARKETS.filter((m) => {
      if (tableMarketCategory === 'EXCHANGES') return m.category === 'EXCHANGE';
      if (tableMarketCategory === 'FOREX') return m.category === 'FOREX';
      return true;
    });

    // Minutos actuales en la zona de la tabla (con posible desplazamiento manual)
    const tableCurrentMinutes = isSimulationMode
      ? simulatedMinutes
      : (() => {
          const utcTotal = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes() + currentTime.getUTCSeconds() / 60;
          return ((utcTotal + effectiveTableOffsetMinutes + tableManualHourOffset * 60) % 1440 + 1440) % 1440;
        })();

    return filteredMarkets.map((market) => {
      // Cálculo del horario de la caja en la zona de la tabla
      const calc = calculateBoxSchedule({
        userTimezone: effectiveTableTimezone,
        userDstActive: effectiveTableDst,
        market,
        marketSeason: market.hasDst ? marketSeason : 'standard',
      });

      // Progreso en tiempo real para esta bolsa en particular
      const progress = getSessionProgress({
        boxCalculation: calc,
        userOffsetMinutes: effectiveTableOffsetMinutes,
        simulatedTimeMinutes: tableCurrentMinutes,
        currentDate: currentTime,
      });

      return {
        market,
        calc,
        progress,
      };
    });
  }, [
    tableMarketCategory,
    effectiveTableTimezone,
    effectiveTableDst,
    marketSeason,
    isSimulationMode,
    simulatedMinutes,
    currentTime,
    effectiveTableOffsetMinutes,
    tableManualHourOffset,
  ]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─── Top Navigation Bar (Exchange Style) ─── */}
      <header className="border-b border-slate-800/80 bg-[#0c121e]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Sessions ZS
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 font-semibold tracking-wider">
                  ORB 90m
                </span>
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">
                TradingView Session Box Time Offset Calculator
              </p>
            </div>
          </div>

          {/* Center / Right Clocks (UTC Live + Selected Local Time + UTC Difference Badge) */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs flex-wrap justify-end">
            {/* Box 1: UTC Live */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 hidden sm:inline">UTC Live:</span>
              <span className="font-mono-numbers font-medium text-slate-200">
                {utcFormatted} UTC
              </span>
            </div>

            {/* Box 2: Hora Local Seleccionada (GMT-X) */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-800/60 shadow-sm shadow-cyan-950/30 shrink-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  isSimulationMode ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'
                }`}
              />
              <span className="text-slate-400 hidden sm:inline">
                Hora Local ({formatGmtPrefix(effectiveUserOffset)}):
              </span>
              <span className="text-slate-400 sm:hidden">
                {formatGmtPrefix(effectiveUserOffset)}:
              </span>
              <span className="font-mono-numbers font-bold text-cyan-300">
                {userLocalLiveTime}
              </span>
            </div>

            {/* Calendario */}
            <div className="hidden xl:flex items-center gap-1.5 text-slate-400 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateFormatted}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas ─── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Intro Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-slate-800/80">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Estrategia de la Caja — TradingView</span>
            </h1>
            <p className="text-xs text-slate-400">
              Ventana de <span className="text-cyan-400 font-medium">1 hora antes de la apertura (-60m)</span> hasta <span className="text-cyan-400 font-medium">30 minutos después (+30m)</span> ajustada automáticamente a tu horario local y DST.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg shrink-0">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Duración estándar: <strong className="text-slate-200 font-mono-numbers">90 minutos</strong></span>
          </div>
        </div>

        {/* ─── Grid: Control Panel (Left) & TradingView Live Output (Right) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Configuration Controls (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Box 1: Zona Horaria del Usuario */}
            <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800/80 shadow-lg shadow-black/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <label htmlFor="user-timezone-select" className="text-sm font-semibold text-white">
                    1. Tu Zona Horaria Local
                  </label>
                </div>
                <span className="text-xs font-mono-numbers px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold">
                  {formatGmtPrefix(effectiveUserOffset)}
                </span>
              </div>

              {/* Selector de zona con [GMT-X] al principio */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400">Selecciona tu huso horario (ordenado con prefijo GMT):</span>
                <div className="relative">
                  <select
                    id="user-timezone-select"
                    value={selectedTimezoneKey}
                    onChange={(e) => setSelectedTimezoneKey(e.target.value as TimezoneKey)}
                    className="w-full appearance-none bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 rounded-lg px-3.5 py-3 text-sm text-slate-200 font-medium transition-colors cursor-pointer outline-none pr-10 font-mono-numbers"
                  >
                    {Object.values(TIMEZONE_REGISTRY).map((tz) => {
                      const gmtPrefix = formatGmtPrefix(tz.standardOffset);
                      const countryNames = tz.representativeCountries.map((c) => c.name).join(', ');
                      return (
                        <option
                          key={tz.id}
                          value={tz.id}
                          className="bg-slate-900 text-slate-200 py-1 font-mono-numbers"
                        >
                          {gmtPrefix} {tz.name} — {countryNames}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-4 pointer-events-none" />
                </div>
              </div>

              {/* Información de países representativos */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-1">
                <span className="text-slate-500 font-medium">Países representativos:</span>
                {userTimezone.representativeCountries.map((country) => (
                  <span
                    key={country.code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-300"
                  >
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                ))}
              </div>

              {/* Toggle de Horario de Verano (DST) para el usuario */}
              <div className="pt-2">
                {userTimezone.observesDst ? (
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        {userDstActive ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                        <span>¿Tu país está actualmente en Horario de Verano (DST)?</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Offset activo: <span className="font-mono-numbers text-cyan-400 font-bold">{formatGmtPrefix(effectiveUserOffset)}</span> ({userDstActive ? userTimezone.dstOffset : userTimezone.standardOffset})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUserDstActive(!userDstActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        userDstActive ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                      aria-label="Alternar Horario de Verano para el usuario"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          userDstActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Tu zona no aplica horario de verano. Tu desfase permanece fijo en <strong className="text-slate-300 font-mono-numbers">{formatGmtPrefix(userTimezone.standardOffset)} ({userTimezone.standardOffset})</strong> todo el año.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Selección de Mercado / Bolsa */}
            <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800/80 shadow-lg shadow-black/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <label htmlFor="market-select" className="text-sm font-semibold text-white">
                    2. Mercado Objetivo / Sesión
                  </label>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300 font-mono-numbers">
                    Abre a las <strong className="text-cyan-300 font-bold">{boxCalculation.marketOpenLocal}</strong> en tu zona
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono-numbers">
                    ({selectedMarket.localOpenTime} hora de {selectedMarket.tradingViewLabel})
                  </span>
                </div>
              </div>

              {/* Botones de Selección Rápida de Mercados Populares */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-medium">Bolsas Principales:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_MARKETS.filter((m) => m.category === 'EXCHANGE').map((market) => {
                    const isSelected = market.id === selectedMarketId;
                    const userOpen = marketOpenInUserTimeMap[market.id] || market.localOpenTime;
                    return (
                      <button
                        key={market.id}
                        type="button"
                        onClick={() => setSelectedMarketId(market.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-950'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <span className="text-base leading-none">{market.countryFlag}</span>
                        <div className="truncate">
                          <p className="font-semibold truncate">{market.tradingViewLabel}</p>
                          <p className="text-[11px] text-cyan-300 font-bold font-mono-numbers">
                            {userOpen} <span className="text-[10px] text-slate-400 font-normal">tu zona</span>
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono-numbers">
                            {market.localOpenTime} en {market.tradingViewLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sesiones Forex secundarias */}
              <div className="pt-2">
                <label htmlFor="market-select" className="text-xs text-slate-400 font-medium block mb-1.5">
                  Todas las sesiones y mercados (incluyendo Forex):
                </label>
                <div className="relative">
                  <select
                    id="market-select"
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(e.target.value)}
                    className="w-full appearance-none bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 font-medium transition-colors cursor-pointer outline-none pr-10 font-mono-numbers"
                  >
                    <optgroup label="Bolsas de Acciones / Índices">
                      {ALL_MARKETS.filter((m) => m.category === 'EXCHANGE').map((m) => {
                        const userOpen = marketOpenInUserTimeMap[m.id] || m.localOpenTime;
                        return (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                            {m.countryFlag} {m.name} ({m.tradingViewLabel}) — Abre {userOpen} en tu zona ({m.localOpenTime} en {m.tradingViewLabel})
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Sesiones Forex (Mercado de Divisas)">
                      {ALL_MARKETS.filter((m) => m.category === 'FOREX').map((m) => {
                        const userOpen = marketOpenInUserTimeMap[m.id] || m.localOpenTime;
                        return (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                            {m.countryFlag} {m.name} — Abre {userOpen} en tu zona ({m.localOpenTime} hora local)
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Selector de Horario de Verano del Mercado */}
              <div className="pt-2">
                {selectedMarket.hasDst ? (
                  <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        Temporada en {selectedMarket.tradingViewLabel}:
                      </span>
                      <span className="text-[11px] text-cyan-400 font-mono-numbers">
                        {marketSeason === 'dst'
                          ? `Apertura UTC: ${selectedMarket.utcSchedule.dst.open} (Verano)`
                          : `Apertura UTC: ${selectedMarket.utcSchedule.standard.open} (Estándar)`}
                      </span>
                    </div>

                    {/* Segmented Control */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800/90">
                      <button
                        type="button"
                        onClick={() => setMarketSeason('dst')}
                        className={`py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          marketSeason === 'dst'
                            ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Horario de Verano (DST)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMarketSeason('standard')}
                        className={`py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          marketSeason === 'standard'
                            ? 'bg-slate-700 text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Horario Estándar (Invierno)</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {selectedMarket.id === 'NYSE_NASDAQ'
                        ? marketSeason === 'dst'
                          ? 'Nueva York está en EDT (UTC-4 / GMT-4). Abre a las 13:30 UTC.'
                          : 'Nueva York está en EST (UTC-5 / GMT-5). Abre a las 14:30 UTC.'
                        : selectedMarket.id === 'LSE'
                        ? marketSeason === 'dst'
                          ? 'Londres está en BST (UTC+1 / GMT+1). Abre a las 07:00 UTC.'
                          : 'Londres está en GMT (UTC+0 / GMT+0). Abre a las 08:00 UTC.'
                        : 'El mercado ajusta su desfase estacional según su huso horario.'}
                    </p>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Este mercado ({selectedMarket.tradingViewLabel}) tiene horario fijo y no observa cambios de verano/invierno.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: TradingView Replica Card & Exact Box Result (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* TRADINGVIEW INPUT CARD REPLICA (Matches user screenshot) */}
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c111c] border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-cyan-500 flex items-center justify-center text-[8px] font-bold text-black">
                    TV
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Configuración para TradingView
                  </h2>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Valores del Indicador
                </span>
              </div>

              {/* Cajas informativas con los parámetros exactos a ingresar en TradingView */}
              <div className="space-y-3">
                
                {/* Caja Informativa 1: Zona Horaria */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        Zona Horaria
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Parámetro de huso en el indicador
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs font-mono-numbers text-cyan-300 font-bold tracking-wide shadow-inner flex items-center gap-1.5">
                    <span>{boxCalculation.userOffsetFormatted}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({formatGmtPrefix(effectiveUserOffset)})</span>
                  </div>
                </div>

                {/* Caja Informativa 2: Etiqueta de la Sesión */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        Etiqueta de la Sesión
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Nombre de la sesión para el script
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs font-semibold text-white flex items-center gap-2 shadow-inner">
                    <span className="text-sm">{selectedMarket.countryFlag}</span>
                    <span className="text-cyan-300 font-bold font-mono-numbers">{selectedMarket.tradingViewLabel}</span>
                  </div>
                </div>

                {/* Caja Informativa 3: Intervalo Manual / Ajuste Desfase */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">
                          Intervalo Manual / Ajuste Desfase
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Valores exactos de apertura y cierre de caja
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono-numbers px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                      90 min (-60m / +30m)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {/* Start Time Box */}
                    <div className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-cyan-500/50 rounded-lg flex items-center justify-between shadow-inner">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Abre Caja</span>
                        <span className="text-base font-bold text-white font-mono-numbers tracking-wider">
                          {boxCalculation.boxStartLocal}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    </div>

                    <span className="text-slate-500 font-bold text-base">—</span>

                    {/* End Time Box */}
                    <div className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-cyan-500/50 rounded-lg flex items-center justify-between shadow-inner">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Cierra Caja</span>
                        <span className="text-base font-bold text-white font-mono-numbers tracking-wider">
                          {boxCalculation.boxEndLocal}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Botón Principal de Copiar al Portapapeles */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleCopyInterval()}
                  className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.99] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>¡Copiado: {boxCalculation.tradingViewInterval}!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Intervalo: {boxCalculation.tradingViewInterval}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Formato con guion largo:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyInterval(boxCalculation.tradingViewFormatted)}
                    className="text-cyan-400 hover:underline cursor-pointer font-mono-numbers"
                  >
                    Copiar "{boxCalculation.tradingViewFormatted}"
                  </button>
                </div>
              </div>

              {/* Aviso si cruza medianoche */}
              {boxCalculation.dayShiftNotice && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{boxCalculation.dayShiftNotice}</span>
                </div>
              )}
            </div>

            {/* Breakdown Visual: Detalles de la Estrategia */}
            <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Desglose en tu Hora Local ({userTimezone.representativeCountries[0]?.name || userTimezone.name})
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Inicio Caja (-1h)</span>
                  <span className="text-sm font-bold font-mono-numbers text-cyan-300 block">
                    {boxCalculation.boxStartLocal}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono-numbers">
                    {boxCalculation.boxStartLocal12h}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 space-y-1">
                  <span className="text-[10px] text-cyan-300 font-semibold block">Apertura (Open)</span>
                  <span className="text-sm font-bold font-mono-numbers text-white block">
                    {boxCalculation.marketOpenLocal}
                  </span>
                  <span className="text-[10px] text-cyan-400/80 block font-mono-numbers">
                    {boxCalculation.marketOpenLocal12h}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Cierre Caja (+30m)</span>
                  <span className="text-sm font-bold font-mono-numbers text-cyan-300 block">
                    {boxCalculation.boxEndLocal}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono-numbers">
                    {boxCalculation.boxEndLocal12h}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ─── REAL-TIME TIMELINE & DYNAMIC PROGRESS MONITOR ─── */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0d1322] border border-slate-800/80 space-y-6">
          
          {/* Header of Timeline with Live Status & Evaluated Clock */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Monitor de Sesión & Timeline (90 min)
                </h2>
                {isSimulationMode ? (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    SIMULACIÓN ACTIVA
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TIEMPO REAL EN VIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo en vivo de la ventana de acumulación y apertura para <strong className="text-slate-200">{selectedMarket.tradingViewLabel}</strong>
              </p>
            </div>

            {/* Evaluated Time Badge & Reset Button */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 shadow-sm">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 leading-none">Hora evaluada ({formatGmtPrefix(effectiveUserOffset)}):</span>
                  <span className="font-mono-numbers font-bold text-cyan-300 text-sm leading-tight mt-0.5">
                    {sessionProgress.userNowTimeFormatted}
                  </span>
                </div>
              </div>
              {isSimulationMode && (
                <button
                  type="button"
                  onClick={() => setIsSimulationMode(false)}
                  title="Restablecer a la hora real en vivo"
                  className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-cyan-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">En Vivo</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Balanced Metric Cards: Estado, Campana de Apertura, Contador de la Caja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Estado de la Sesión */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                sessionProgress.status === 'IN_BOX_PRE_OPEN'
                  ? 'bg-cyan-950/25 border-cyan-500/40 text-cyan-100'
                  : sessionProgress.status === 'IN_BOX_POST_OPEN'
                  ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-100'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Estado de la Sesión
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    sessionProgress.isInsideBox
                      ? sessionProgress.status === 'IN_BOX_PRE_OPEN'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {sessionProgress.isInsideBox ? '🟢 DENTRO DE LA CAJA' : '⏸️ FUERA DE RANGO'}
                </span>
              </div>
              <div className="my-2.5">
                <p className="text-sm font-semibold text-white leading-snug">
                  {sessionProgress.statusLabel}
                </p>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>Ventana: <strong className="text-slate-200 font-mono-numbers">{boxCalculation.boxStartLocal} — {boxCalculation.boxEndLocal}</strong></span>
                {sessionProgress.isInsideBox && (
                  <span className="text-cyan-300 font-mono-numbers font-medium">
                    {Math.round(sessionProgress.boxProgressPercent)}% completado
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Cuenta Regresiva a la Campana de Apertura Oficial (0m) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Campana Oficial (0m)
                </span>
                <span className="text-[11px] font-mono-numbers text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900">
                  {boxCalculation.marketOpenLocal}
                </span>
              </div>
              <div className="my-2">
                <span className="text-[11px] text-slate-400 block mb-0.5">Tiempo para apertura oficial:</span>
                <span className="text-2xl font-bold font-mono-numbers text-white tracking-tight">
                  {sessionProgress.countdownToOpenText}
                </span>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>Bolsa: <strong className="text-slate-300">{selectedMarket.tradingViewLabel}</strong></span>
                <span className="text-[11px] text-slate-500 font-mono-numbers">
                  {selectedMarket.localOpenTime} local
                </span>
              </div>
            </div>

            {/* Card 3: Cuenta Regresiva de la Caja (Inicio o Cierre) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Contador de la Caja (90m)
                </span>
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="my-2">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {sessionProgress.primaryCountdownLabel}
                </span>
                <span className="text-2xl font-bold font-mono-numbers text-cyan-300 tracking-tight">
                  {sessionProgress.primaryCountdownValue}
                </span>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>Duración: <strong className="text-slate-300">90 min</strong></span>
                <span className="text-[11px] text-slate-500">
                  60m pre + 30m post
                </span>
              </div>
            </div>
          </div>

          {/* Visual Timeline Bar Container */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3.5">
            {/* Timeline Subheader & Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-300 font-medium">
                Intervalo Total: <strong className="text-white font-mono-numbers">{boxCalculation.boxStartLocal}</strong> a <strong className="text-white font-mono-numbers">{boxCalculation.boxEndLocal}</strong> <span className="text-slate-500">(90 minutos)</span>
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
                  <span>Fase 1: Pre-mercado (60m)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                  <span>Fase 2: Post-apertura (30m)</span>
                </span>
              </div>
            </div>

            {/* The Timeline Track Bar */}
            <div className="relative pt-6 pb-1">
              {/* Dynamic Needle if Inside Box */}
              {sessionProgress.isInsideBox && (
                <div
                  className="absolute top-0 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none transition-all duration-300 ease-linear"
                  style={{ left: `${sessionProgress.boxProgressPercent}%` }}
                >
                  <span className="text-[10px] font-mono-numbers font-bold bg-cyan-400 text-slate-950 px-2 py-0.5 rounded shadow-lg shadow-cyan-500/50 whitespace-nowrap">
                    📍 Ahora: {sessionProgress.userNowTimeFormatted.slice(0, 5)}
                  </span>
                  <div className="w-0.5 h-2.5 bg-cyan-400" />
                </div>
              )}

              {/* Main Track Bar */}
              <div className="h-12 w-full bg-slate-900 rounded-xl p-1 flex items-stretch border border-slate-800 relative overflow-hidden shadow-inner">
                {/* Glow fill if inside */}
                {sessionProgress.isInsideBox && (
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-cyan-400/20 border-r-2 border-cyan-400 z-10 transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                    style={{ width: `${sessionProgress.boxProgressPercent}%` }}
                  />
                )}

                {/* 60m Pre-market (66.6%) */}
                <div className="w-2/3 bg-gradient-to-r from-cyan-600/40 via-cyan-500/50 to-cyan-400/60 rounded-l-lg flex items-center justify-between px-3.5 text-xs font-semibold text-cyan-100 border-r border-white/25 relative">
                  <span className="font-mono-numbers font-bold text-sm tracking-wide">
                    {boxCalculation.boxStartLocal}
                  </span>
                  <span className="text-[11px] opacity-80 hidden sm:inline">60 min antes</span>
                </div>

                {/* 30m Post-open (33.3%) */}
                <div className="w-1/3 bg-gradient-to-r from-indigo-500/50 to-indigo-600/40 rounded-r-lg flex items-center justify-between px-3.5 text-xs font-semibold text-indigo-100 relative">
                  <span className="text-[11px] opacity-80 hidden sm:inline">30 min después</span>
                  <span className="font-mono-numbers font-bold text-sm tracking-wide ml-auto">
                    {boxCalculation.boxEndLocal}
                  </span>
                </div>

                {/* Center Bell Marker Line (at 66.6%) */}
                <div className="absolute left-2/3 -top-1 -bottom-1 w-0.5 bg-white shadow-lg shadow-white/80 z-10 flex flex-col items-center justify-between pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-white -mt-0.5" />
                  <div className="w-2 h-2 rounded-full bg-white -mb-0.5" />
                </div>
              </div>

              {/* Milestone labels aligned beneath the bar */}
              <div className="flex items-center justify-between text-xs font-mono-numbers text-slate-400 px-1 pt-2.5">
                <div>
                  <span className="text-slate-500 block text-[10px]">Abre Caja (-60m)</span>
                  <span className="text-slate-200 font-bold">{boxCalculation.boxStartLocal}</span>
                </div>
                <div className="text-center">
                  <span className="text-cyan-400 block text-[10px] font-semibold">Campana de Apertura (0m)</span>
                  <span className="text-white font-bold px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                    {boxCalculation.marketOpenLocal}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Cierra Caja (+30m)</span>
                  <span className="text-slate-200 font-bold">{boxCalculation.boxEndLocal}</span>
                </div>
              </div>
            </div>

            {/* Clean contextual indicator if currently outside box */}
            {!sessionProgress.isInsideBox && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {sessionProgress.status === 'BEFORE_BOX'
                      ? `Hora evaluada (${sessionProgress.userNowTimeFormatted.slice(0, 5)}): Previa a la caja. Inicia a las ${boxCalculation.boxStartLocal}.`
                      : `Hora evaluada (${sessionProgress.userNowTimeFormatted.slice(0, 5)}): Posterior al cierre (${boxCalculation.boxEndLocal}). Caja completada.`}
                  </span>
                </div>
                <span className="text-cyan-400 font-mono-numbers font-medium shrink-0">
                  {sessionProgress.primaryCountdownLabel} {sessionProgress.primaryCountdownValue}
                </span>
              </div>
            )}
          </div>

          {/* Integrated Simulator Cockpit */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-4">
            {/* Simulator Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-850">
              <div className="flex items-center gap-2 flex-wrap">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulador de Horas y Pruebas
                </h3>
                <span className="text-[11px] text-slate-400">
                  (Momentos clave adaptados a {selectedMarket.tradingViewLabel})
                </span>
              </div>
              {isSimulationMode ? (
                <button
                  type="button"
                  onClick={() => setIsSimulationMode(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-medium self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer a Hora Real en Vivo</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Haz clic en cualquier momento para validar el comportamiento
                </span>
              )}
            </div>

            {/* Presets Grid: 6 clean, uniform cards */}
            <div>
              <span className="text-[11px] text-slate-400 font-medium block mb-2">
                Accesos rápidos calculados para tu zona:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {/* Preset 0: Live Real-time */}
                <button
                  type="button"
                  onClick={() => setIsSimulationMode(false)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    !isSimulationMode
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-sm shadow-emerald-950/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Ahora</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-sm font-bold font-mono-numbers text-white my-0.5">
                    En Vivo
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium truncate">
                    Hora Real
                  </span>
                </button>

                {/* 5 Dynamic Session Presets */}
                {dynamicPresets.map((preset, idx) => {
                  const isSelected = isSimulationMode && simulatedMinutes === preset.minutes;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsSimulationMode(true);
                        setSimulatedMinutes(preset.minutes);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? preset.colorTheme === 'cyan'
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-sm shadow-cyan-950 text-white'
                            : preset.colorTheme === 'emerald'
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-sm shadow-emerald-950 text-white'
                            : preset.colorTheme === 'indigo'
                            ? 'bg-indigo-950/60 border-indigo-400 shadow-sm shadow-indigo-950 text-white'
                            : 'bg-amber-950/60 border-amber-400 shadow-sm shadow-amber-950 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase truncate">
                          {preset.categoryTag}
                        </span>
                        <span className="text-[9px] font-mono-numbers text-slate-500">
                          {preset.shortLabel}
                        </span>
                      </div>
                      <span className="text-sm font-bold font-mono-numbers text-cyan-300 my-0.5">
                        {preset.timeFormatted}
                      </span>
                      <span className={`text-[10px] font-medium truncate ${
                        isSelected ? 'text-white' : 'text-slate-400'
                      }`}>
                        {preset.statusType}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Time Input & Slider for ANY custom hour */}
            <div className="pt-3 border-t border-slate-850 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5 flex items-center gap-2">
                <label htmlFor="custom-sim-time" className="text-xs text-slate-400 shrink-0 font-medium">
                  Hora manual:
                </label>
                <input
                  id="custom-sim-time"
                  type="time"
                  value={formatMinutesToTime(simulatedMinutes)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setIsSimulationMode(true);
                      setSimulatedMinutes(timeStringToMinutes(e.target.value));
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono-numbers text-cyan-300 font-bold outline-none focus:border-cyan-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Restar 15 minutos"
                    onClick={() => {
                      setIsSimulationMode(true);
                      setSimulatedMinutes((prev) => (prev - 15 + 1440) % 1440);
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Sumar 15 minutos"
                    onClick={() => {
                      setIsSimulationMode(true);
                      setSimulatedMinutes((prev) => (prev + 15 + 1440) % 1440);
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="md:col-span-7 flex items-center gap-3">
                <span className="text-[11px] text-slate-500 font-mono-numbers shrink-0">00:00</span>
                <input
                  type="range"
                  min="0"
                  max="1439"
                  step="5"
                  value={simulatedMinutes}
                  onChange={(e) => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[11px] text-slate-500 font-mono-numbers shrink-0">23:59</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── RESUMEN MULTI-MERCADO DINÁMICO & CONMUTADOR MANUAL ─── */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0d1322] border border-slate-800/80 space-y-4">
          
          {/* Header of Multi-Market Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Resumen Multi-Mercado</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                  {formatGmtPrefix(effectiveTableOffsetStr)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {tableTimezoneMode === 'SYNC_USER'
                  ? `Sincronizado dinámicamente con tu zona (${userTimezone.name})`
                  : `Visualizando zona personalizada: ${effectiveTableTimezone.name}`}
              </p>
            </div>

            {/* Filter by Category: Bolsas vs Forex vs Todos */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTableMarketCategory('EXCHANGES')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  tableMarketCategory === 'EXCHANGES'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bolsas (6)
              </button>
              <button
                type="button"
                onClick={() => setTableMarketCategory('FOREX')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  tableMarketCategory === 'FOREX'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Forex (4)
              </button>
              <button
                type="button"
                onClick={() => setTableMarketCategory('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  tableMarketCategory === 'ALL'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos (10)
              </button>
            </div>
          </div>

          {/* Controls: Mode Switcher (Sincronizado vs Cambiar Manualmente a Otra Zona) */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300">Modo de visualización de la tabla:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Option 1: Sincronizado */}
              <button
                type="button"
                onClick={() => setTableTimezoneMode('SYNC_USER')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  tableTimezoneMode === 'SYNC_USER'
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Sincronizado con mi zona ({formatGmtPrefix(effectiveUserOffset)})
              </button>

              {/* Option 2: Cambiar manualmente a otra zona */}
              <button
                type="button"
                onClick={() => setTableTimezoneMode('CUSTOM')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  tableTimezoneMode === 'CUSTOM'
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Elegir otra zona manualmente
              </button>
            </div>
          </div>

          {/* Dropdown if CUSTOM timezone is active */}
          {tableTimezoneMode === 'CUSTOM' && (
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-cyan-800/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Selecciona la zona horaria manual para inspeccionar la tabla:
                </span>
                {effectiveTableTimezone.observesDst && (
                  <button
                    type="button"
                    onClick={() => setCustomTableDst(!customTableDst)}
                    className="text-xs text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>DST para esta tabla: {customTableDst ? 'Activado' : 'Desactivado'}</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={customTableTimezoneKey}
                  onChange={(e) => setCustomTableTimezoneKey(e.target.value as TimezoneKey)}
                  className="w-full appearance-none bg-slate-950 border border-cyan-500/60 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 font-mono-numbers font-medium transition-colors cursor-pointer outline-none pr-10"
                >
                  {Object.values(TIMEZONE_REGISTRY).map((tz) => (
                    <option key={tz.id} value={tz.id} className="bg-slate-900 text-slate-200">
                      {formatGmtPrefix(tz.standardOffset)} {tz.name} ({tz.representativeCountries.map((c) => c.name).join(', ')})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Table displaying markets */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Mercado / Bolsa</th>
                  <th className="py-2.5 px-3">Hora en Origen (Bolsa)</th>
                  <th className="py-2.5 px-3">
                    Apertura en la Zona ({formatGmtPrefix(effectiveTableOffsetStr)})
                  </th>
                  <th className="py-2.5 px-3">Intervalo de la Caja (ORB)</th>
                  <th className="py-2.5 px-3">Estado Actual</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                {multiMarketRows.map(({ market, calc, progress }) => {
                  const isCurrent = market.id === selectedMarketId;
                  return (
                    <tr
                      key={market.id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        isCurrent ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      {/* Name & Flag */}
                      <td className="py-3 px-3 font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{market.countryFlag}</span>
                          <div>
                            <span className="font-semibold block">{market.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono-numbers">
                              {market.tradingViewLabel} · {market.category === 'EXCHANGE' ? 'Bolsa de Valores' : 'Forex'}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold ml-1">
                              Activo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Origin time */}
                      <td className="py-3 px-3 text-slate-400 font-mono-numbers">
                        {market.localOpenTime} {market.tradingViewLabel}
                      </td>

                      {/* Local open time in evaluated timezone */}
                      <td className="py-3 px-3 font-bold text-white font-mono-numbers text-sm">
                        {calc.marketOpenLocal}
                      </td>

                      {/* Box Interval */}
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold font-mono-numbers">
                          {calc.tradingViewInterval}
                        </span>
                      </td>

                      {/* Real-time Status Badge */}
                      <td className="py-3 px-3">
                        {progress.isInsideBox ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {progress.status === 'IN_BOX_PRE_OPEN' ? 'En Caja (Pre)' : 'En Caja (Post)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans text-slate-400 bg-slate-950 border border-slate-800">
                            <span>Fuera de rango</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMarketId(market.id);
                              handleCopyInterval(calc.tradingViewInterval);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Seleccionar este mercado y copiar intervalo"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Footer: Minimalist Technical Rationale & Clean Notes ─── */}
        <footer className="text-xs text-slate-400 border-t border-slate-800/80 pt-4 pb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Sessions ZS</span>
            <span>·</span>
            <span>Trading Box Strategy Calculator</span>
            <span>·</span>
            <span>Engine v2.0</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            Regla de la estrategia: Rango de 90m (-60m pre-apertura a +30m post-apertura)
          </div>
        </footer>

      </main>
    </div>
  );
}
