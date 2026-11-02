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
  Play,
  RotateCcw,
  Timer,
  AlertCircle,
  Radio,
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
  // Estado de selección
  const [selectedTimezoneKey, setSelectedTimezoneKey] =
    useState<TimezoneKey>('AMERICA_LA_PAZ'); // Por defecto Bolivia como en el ejemplo del usuario (GMT-4)
  const [userDstActive, setUserDstActive] = useState<boolean>(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('NYSE_NASDAQ');
  const [marketSeason, setMarketSeason] = useState<'dst' | 'standard'>('standard'); // Inicializado en estándar (GMT-5 para NY) para probar fácilmente
  const [copied, setCopied] = useState<boolean>(false);

  // Reloj en tiempo real (UTC y Local)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modo Simulación de Hora para probar fácilmente 08:00, 10:00, 12:00
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(600); // 10:00 AM por defecto

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

  // Cálculo de los horarios de la caja
  const boxCalculation = useMemo(() => {
    return calculateBoxSchedule({
      userTimezone,
      userDstActive,
      market: selectedMarket,
      marketSeason,
    });
  }, [userTimezone, userDstActive, selectedMarket, marketSeason]);

  // Cálculo de estado y progreso en tiempo real (o simulado)
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

  // Hora local en vivo según la zona horaria seleccionada
  const userLocalLiveTime = useMemo(() => {
    const utcHours = currentTime.getUTCHours();
    const utcMins = currentTime.getUTCMinutes();
    const utcSecs = currentTime.getUTCSeconds();
    const utcTotalMinutes = utcHours * 60 + utcMins + utcSecs / 60;
    const localTotalMinutes = ((utcTotalMinutes + userOffsetMinutes) % 1440 + 1440) % 1440;
    const lh = Math.floor(localTotalMinutes / 60);
    const lm = Math.floor(localTotalMinutes % 60);
    return `${lh.toString().padStart(2, '0')}:${lm.toString().padStart(2, '0')}:${utcSecs.toString().padStart(2, '0')}`;
  }, [currentTime, userOffsetMinutes]);

  // Horas de diferencia respecto a UTC (ej: -4 horas, +3 horas, -6 horas)
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

  // Comparador de las 3 bolsas principales para la sección de vista rápida
  const quickComparison = useMemo(() => {
    const mainExchanges = [
      ALL_MARKETS.find((m) => m.id === 'NYSE_NASDAQ')!,
      ALL_MARKETS.find((m) => m.id === 'LSE')!,
      ALL_MARKETS.find((m) => m.id === 'TSE')!,
    ].filter(Boolean);

    return mainExchanges.map((ex) => {
      const calc = calculateBoxSchedule({
        userTimezone,
        userDstActive,
        market: ex,
        marketSeason: ex.hasDst ? marketSeason : 'standard',
      });
      return {
        exchange: ex,
        calc,
      };
    });
  }, [userTimezone, userDstActive, marketSeason]);

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
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
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

            {/* Calendario (Pantallas medianas y grandes) */}
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
            
            {/* Box 1: Zona Horaria del Usuario con [GMT-X] al principio */}
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

              {/* Selector de zona con [GMT-X] al principio para fácil lectura */}
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

              {/* Form fields replicating the user's TradingView indicator interface */}
              <div className="space-y-4">
                
                {/* Field 1: Zona Horaria */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">
                    Zona Horaria
                  </label>
                  <div className="w-full sm:w-44 px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono-numbers text-slate-200 flex items-center justify-between">
                    <span>{boxCalculation.userOffsetFormatted}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Field 2: Etiqueta de la Sesión */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">
                    Etiqueta de la Sesión
                  </label>
                  <div className="w-full sm:w-44 px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-semibold text-cyan-300 flex items-center justify-between">
                    <span>{selectedMarket.tradingViewLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Field 3: Intervalo Manual / Ajuste Desfase (Exact image layout) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span>Intervalo Manual / Ajuste Desfase</span>
                    <span className="text-[11px] text-slate-400 font-mono-numbers">(60m antes — 30m después)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Start Time Box */}
                    <div className="flex-1 px-3 py-2.5 bg-slate-950 border border-cyan-500/50 rounded-lg flex items-center justify-between shadow-inner">
                      <span className="text-base font-bold text-white font-mono-numbers tracking-wider">
                        {boxCalculation.boxStartLocal}
                      </span>
                      <Clock className="w-4 h-4 text-cyan-400" />
                    </div>

                    <span className="text-slate-400 font-bold">—</span>

                    {/* End Time Box */}
                    <div className="flex-1 px-3 py-2.5 bg-slate-950 border border-cyan-500/50 rounded-lg flex items-center justify-between shadow-inner">
                      <span className="text-base font-bold text-white font-mono-numbers tracking-wider">
                        {boxCalculation.boxEndLocal}
                      </span>
                      <Clock className="w-4 h-4 text-cyan-400" />
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

        {/* ─── REAL-TIME TIMELINE & PROGRESS MONITOR ─── */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0d1322] border border-slate-800/80 space-y-5">
          
          {/* Header of Timeline with Live Status & Countdowns */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-800/70">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Línea Temporal de la Estrategia (Timeline 90 min)
                </h2>
                {/* Live vs Simulation indicator */}
                {isSimulationMode ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold flex items-center gap-1">
                    <Sliders className="w-3 h-3" />
                    MODO SIMULACIÓN
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TIEMPO REAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Progreso y contador para la campana de apertura y la ventana de la caja
              </p>
            </div>

            {/* Current local time display */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start md:self-auto">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-400">Tu hora local ({formatGmtPrefix(effectiveUserOffset)}):</span>
              <span className="font-mono-numbers font-bold text-cyan-300 text-sm">
                {sessionProgress.userNowTimeFormatted}
              </span>
            </div>
          </div>

          {/* Real-time Status Card & Countdown Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              sessionProgress.status === 'IN_BOX_PRE_OPEN'
                ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200'
                : sessionProgress.status === 'IN_BOX_POST_OPEN'
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}
          >
            {/* Left: Status text */}
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  sessionProgress.isInsideBox
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {sessionProgress.isInsideBox ? (
                  <Radio className="w-5 h-5 animate-pulse" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      sessionProgress.isInsideBox
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {sessionProgress.isInsideBox ? '🟢 DENTRO DE LA CAJA' : '⏸️ FUERA DE RANGO'}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {sessionProgress.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {sessionProgress.isInsideBox
                    ? `Progreso de la caja: ${Math.round(sessionProgress.boxProgressPercent)}% completado`
                    : `La ventana de la caja opera exclusivamente entre ${boxCalculation.boxStartLocal} y ${boxCalculation.boxEndLocal}.`}
                </p>
              </div>
            </div>

            {/* Right: Real-time countdown to Open Bell or Box */}
            <div className="flex flex-col sm:items-end justify-center bg-slate-900/90 border border-slate-800/80 px-4 py-2.5 rounded-lg shrink-0">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                {sessionProgress.primaryCountdownLabel}
              </span>
              <span className="text-xl font-bold font-mono-numbers text-cyan-300 tracking-wide">
                {sessionProgress.primaryCountdownValue}
              </span>
              {sessionProgress.status === 'BEFORE_BOX' && (
                <span className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                  Apertura oficial (0m): en {sessionProgress.countdownToOpenText}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Progress Bar Visualization (matches image_d82a8a7c) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Rango de la caja: <strong className="text-slate-200 font-mono-numbers">{boxCalculation.boxStartLocal}</strong> a <strong className="text-slate-200 font-mono-numbers">{boxCalculation.boxEndLocal}</strong></span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
                  <span>Pre-mercado (60m)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                  <span>Post-apertura (30m)</span>
                </span>
              </div>
            </div>

            {/* The Bar Track */}
            <div className="relative pt-6 pb-2">
              
              {/* Needle/Cursor if INSIDE the box */}
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

              {/* Main 90-minute Container Bar */}
              <div className="h-12 w-full bg-slate-950 rounded-xl p-1.5 flex items-stretch border border-slate-800 relative overflow-hidden shadow-inner">
                
                {/* Real-time Glowing Fill overlay (if inside box) */}
                {sessionProgress.isInsideBox && (
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-cyan-400/15 border-r-2 border-cyan-400 z-10 transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    style={{ width: `${sessionProgress.boxProgressPercent}%` }}
                  />
                )}

                {/* Pre-open Box: 60 minutes (66.6% of 90m) */}
                <div
                  className="w-2/3 bg-gradient-to-r from-cyan-600/40 via-cyan-500/50 to-cyan-400/60 rounded-l-lg flex items-center justify-between px-3.5 text-xs font-semibold text-cyan-100 border-r border-white/25 relative"
                >
                  <span className="font-mono-numbers font-bold text-sm tracking-wide">
                    {boxCalculation.boxStartLocal}
                  </span>
                  <span className="text-[11px] opacity-80 hidden sm:inline">60 min antes</span>
                </div>

                {/* Post-open Box: 30 minutes (33.3% of 90m) */}
                <div
                  className="w-1/3 bg-gradient-to-r from-indigo-500/50 to-indigo-600/40 rounded-r-lg flex items-center justify-between px-3.5 text-xs font-semibold text-indigo-100 relative"
                >
                  <span className="text-[11px] opacity-80 hidden sm:inline">30 min después</span>
                  <span className="font-mono-numbers font-bold text-sm tracking-wide ml-auto">
                    {boxCalculation.boxEndLocal}
                  </span>
                </div>

                {/* Exact Open Bell Marker Line (at 66.6%) */}
                <div
                  className="absolute left-2/3 -top-1 -bottom-1 w-0.5 bg-white shadow-lg shadow-white/80 z-10 flex flex-col items-center justify-between pointer-events-none"
                >
                  <div className="w-2 h-2 rounded-full bg-white -mt-0.5" />
                  <div className="w-2 h-2 rounded-full bg-white -mb-0.5" />
                </div>
              </div>

              {/* Labels beneath the timeline */}
              <div className="flex items-center justify-between text-xs font-mono-numbers text-slate-400 px-1 pt-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Abre Caja</span>
                  <span className="text-slate-200 font-bold">{boxCalculation.boxStartLocal}</span>
                </div>
                <div className="text-center">
                  <span className="text-cyan-400 block text-[10px] font-semibold">Campana de Apertura (0m)</span>
                  <span className="text-white font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/80">
                    {boxCalculation.marketOpenLocal}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Cierra Caja</span>
                  <span className="text-slate-200 font-bold">{boxCalculation.boxEndLocal}</span>
                </div>
              </div>
            </div>

            {/* Out-of-range helper indicators if current time is not inside the box */}
            {!sessionProgress.isInsideBox && (
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Tu hora actual ({sessionProgress.userNowTimeFormatted.slice(0, 5)}) está{' '}
                    <strong className="text-amber-300 font-semibold">fuera de rango</strong>.
                    {sessionProgress.status === 'BEFORE_BOX'
                      ? ' La caja abrirá más tarde.'
                      : ' La sesión de hoy ya ha transcurrido.'}
                  </span>
                </div>
                <span className="text-slate-400 font-mono-numbers">
                  Próxima apertura oficial en: {sessionProgress.countdownToOpenText}
                </span>
              </div>
            )}

            {/* ─── Simulation & Testing Toolbar (For easy verification of 08:00, 10:00, 12:00) ─── */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Simulador de Horas (Prueba los ejemplos de tu consulta):
                </span>
                {isSimulationMode && (
                  <button
                    type="button"
                    onClick={() => setIsSimulationMode(false)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Volver a Hora Real en Vivo</span>
                  </button>
                )}
              </div>

              {/* Quick preset buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* En vivo */}
                <button
                  type="button"
                  onClick={() => setIsSimulationMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isSimulationMode
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Hora Real en Vivo</span>
                </button>

                {/* Preset 08:00 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(480); // 08:00
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-all cursor-pointer ${
                    isSimulationMode && simulatedMinutes === 480
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  08:00 AM (Fuera de rango)
                </button>

                {/* Preset 10:00 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(600); // 10:00
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-all cursor-pointer ${
                    isSimulationMode && simulatedMinutes === 600
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  10:00 AM (En rango - Pre-apertura)
                </button>

                {/* Preset 10:30 (Open) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(630); // 10:30
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-all cursor-pointer ${
                    isSimulationMode && simulatedMinutes === 630
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  10:30 AM (Campana Apertura)
                </button>

                {/* Preset 10:45 (Post-open) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(645); // 10:45
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-all cursor-pointer ${
                    isSimulationMode && simulatedMinutes === 645
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  10:45 AM (En rango - Post-apertura)
                </button>

                {/* Preset 12:00 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulationMode(true);
                    setSimulatedMinutes(720); // 12:00
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-all cursor-pointer ${
                    isSimulationMode && simulatedMinutes === 720
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  12:00 PM (Fuera de rango)
                </button>
              </div>

              {/* Slider for continuous testing */}
              {isSimulationMode && (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Ajuste fino de hora:</span>
                    <span className="font-mono-numbers font-bold text-cyan-300">
                      {formatMinutesToTime(simulatedMinutes)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1439"
                    step="5"
                    value={simulatedMinutes}
                    onChange={(e) => setSimulatedMinutes(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ─── Multi-Market Quick Reference Table ─── */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0d1322] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Resumen Multi-Mercado en tu Hora Local</span>
              </h2>
              <p className="text-xs text-slate-400">
                Horarios de la caja para las principales bolsas mundiales con tu zona ({formatGmtPrefix(effectiveUserOffset)})
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Mercado / Bolsa</th>
                  <th className="py-2.5 px-3">Hora en Origen (Bolsa)</th>
                  <th className="py-2.5 px-3">Apertura en Tu Zona ({formatGmtPrefix(effectiveUserOffset)})</th>
                  <th className="py-2.5 px-3">Intervalo de la Caja</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                {quickComparison.map(({ exchange, calc }) => {
                  const isCurrent = exchange.id === selectedMarketId;
                  return (
                    <tr
                      key={exchange.id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        isCurrent ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{exchange.countryFlag}</span>
                          <span>{exchange.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                              Activo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono-numbers">
                        {exchange.localOpenTime} {exchange.tradingViewLabel}
                      </td>
                      <td className="py-3 px-3 font-bold text-white font-mono-numbers">
                        {calc.marketOpenLocal}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                          {calc.tradingViewInterval}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMarketId(exchange.id);
                            handleCopyInterval(calc.tradingViewInterval);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
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
            <span>Trading Box Strategy Calculator</span>
            <span>·</span>
            <span>Real-Time Offset Engine</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            Regla de la estrategia: Rango de 90m (-60m pre-open a +30m post-open)
          </div>
        </footer>

      </main>
    </div>
  );
}
