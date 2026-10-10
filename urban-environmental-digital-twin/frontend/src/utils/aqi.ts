import { ObservationItem } from '../types/observation';

// Official Indian CPCB NAQI (National Air Quality Index) category tier
export type NAQICategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface CategoryInfo {
  category: NAQICategory;
  color: string;
  explanation: string;
}

export function getNAQICategoryInfo(indexValue: number): CategoryInfo {
  if (indexValue <= 50) {
    return {
      category: 'Good',
      color: '#4ade80',
      explanation: 'Air quality is considered clean. Minimal to no health impact expected.',
    };
  } else if (indexValue <= 100) {
    return {
      category: 'Satisfactory',
      color: '#a3b593',
      explanation: 'Air quality is acceptable. Minor breathing discomfort may occur for sensitive individuals.',
    };
  } else if (indexValue <= 200) {
    return {
      category: 'Moderate',
      color: '#facc15',
      explanation: 'Moderate particle levels. Sensitive individuals (asthma, respiratory sensitivities) should pace prolonged exertion.',
    };
  } else if (indexValue <= 300) {
    return {
      category: 'Poor',
      color: '#fb923c',
      explanation: 'Unhealthy air conditions. Prolonged outdoor exposure may cause breathing discomfort for many residents.',
    };
  } else if (indexValue <= 400) {
    return {
      category: 'Very Poor',
      color: '#f87171',
      explanation: 'Significantly polluted air. Respiratory symptoms likely on prolonged exposure. Avoid strenuous outdoor activity.',
    };
  } else {
    return {
      category: 'Severe',
      color: '#ef4444',
      explanation: 'Hazardous air conditions. May cause respiratory impacts on healthy individuals and serious effects on vulnerable groups.',
    };
  }
}

// CPCB Piecewise linear interpolation: I = I_low + ((I_high - I_low) / (B_high - B_low)) * (C - B_low)
function calcSubIndex(conc: number, breakpoints: [number, number, number, number][]): number {
  for (const [bLow, bHigh, iLow, iHigh] of breakpoints) {
    if (conc <= bHigh) {
      return Math.round(iLow + ((iHigh - iLow) / (bHigh - bLow)) * (conc - bLow));
    }
  }
  const last = breakpoints[breakpoints.length - 1];
  return Math.min(500, Math.round(last[2] + ((last[3] - last[2]) / (last[1] - last[0])) * (conc - last[0])));
}

export function calcPM25SubIndex(pm25?: number | null): number | null {
  if (pm25 === null || pm25 === undefined || isNaN(pm25) || pm25 < 0) return null;
  return calcSubIndex(pm25, [
    [0, 30, 0, 50],
    [30, 60, 50, 100],
    [60, 90, 100, 200],
    [90, 120, 200, 300],
    [120, 250, 300, 400],
    [250, 380, 400, 500],
  ]);
}

export function calcPM10SubIndex(pm10?: number | null): number | null {
  if (pm10 === null || pm10 === undefined || isNaN(pm10) || pm10 < 0) return null;
  return calcSubIndex(pm10, [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 250, 100, 200],
    [250, 350, 200, 300],
    [350, 430, 300, 400],
    [430, 510, 400, 500],
  ]);
}

export function calcNO2SubIndex(no2?: number | null): number | null {
  if (no2 === null || no2 === undefined || isNaN(no2) || no2 < 0) return null;
  return calcSubIndex(no2, [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 180, 100, 200],
    [180, 280, 200, 300],
    [280, 400, 300, 400],
    [400, 500, 400, 500],
  ]);
}

export function calcSO2SubIndex(so2?: number | null): number | null {
  if (so2 === null || so2 === undefined || isNaN(so2) || so2 < 0) return null;
  return calcSubIndex(so2, [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 380, 100, 200],
    [380, 800, 200, 300],
    [800, 1600, 300, 400],
    [1600, 2000, 400, 500],
  ]);
}

export function calcCOSubIndex(co?: number | null): number | null {
  if (co === null || co === undefined || isNaN(co) || co < 0) return null;
  return calcSubIndex(co, [
    [0, 1.0, 0, 50],
    [1.0, 2.0, 50, 100],
    [2.0, 10.0, 100, 200],
    [10.0, 17.0, 200, 300],
    [17.0, 34.0, 300, 400],
    [34.0, 45.0, 400, 500],
  ]);
}

export function calcO3SubIndex(o3?: number | null): number | null {
  if (o3 === null || o3 === undefined || isNaN(o3) || o3 < 0) return null;
  return calcSubIndex(o3, [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 168, 100, 200],
    [168, 208, 200, 300],
    [209, 748, 300, 400],
    [748, 1000, 400, 500],
  ]);
}

export interface EvaluatedAirQuality {
  isOfficialAqiAvailable: boolean;
  officialAqi: number | null;
  officialCategory: NAQICategory | null;
  officialColor: string | null;
  prominentPollutant: string | null;
  officialUnavailableReason: string | null;

  hasParticulateEstimate: boolean;
  particulateIndex: number | null;
  particulateCategory: NAQICategory | null;
  particulateColor: string | null;
  particulateExplanation: string | null;
  prominentParticulate: string | null;

  monitoredPollutantCount: number;
  availablePollutantsList: string[];
}

export function evaluateAirQuality(obs?: ObservationItem | null): EvaluatedAirQuality {
  if (!obs) {
    return {
      isOfficialAqiAvailable: false,
      officialAqi: null,
      officialCategory: null,
      officialColor: null,
      prominentPollutant: null,
      officialUnavailableReason: 'No observation data received from this station.',
      hasParticulateEstimate: false,
      particulateIndex: null,
      particulateCategory: null,
      particulateColor: null,
      particulateExplanation: null,
      prominentParticulate: null,
      monitoredPollutantCount: 0,
      availablePollutantsList: [],
    };
  }

  const subIndices: { name: string; value: number; subIndex: number; unit: string }[] = [];

  const pm25Sub = calcPM25SubIndex(obs.pm25);
  if (pm25Sub !== null && obs.pm25 !== null && obs.pm25 !== undefined) {
    subIndices.push({ name: 'PM2.5', value: obs.pm25, subIndex: pm25Sub, unit: 'µg/m³' });
  }

  const pm10Sub = calcPM10SubIndex(obs.pm10);
  if (pm10Sub !== null && obs.pm10 !== null && obs.pm10 !== undefined) {
    subIndices.push({ name: 'PM10', value: obs.pm10, subIndex: pm10Sub, unit: 'µg/m³' });
  }

  const no2Sub = calcNO2SubIndex(obs.no2);
  if (no2Sub !== null && obs.no2 !== null && obs.no2 !== undefined) {
    subIndices.push({ name: 'NO2', value: obs.no2, subIndex: no2Sub, unit: 'µg/m³' });
  }

  const so2Sub = calcSO2SubIndex(obs.so2);
  if (so2Sub !== null && obs.so2 !== null && obs.so2 !== undefined) {
    subIndices.push({ name: 'SO2', value: obs.so2, subIndex: so2Sub, unit: 'µg/m³' });
  }

  const coSub = calcCOSubIndex(obs.co);
  if (coSub !== null && obs.co !== null && obs.co !== undefined) {
    subIndices.push({ name: 'CO', value: obs.co, subIndex: coSub, unit: 'mg/m³' });
  }

  const o3Sub = calcO3SubIndex(obs.o3);
  if (o3Sub !== null && obs.o3 !== null && obs.o3 !== undefined) {
    subIndices.push({ name: 'O3', value: obs.o3, subIndex: o3Sub, unit: 'µg/m³' });
  }

  const monitoredPollutantCount = subIndices.length;
  const availablePollutantsList = subIndices.map((s) => s.name);
  const hasParticulate = subIndices.some((s) => s.name === 'PM2.5' || s.name === 'PM10');

  // Official CPCB Rule: Minimum 3 pollutants with at least one PM2.5 or PM10
  const isOfficialAqiAvailable = monitoredPollutantCount >= 3 && hasParticulate;
  let officialAqi: number | null = null;
  let officialCategory: NAQICategory | null = null;
  let officialColor: string | null = null;
  let prominentPollutant: string | null = null;
  let officialUnavailableReason: string | null = null;

  if (isOfficialAqiAvailable) {
    officialAqi = Math.max(...subIndices.map((s) => s.subIndex));
    prominentPollutant = subIndices.find((s) => s.subIndex === officialAqi)?.name || null;
    const cat = getNAQICategoryInfo(officialAqi);
    officialCategory = cat.category;
    officialColor = cat.color;
  } else {
    if (monitoredPollutantCount === 0) {
      officialUnavailableReason = 'No active pollutant observations available at this station.';
    } else if (!hasParticulate) {
      officialUnavailableReason = 'Requires at least PM2.5 or PM10 coverage.';
    } else {
      officialUnavailableReason = `Requires at least 3 monitored criteria pollutants. Currently only ${monitoredPollutantCount} (${availablePollutantsList.join(', ')}) is monitored.`;
    }
  }

  // Particulate-Based Air Quality Estimate (PM2.5 / PM10)
  const particulateSubs = subIndices.filter((s) => s.name === 'PM2.5' || s.name === 'PM10');
  const hasParticulateEstimate = particulateSubs.length > 0;
  let particulateIndex: number | null = null;
  let particulateCategory: NAQICategory | null = null;
  let particulateColor: string | null = null;
  let particulateExplanation: string | null = null;
  let prominentParticulate: string | null = null;

  if (hasParticulateEstimate) {
    particulateIndex = Math.max(...particulateSubs.map((s) => s.subIndex));
    prominentParticulate = particulateSubs.find((s) => s.subIndex === particulateIndex)?.name || null;
    const cat = getNAQICategoryInfo(particulateIndex);
    particulateCategory = cat.category;
    particulateColor = cat.color;
    particulateExplanation = cat.explanation;
  }

  return {
    isOfficialAqiAvailable,
    officialAqi,
    officialCategory,
    officialColor,
    prominentPollutant,
    officialUnavailableReason,
    hasParticulateEstimate,
    particulateIndex,
    particulateCategory,
    particulateColor,
    particulateExplanation,
    prominentParticulate,
    monitoredPollutantCount,
    availablePollutantsList,
  };
}

export function calculateAQI(pm25?: number | null, pm10?: number | null): { aqi: number; category: NAQICategory; color: string; explanation: string } | null {
  const pm25Sub = calcPM25SubIndex(pm25);
  const pm10Sub = calcPM10SubIndex(pm10);
  const values = [pm25Sub, pm10Sub].filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const aqi = Math.max(...values);
  const cat = getNAQICategoryInfo(aqi);
  return { aqi, category: cat.category, color: cat.color, explanation: cat.explanation };
}
