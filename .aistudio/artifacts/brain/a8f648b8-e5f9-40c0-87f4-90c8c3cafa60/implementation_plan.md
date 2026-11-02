# Calculadora de Estrategia de la Caja (Session Box) - TradingView & Exchange Dark UI

Calculadora de precisión para traders para determinar los intervalos exactos de la **Estrategia de la Caja** (1 hora antes de la apertura y 30 minutos después) según la zona horaria del usuario, mercado seleccionado y régimen de horario de verano (DST), con formato idéntico a los parámetros de TradingView.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Cálculo de la Caja**: La regla universal de la estrategia establece que la caja abre **1 hora antes** de la apertura del mercado y cierra **30 minutos después** de la apertura (duración total: 90 minutos).
> - **Manejo de Horario de Verano (DST)**: Se proporcionan controles independientes y claros tanto para el horario del usuario (si su país aplica DST) como para el mercado objetivo (verano/invierno boreal o austral según aplique), con detección automática sugerida basada en la fecha actual.
> - **Estilo Visual**: Modo oscuro inspirado en terminales de trading y exchanges institucionales (Binance/Bybit/TradingView Dark), fondos slate neutros (`#090D14` / `#111827`), tipografía tabular mono para cifras de tiempo, micro-interacciones rápidas y botón de copia rápida con 1 clic para pegar en TradingView.

---

## 1. Overview & Core Concept

- **Qué hace**: Permite a cualquier operador de mercados financieros (Forex, Índices, Acciones) seleccionar su zona horaria y el mercado o sesión (Nueva York, Londres, Frankfurt, Tokio, Hong Kong, Sídney), ajustar el estado de horario de verano (DST), y obtener inmediatamente la hora de apertura local y el intervalo exacto para configurar el indicador de la caja en TradingView (`HH:mm — HH:mm`).
- **Público objetivo**: Traders minoristas e institucionales que operan aperturas de mercado, rupturas de rango de apertura (Opening Range Breakout / ORB) e indicadores tipo "Session Box".
- **Valor diferencial**: Elimina errores de cálculo manual al cambiar entre horario de verano e invierno entre hemisferios y proporciona una réplica visual idéntica a los ajustes de TradingView para copiar y pegar sin fricción.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Selección de Zona Horaria Local**:
   - Selector con banderas de países, nombre de zona y offset UTC actual (ej. `[BO] Bolivia / La Paz (UTC-4)`).
   - Interruptor sutil si la zona seleccionada observa DST (ej. Chile, EE.UU., Europa).
2. **Selección de Mercado / Sesión**:
   - Pestañas o selector de bolsas principales (`NYSE / NASDAQ`, `LSE Londres`, `XETRA Frankfurt`, `TSE Tokio`, `HKEX`, `ASX Sídney`) y sesiones Forex (`Nueva York`, `Londres`, `Tokio`, `Sídney`).
   - Selector de temporada del mercado (`Horario de Verano / DST` vs `Horario Estándar / Invierno`).
3. **Cálculo Instantáneo & Réplica TradingView**:
   - Bloque principal estilo inputs de TradingView tal como en la captura de referencia:
     - *Zona Horaria*: `UTC-X`
     - *Etiqueta de la Sesión*: `New York`
     - *Intervalo Manual / Ajuste Desfase*: `08:30 — 10:00` con icono de reloj y botón de copiado rápido.
4. **Línea de Tiempo Visual de la Caja**:
   - Gráfico de barra de tiempo horizontal minimalista que ilustra el rango de 90 minutos (`-60m` pre-mercado, `0m` apertura oficial, `+30m` post-apertura) y el estado actual respecto al reloj en tiempo real.

### Visual Identity & Theme
- **Fondo y Estructura**: Deep Dark Slate (`bg-[#0a0e17]`, bordes `border-slate-800/80`, superficies `bg-slate-900/60`).
- **Acentos**: Azul exchange / TradingView Cyan (`#2563eb` / `#38bdf8`) y verde esmeralda (`#10b981`) para el estado de apertura.
- **Tipografía**:
  - Títulos y etiquetas: `Plus Jakarta Sans` / `Outfit` sans-serif moderno y limpio.
  - Cifras horarias y códigos: `JetBrains Mono` / `tabular-nums` para evitar desfases visuales y asegurar legibilidad técnica perfecta.
- **Micro-interacciones**: Transiciones fluidas en cambios de mercado, feedback de copiado al portapapeles ("¡Copiado!"), e indicador sutil de hora UTC actual en vivo.

---

## 3. Key Product Decisions & Trade-Offs

- **Componente Único y Modular**: Todo el cálculo y la interfaz residen en un componente interactivo principal y limpio, sin dependencias externas pesadas como librerías de fechas de 500KB; se utilizan cálculos matemáticos directos en minutos basados en el registro canónico provisto (`TIMEZONE_REGISTRY` y `TRADING_SCHEDULES`).
- **Soporte Completo del Objeto Canónico**: Se integra al 100% el catálogo de zonas provisto por el usuario (América, Europa, Asia, Oceanía) con soporte para offsets fraccionarios como India (`+05:30`).
- **Cero Fricción en TradingView**: El resultado de la caja se presenta exactamente en el formato requerido por los scripts de Pine Script / TradingView (`HH:mm - HH:mm`).

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   App (Root Component)                 │
│                                                        │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ State:           │  │ Clock Engine:               │ │
│  │ - userTimezoneId │  │ - liveUtcTime               │ │
│  │ - userDstActive  │  │ - calculateBoxSchedule()    │ │
│  │ - marketId       │  │                             │ │
│  │ - marketSeason   │  │                             │ │
│  └─────────┬────────┘  └──────────────┬──────────────┘ │
│            │                          │                │
│            ▼                          ▼                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Header: Exchange Wordmark + UTC Live Time        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Control Panel:                                   │  │
│  │  - Selector Mi Zona Horaria (con banderas)       │  │
│  │  - Toggle DST Usuario (condicional)              │  │
│  │  - Selector Mercado / Sesión                     │  │
│  │  - Selector Horario Mercado (Verano / Estándar)  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ TradingView Exact Output Card (Captura Réplica): │  │
│  │  - Zona Horaria                                  │  │
│  │  - Etiqueta de Sesión                            │  │
│  │  - Intervalo Manual [ HH:mm ] — [ HH:mm ]        │  │
│  │  - Botón Copiar Intervalo                        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Session Timeline & Box Visualization:            │  │
│  │  - Barra temporal 90 min (Apertura Caja -> Open) │  │
│  │  - Resumen de apertura oficial y cierre de caja  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Plan de Archivos
- `metadata.json`: Actualizar nombre ("Trading Box Strategy Calculator") y descripción.
- `index.html`: Actualizar títulos y fuentes de Google Fonts (`Plus Jakarta Sans` y `JetBrains Mono`).
- `src/data/timezones.ts`: Estructuras de datos completas `TIMEZONE_REGISTRY` y `TRADING_SCHEDULES` con tipado TypeScript estricto provisto por el usuario.
- `src/utils/timeCalculations.ts`: Funciones puras de cálculo de minutos, conversión de offsets UTC (`+05:30`, `-04:00`, `Z`), resta de 60 minutos (inicio caja) y suma de 30 minutos (fin caja) con wrap-around de 24 horas.
- `src/App.tsx`: Componente de página única, interactivo, minimalista con tema dark exchange.
