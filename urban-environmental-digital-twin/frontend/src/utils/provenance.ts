/**
 * Data Provenance Classification & Epistemological Taxonomy
 * Explicitly distinguishes physical sensor observations from numerical reanalysis,
 * spatial network proxies, and model counterfactual simulations.
 */

export type ProvenanceBadgeType =
  | 'OBSERVED'
  | 'REANALYSIS'
  | 'STATIC_ROAD_NETWORK'
  | 'TRAFFIC_PROXY'
  | 'STATIC_INDUSTRIAL'
  | 'INDUSTRIAL_PROXY'
  | 'CONSTRUCTION_PROXY'
  | 'STATIC_LAND_USE'
  | 'ACTIVITY_PROXY'
  | 'PREDICTED'
  | 'SCENARIO / SIMULATED';

export interface ProvenanceMeta {
  badge: string;
  category: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PROVENANCE_DEFINITIONS: Record<string, ProvenanceMeta> = {
  OBSERVED: {
    badge: 'OBSERVED',
    category: 'Ground Truth Telemetry',
    description: 'Direct physical continuous ambient air quality sensor measurement from CAAQMS station.',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  REANALYSIS: {
    badge: 'REANALYSIS',
    category: 'Numerical Assimilation',
    description: 'ECMWF ERA5-Land atmospheric model numerical reanalysis; not in-situ physical readings.',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.12)',
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  STATIC_ROAD_NETWORK: {
    badge: 'STATIC_ROAD',
    category: 'Spatial Infrastructure Snapshot',
    description: 'OpenStreetMap vector road network topology within 1.5 km station buffer; static geometry.',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  TRAFFIC_PROXY: {
    badge: 'TRAFFIC_PROXY',
    category: 'Empirical Diurnal Index',
    description: 'Diurnal traffic intensity profile (0.0 to 1.0) derived from Pune CMP; not vehicle counts.',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  STATIC_INDUSTRIAL: {
    badge: 'STATIC_INDUSTRIAL',
    category: 'Spatial Infrastructure Snapshot',
    description: 'OpenStreetMap industrial facility locations within 2.0 km; proxy for proximity.',
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  INDUSTRIAL_PROXY: {
    badge: 'INDUSTRIAL_PROXY',
    category: 'Spatial Proximity Proxy',
    description: 'Industrial facility density/proximity proxy; not measured factory stack emissions.',
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  CONSTRUCTION_PROXY: {
    badge: 'CONSTRUCTION_PROXY',
    category: 'Spatial Proximity Proxy',
    description: 'Civil construction & flyover works within 1.5 km; proxy for localized fugitive dust risk.',
    color: '#fb923c',
    bgColor: 'rgba(251, 146, 60, 0.12)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  STATIC_LAND_USE: {
    badge: 'STATIC_LAND_USE',
    category: 'Spatial Zoning Snapshot',
    description: 'Zoning polygons (residential, commercial, industrial, green) from OpenStreetMap.',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  ACTIVITY_PROXY: {
    badge: 'ACTIVITY_PROXY',
    category: 'Spatial Density Proxy',
    description: 'Commercial and transit points of interest (POIs); proxy for urban human activity.',
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.12)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  PREDICTED: {
    badge: 'PREDICTED',
    category: 'ML Next-Hour Forecast',
    description: 'Statistical machine learning model estimate for t+1; conditional on historical features.',
    color: '#818cf8',
    bgColor: 'rgba(129, 140, 248, 0.12)',
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  'SCENARIO / SIMULATED': {
    badge: 'SCENARIO / SIMULATED',
    category: 'Counterfactual Simulation',
    description: 'Model-derived counterfactual estimate under hypothetical policy intervention; not a causal measurement.',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  MODEL_COUNTERFACTUAL_ESTIMATE: {
    badge: 'SIMULATED',
    category: 'Counterfactual Model Output',
    description: 'Model-derived counterfactual estimate under hypothetical policy intervention; not a causal measurement.',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
};

export function getProvenanceMeta(classification?: string | null): ProvenanceMeta {
  if (!classification) {
    return {
      badge: 'UNCLASSIFIED',
      category: 'General',
      description: 'Source classification unspecified.',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.1)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
    };
  }

  const upper = classification.toUpperCase();
  if (upper.includes('OBSERVED')) return PROVENANCE_DEFINITIONS.OBSERVED;
  if (upper.includes('REANALYSIS')) return PROVENANCE_DEFINITIONS.REANALYSIS;
  if (upper.includes('ROAD')) return PROVENANCE_DEFINITIONS.STATIC_ROAD_NETWORK;
  if (upper.includes('TRAFFIC')) return PROVENANCE_DEFINITIONS.TRAFFIC_PROXY;
  if (upper.includes('INDUSTRIAL')) return PROVENANCE_DEFINITIONS.INDUSTRIAL_PROXY;
  if (upper.includes('CONSTRUCTION')) return PROVENANCE_DEFINITIONS.CONSTRUCTION_PROXY;
  if (upper.includes('LAND')) return PROVENANCE_DEFINITIONS.STATIC_LAND_USE;
  if (upper.includes('ACTIVITY') || upper.includes('POI')) return PROVENANCE_DEFINITIONS.ACTIVITY_PROXY;
  if (upper.includes('PREDICT') || upper.includes('FORECAST')) return PROVENANCE_DEFINITIONS.PREDICTED;
  if (upper.includes('COUNTERFACTUAL') || upper.includes('SCENARIO') || upper.includes('SIMULAT')) {
    return PROVENANCE_DEFINITIONS['SCENARIO / SIMULATED'];
  }

  return {
    badge: classification,
    category: 'Derived Metric',
    description: `Dataset provenance: ${classification}`,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  };
}
