/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Country {
  readonly code: string; // ISO 3166-1 alpha-2
  readonly name: string;
  readonly flag: string; // Emoji de bandera
}

export type UtcOffset = `${'+' | '-'}${string}:${string}` | 'Z';

export interface TimezoneMetadata {
  readonly id: string;
  readonly iana: string;
  readonly name: string;
  readonly standardOffset: UtcOffset;
  readonly dstOffset?: UtcOffset;
  readonly observesDst: boolean; // Flag que indica si la zona aplica horario de verano
  readonly representativeCountries: readonly Country[];
  readonly notes?: string;
}

export const TIMEZONE_REGISTRY = {
  // UTC -11 a UTC -10
  PACIFIC_HONOLULU: {
    id: 'PACIFIC_HONOLULU',
    iana: 'Pacific/Honolulu',
    name: 'Hawaii Standard Time (HST)',
    standardOffset: '-10:00',
    observesDst: false,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Hawái)', flag: '🇺🇸' },
      { code: 'PF', name: 'Polinesia Francesa', flag: '🇵🇫' },
    ],
  },

  // UTC -9
  AMERICA_ANCHORAGE: {
    id: 'AMERICA_ANCHORAGE',
    iana: 'America/Anchorage',
    name: 'Alaska Time',
    standardOffset: '-09:00',
    dstOffset: '-08:00',
    observesDst: true,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Alaska)', flag: '🇺🇸' },
    ],
  },

  // UTC -8
  AMERICA_LOS_ANGELES: {
    id: 'AMERICA_LOS_ANGELES',
    iana: 'America/Los_Angeles',
    name: 'Pacific Time (US & Canada)',
    standardOffset: '-08:00',
    dstOffset: '-07:00',
    observesDst: true,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Costa Oeste)', flag: '🇺🇸' },
      { code: 'CA', name: 'Canadá (Columbia Británica)', flag: '🇨🇦' },
      { code: 'MX', name: 'México (Baja California Norte)', flag: '🇲🇽' },
    ],
  },

  // UTC -7
  AMERICA_DENVER: {
    id: 'AMERICA_DENVER',
    iana: 'America/Denver',
    name: 'Mountain Time (US & Canada)',
    standardOffset: '-07:00',
    dstOffset: '-06:00',
    observesDst: true,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Montañas Rocosas)', flag: '🇺🇸' },
      { code: 'CA', name: 'Canadá (Alberta)', flag: '🇨🇦' },
    ],
  },
  AMERICA_PHOENIX: {
    id: 'AMERICA_PHOENIX',
    iana: 'America/Phoenix',
    name: 'Mountain Standard Time (Sin DST)',
    standardOffset: '-07:00',
    observesDst: false,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Arizona)', flag: '🇺🇸' },
      { code: 'MX', name: 'México (Sonora)', flag: '🇲🇽' },
    ],
  },

  // UTC -6
  AMERICA_CHICAGO: {
    id: 'AMERICA_CHICAGO',
    iana: 'America/Chicago',
    name: 'Central Time (US & Canada)',
    standardOffset: '-06:00',
    dstOffset: '-05:00',
    observesDst: true,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Centro / CME)', flag: '🇺🇸' },
      { code: 'CA', name: 'Canadá (Manitoba)', flag: '🇨🇦' },
    ],
  },
  AMERICA_MEXICO_CITY: {
    id: 'AMERICA_MEXICO_CITY',
    iana: 'America/Mexico_City',
    name: 'Hora Central Estándar México (Sin DST)',
    standardOffset: '-06:00',
    observesDst: false,
    representativeCountries: [
      { code: 'MX', name: 'México (Centro y Sur)', flag: '🇲🇽' },
      { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
      { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
      { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    ],
    notes: 'México abolió el horario de verano nacional en 2022 (excepto municipios fronterizos con EE. UU.).',
  },

  // UTC -5
  AMERICA_NEW_YORK: {
    id: 'AMERICA_NEW_YORK',
    iana: 'America/New_York',
    name: 'Eastern Time (US & Canada)',
    standardOffset: '-05:00',
    dstOffset: '-04:00',
    observesDst: true,
    representativeCountries: [
      { code: 'US', name: 'Estados Unidos (Costa Este / NYSE)', flag: '🇺🇸' },
      { code: 'CA', name: 'Canadá (Ontario, Quebec / TSX)', flag: '🇨🇦' },
      { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
    ],
  },
  AMERICA_BOGOTA: {
    id: 'AMERICA_BOGOTA',
    iana: 'America/Bogota',
    name: 'Colombia / Perú / Ecuador / Panamá',
    standardOffset: '-05:00',
    observesDst: false,
    representativeCountries: [
      { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
      { code: 'PE', name: 'Perú', flag: '🇵🇪' },
      { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
      { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
    ],
  },

  // UTC -4
  AMERICA_LA_PAZ: {
    id: 'AMERICA_LA_PAZ',
    iana: 'America/La_Paz',
    name: 'Bolivia / Venezuela / Rep. Dominicana',
    standardOffset: '-04:00',
    observesDst: false,
    representativeCountries: [
      { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
      { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
      { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
      { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
    ],
  },
  AMERICA_SANTIAGO: {
    id: 'AMERICA_SANTIAGO',
    iana: 'America/Santiago',
    name: 'Chile / Paraguay (Continental)',
    standardOffset: '-04:00',
    dstOffset: '-03:00',
    observesDst: true,
    representativeCountries: [
      { code: 'CL', name: 'Chile (Continental)', flag: '🇨🇱' },
      { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
    ],
    notes: 'Hemisferio sur: DST activo durante la primavera/verano austral (aprox. septiembre a abril).',
  },

  // UTC -3
  AMERICA_BUENOS_AIRES: {
    id: 'AMERICA_BUENOS_AIRES',
    iana: 'America/Argentina/Buenos_Aires',
    name: 'Argentina / Brasil (São Paulo) / Uruguay',
    standardOffset: '-03:00',
    observesDst: false,
    representativeCountries: [
      { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
      { code: 'BR', name: 'Brasil (Brasilia, São Paulo / B3)', flag: '🇧🇷' },
      { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    ],
  },

  // UTC 0
  UTC: {
    id: 'UTC',
    iana: 'UTC',
    name: 'Coordinated Universal Time (UTC / GMT)',
    standardOffset: 'Z',
    observesDst: false,
    representativeCountries: [
      { code: 'IS', name: 'Islandia', flag: '🇮🇸' },
      { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
      { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
    ],
  },
  EUROPE_LONDON: {
    id: 'EUROPE_LONDON',
    iana: 'Europe/London',
    name: 'Reino Unido / Londres (GMT / BST)',
    standardOffset: '+00:00',
    dstOffset: '+01:00',
    observesDst: true,
    representativeCountries: [
      { code: 'GB', name: 'Reino Unido (LSE)', flag: '🇬🇧' },
      { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    ],
  },

  // UTC +1
  EUROPE_BERLIN: {
    id: 'EUROPE_BERLIN',
    iana: 'Europe/Berlin',
    name: 'Europa Central (CET / CEST) - Madrid, París, Berlín',
    standardOffset: '+01:00',
    dstOffset: '+02:00',
    observesDst: true,
    representativeCountries: [
      { code: 'ES', name: 'España', flag: '🇪🇸' },
      { code: 'DE', name: 'Alemania (Xetra)', flag: '🇩🇪' },
      { code: 'FR', name: 'Francia (Euronext)', flag: '🇫🇷' },
      { code: 'IT', name: 'Italia', flag: '🇮🇹' },
      { code: 'CH', name: 'Suiza (SIX)', flag: '🇨🇭' },
      { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
    ],
  },
  AFRICA_LAGOS: {
    id: 'AFRICA_LAGOS',
    iana: 'Africa/Lagos',
    name: 'West Africa Time',
    standardOffset: '+01:00',
    observesDst: false,
    representativeCountries: [
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
      { code: 'CM', name: 'Camerún', flag: '🇨🇲' },
      { code: 'DZ', name: 'Argelia', flag: '🇩🇿' },
    ],
  },

  // UTC +2
  EUROPE_ATHENS: {
    id: 'EUROPE_ATHENS',
    iana: 'Europe/Athens',
    name: 'Europa del Este (EET / EEST) - Grecia, Rumania, Ucrania',
    standardOffset: '+02:00',
    dstOffset: '+03:00',
    observesDst: true,
    representativeCountries: [
      { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
      { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
      { code: 'UA', name: 'Ucrania', flag: '🇺🇦' },
      { code: 'RO', name: 'Rumania', flag: '🇷🇴' },
    ],
  },
  AFRICA_JOHANNESBURG: {
    id: 'AFRICA_JOHANNESBURG',
    iana: 'Africa/Johannesburg',
    name: 'Sudáfrica / Egipto (SAST)',
    standardOffset: '+02:00',
    observesDst: false,
    representativeCountries: [
      { code: 'ZA', name: 'Sudáfrica (JSE)', flag: '🇿🇦' },
      { code: 'EG', name: 'Egipto', flag: '🇪🇬' },
    ],
  },

  // UTC +3
  EUROPE_MOSCOW: {
    id: 'EUROPE_MOSCOW',
    iana: 'Europe/Moscow',
    name: 'Moscú / Arabia Saudita / Turquía',
    standardOffset: '+03:00',
    observesDst: false,
    representativeCountries: [
      { code: 'RU', name: 'Rusia (Moscú / MOEX)', flag: '🇷🇺' },
      { code: 'TR', name: 'Turquía (BIST)', flag: '🇹🇷' },
      { code: 'SA', name: 'Arabia Saudita (Tadawul)', flag: '🇸🇦' },
      { code: 'QA', name: 'Catar', flag: '🇶🇦' },
    ],
  },

  // UTC +4
  ASIA_DUBAI: {
    id: 'ASIA_DUBAI',
    iana: 'Asia/Dubai',
    name: 'Gulf Time - Dubái / EAU / Omán',
    standardOffset: '+04:00',
    observesDst: false,
    representativeCountries: [
      { code: 'AE', name: 'Emiratos Árabes Unidos (DFM / ADX)', flag: '🇦🇪' },
      { code: 'OM', name: 'Omán', flag: '🇴🇲' },
      { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
    ],
  },

  // UTC +5:30
  ASIA_KOLKATA: {
    id: 'ASIA_KOLKATA',
    iana: 'Asia/Kolkata',
    name: 'India Standard Time (IST)',
    standardOffset: '+05:30',
    observesDst: false,
    representativeCountries: [
      { code: 'IN', name: 'India (NSE / BSE)', flag: '🇮🇳' },
      { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    ],
  },

  // UTC +7
  ASIA_BANGKOK: {
    id: 'ASIA_BANGKOK',
    iana: 'Asia/Bangkok',
    name: 'Indochina Time - Bangkok / Yakarta',
    standardOffset: '+07:00',
    observesDst: false,
    representativeCountries: [
      { code: 'TH', name: 'Tailandia (SET)', flag: '🇹🇭' },
      { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
      { code: 'ID', name: 'Indonesia (Yakarta / IDX)', flag: '🇮🇩' },
    ],
  },

  // UTC +8
  ASIA_SHANGHAI: {
    id: 'ASIA_SHANGHAI',
    iana: 'Asia/Shanghai',
    name: 'China / Hong Kong / Singapur / Taiwán',
    standardOffset: '+08:00',
    observesDst: false,
    representativeCountries: [
      { code: 'CN', name: 'China (Shanghái / Shenzhen)', flag: '🇨🇳' },
      { code: 'HK', name: 'Hong Kong (HKEX)', flag: '🇭🇰' },
      { code: 'SG', name: 'Singapur (SGX)', flag: '🇸🇬' },
      { code: 'TW', name: 'Taiwán (TWSE)', flag: '🇹🇼' },
      { code: 'MY', name: 'Malasia', flag: '🇲🇾' },
      { code: 'PH', name: 'Filipinas', flag: '🇵🇭' },
      { code: 'AU', name: 'Australia (Perth)', flag: '🇦🇺' },
    ],
  },

  // UTC +9
  ASIA_TOKYO: {
    id: 'ASIA_TOKYO',
    iana: 'Asia/Tokyo',
    name: 'Japón (TSE) / Corea del Sur (KRX)',
    standardOffset: '+09:00',
    observesDst: false,
    representativeCountries: [
      { code: 'JP', name: 'Japón (TSE)', flag: '🇯🇵' },
      { code: 'KR', name: 'Corea del Sur (KRX)', flag: '🇰🇷' },
    ],
  },

  // UTC +10 (con DST)
  AUSTRALIA_SYDNEY: {
    id: 'AUSTRALIA_SYDNEY',
    iana: 'Australia/Sydney',
    name: 'Australia Oriental (Sídney / ASX)',
    standardOffset: '+10:00',
    dstOffset: '+11:00',
    observesDst: true,
    representativeCountries: [
      { code: 'AU', name: 'Australia (Sídney, Melbourne / ASX)', flag: '🇦🇺' },
    ],
    notes: 'Aplica DST en el verano del hemisferio sur (octubre a abril).',
  },

  // UTC +12
  PACIFIC_AUCKLAND: {
    id: 'PACIFIC_AUCKLAND',
    iana: 'Pacific/Auckland',
    name: 'Nueva Zelanda (NZX / NZDT)',
    standardOffset: '+12:00',
    dstOffset: '+13:00',
    observesDst: true,
    representativeCountries: [
      { code: 'NZ', name: 'Nueva Zelanda (NZX)', flag: '🇳🇿' },
      { code: 'FJ', name: 'Fiyi', flag: '🇫🇯' },
    ],
  },
} as const satisfies Record<string, TimezoneMetadata>;

export type TimezoneKey = keyof typeof TIMEZONE_REGISTRY;

export interface TimeWindowUtc {
  readonly open: `${string}:${string}`;
  readonly close: `${string}:${string}`;
}

export interface SeasonalSchedule {
  readonly standard: TimeWindowUtc; // Horario estándar / Invierno boreal
  readonly dst: TimeWindowUtc; // Horario de verano (Daylight Saving Time)
}

export interface MarketExchange {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly category: 'EXCHANGE' | 'FOREX';
  readonly localTimezone: string;
  readonly countryFlag: string;
  readonly localOpenTime: string; // Apertura en hora local del mercado
  readonly hasDst: boolean;
  readonly utcSchedule: SeasonalSchedule;
  readonly notes?: string;
  readonly tradingViewLabel: string;
}

export const TRADING_SCHEDULES = {
  exchanges: {
    NYSE_NASDAQ: {
      id: 'NYSE_NASDAQ',
      name: 'New York Stock Exchange / NASDAQ',
      shortLabel: 'Nueva York (NYSE / NASDAQ)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇺🇸',
      localOpenTime: '09:30',
      tradingViewLabel: 'New York',
      localTimezone: 'America/New_York',
      hasDst: true,
      utcSchedule: {
        standard: { open: '14:30', close: '21:00' }, // EST (UTC-5)
        dst: { open: '13:30', close: '20:00' }, // EDT (UTC-4)
      },
      notes: 'Apertura Wall Street a las 09:30 AM hora local de Nueva York.',
    },
    LSE: {
      id: 'LSE',
      name: 'London Stock Exchange',
      shortLabel: 'Londres (LSE)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇬🇧',
      localOpenTime: '08:00',
      tradingViewLabel: 'London',
      localTimezone: 'Europe/London',
      hasDst: true,
      utcSchedule: {
        standard: { open: '08:00', close: '16:30' }, // GMT (UTC+0)
        dst: { open: '07:00', close: '15:30' }, // BST (UTC+1)
      },
      notes: 'Apertura bolsa de Londres a las 08:00 AM hora local.',
    },
    XETRA: {
      id: 'XETRA',
      name: 'Frankfurt Stock Exchange (Xetra)',
      shortLabel: 'Frankfurt / Euronext (Xetra)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇩🇪',
      localOpenTime: '09:00',
      tradingViewLabel: 'Frankfurt',
      localTimezone: 'Europe/Berlin',
      hasDst: true,
      utcSchedule: {
        standard: { open: '08:00', close: '16:30' }, // CET (UTC+1) -> 08:00 UTC = 09:00 CET
        dst: { open: '07:00', close: '15:30' }, // CEST (UTC+2) -> 07:00 UTC = 09:00 CEST
      },
      notes: 'Apertura bolsa alemana Xetra a las 09:00 AM hora local.',
    },
    TSE: {
      id: 'TSE',
      name: 'Tokyo Stock Exchange',
      shortLabel: 'Tokio (TSE)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇯🇵',
      localOpenTime: '09:00',
      tradingViewLabel: 'Tokyo',
      localTimezone: 'Asia/Tokyo',
      hasDst: false,
      utcSchedule: {
        standard: { open: '00:00', close: '06:30' }, // JST (UTC+9) fijo -> 00:00 UTC = 09:00 JST
        dst: { open: '00:00', close: '06:30' },
      },
      notes: 'Japón no observa horario de verano. Horario fijo todo el año.',
    },
    HKEX: {
      id: 'HKEX',
      name: 'Hong Kong Exchanges and Clearing',
      shortLabel: 'Hong Kong (HKEX)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇭🇰',
      localOpenTime: '09:30',
      tradingViewLabel: 'Hong Kong',
      localTimezone: 'Asia/Hong_Kong',
      hasDst: false,
      utcSchedule: {
        standard: { open: '01:30', close: '08:00' }, // HKT (UTC+8) -> 01:30 UTC = 09:30 HKT
        dst: { open: '01:30', close: '08:00' },
      },
      notes: 'Hong Kong no observa horario de verano.',
    },
    ASX: {
      id: 'ASX',
      name: 'Australian Securities Exchange',
      shortLabel: 'Sídney (ASX)',
      category: 'EXCHANGE' as const,
      countryFlag: '🇦🇺',
      localOpenTime: '10:00',
      tradingViewLabel: 'Sydney',
      localTimezone: 'Australia/Sydney',
      hasDst: true,
      utcSchedule: {
        standard: { open: '23:00', close: '05:00' }, // Verano austral (AEDT UTC+11, 23:00 UTC día previo = 10:00 AEDT)
        dst: { open: '00:00', close: '06:00' }, // Invierno austral (AEST UTC+10, 00:00 UTC = 10:00 AEST)
      },
      notes: 'Hemisferio sur: estaciones invertidas.',
    },
  },

  forexSessions: {
    NEW_YORK: {
      id: 'FOREX_NEW_YORK',
      name: 'Sesión Forex New York',
      shortLabel: 'Forex Nueva York (08:00 local)',
      category: 'FOREX' as const,
      countryFlag: '🇺🇸',
      localOpenTime: '08:00',
      tradingViewLabel: 'Forex NY',
      localTimezone: 'America/New_York',
      hasDst: true,
      utcSchedule: {
        standard: { open: '13:00', close: '22:00' }, // EST (Invierno boreal)
        dst: { open: '12:00', close: '21:00' }, // EDT (Verano boreal)
      },
    },
    LONDON: {
      id: 'FOREX_LONDON',
      name: 'Sesión Forex London',
      shortLabel: 'Forex Londres (08:00 local)',
      category: 'FOREX' as const,
      countryFlag: '🇬🇧',
      localOpenTime: '08:00',
      tradingViewLabel: 'Forex London',
      localTimezone: 'Europe/London',
      hasDst: true,
      utcSchedule: {
        standard: { open: '08:00', close: '17:00' }, // GMT (Invierno boreal)
        dst: { open: '07:00', close: '16:00' }, // BST (Verano boreal)
      },
    },
    TOKYO: {
      id: 'FOREX_TOKYO',
      name: 'Sesión Forex Tokyo',
      shortLabel: 'Forex Tokio (09:00 local)',
      category: 'FOREX' as const,
      countryFlag: '🇯🇵',
      localOpenTime: '09:00',
      tradingViewLabel: 'Forex Tokyo',
      localTimezone: 'Asia/Tokyo',
      hasDst: false,
      utcSchedule: {
        standard: { open: '00:00', close: '09:00' },
        dst: { open: '00:00', close: '09:00' },
      },
    },
    SYDNEY: {
      id: 'FOREX_SYDNEY',
      name: 'Sesión Forex Sydney',
      shortLabel: 'Forex Sídney (08:00 local)',
      category: 'FOREX' as const,
      countryFlag: '🇦🇺',
      localOpenTime: '08:00',
      tradingViewLabel: 'Forex Sydney',
      localTimezone: 'Australia/Sydney',
      hasDst: true,
      utcSchedule: {
        standard: { open: '21:00', close: '06:00' },
        dst: { open: '22:00', close: '07:00' },
      },
    },
  },
} as const;

export type MarketItem =
  | (typeof TRADING_SCHEDULES.exchanges)[keyof typeof TRADING_SCHEDULES.exchanges]
  | (typeof TRADING_SCHEDULES.forexSessions)[keyof typeof TRADING_SCHEDULES.forexSessions];

export const ALL_MARKETS: MarketItem[] = [
  TRADING_SCHEDULES.exchanges.NYSE_NASDAQ,
  TRADING_SCHEDULES.exchanges.LSE,
  TRADING_SCHEDULES.exchanges.XETRA,
  TRADING_SCHEDULES.exchanges.TSE,
  TRADING_SCHEDULES.exchanges.HKEX,
  TRADING_SCHEDULES.exchanges.ASX,
  TRADING_SCHEDULES.forexSessions.NEW_YORK,
  TRADING_SCHEDULES.forexSessions.LONDON,
  TRADING_SCHEDULES.forexSessions.TOKYO,
  TRADING_SCHEDULES.forexSessions.SYDNEY,
];
