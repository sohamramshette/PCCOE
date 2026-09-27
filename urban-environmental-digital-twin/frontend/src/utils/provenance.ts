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
    color: '#047857',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  REANALYSIS: {
    badge: 'REANALYSIS',
    category: 'Numerical Assimilation',
    description: 'ECMWF ERA5-Land atmospheric model numerical reanalysis; not in-situ physical readings.',
    color: '#1d4ed8',
    bgColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  STATIC_ROAD_NETWORK: {
    badge: 'STATIC_ROAD',
    category: 'Spatial Infrastructure Snapshot',
    description: 'OpenStreetMap vector road network topology within 1.5 km station buffer; static geometry.',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.08)',
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  TRAFFIC_PROXY: {
    badge: 'TRAFFIC_PROXY',
    category: 'Empirical Diurnal Index',
    description: 'Diurnal traffic intensity profile (0.0 to 1.0) derived from Pune CMP; not vehicle counts.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  STATIC_INDUSTRIAL: {
    badge: 'STATIC_INDUSTRIAL',
    category: 'Spatial Infrastructure Snapshot',
    description: 'OpenStreetMap industrial facility locations within 2.0 km; proxy for proximity.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  INDUSTRIAL_PROXY: {
    badge: 'INDUSTRIAL_PROXY',
    category: 'Spatial Proximity Proxy',
    description: 'Industrial facility density/proximity proxy; not measured factory stack emissions.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  CONSTRUCTION_PROXY: {
    badge: 'CONSTRUCTION_PROXY',
    category: 'Spatial Proximity Proxy',
    description: 'Civil construction & flyover works within 1.5 km; proxy for localized fugitive dust risk.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  STATIC_LAND_USE: {
    badge: 'STATIC_LAND_USE',
    category: 'Spatial Zoning Snapshot',
    description: 'Zoning polygons (residential, commercial, industrial, green) from OpenStreetMap.',
    color: '#1d4ed8',
    bgColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  ACTIVITY_PROXY: {
    badge: 'ACTIVITY_PROXY',
    category: 'Spatial Density Proxy',
    description: 'Commercial and transit points of interest (POIs); proxy for urban human activity.',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.08)',
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  PREDICTED: {
    badge: 'PREDICTED',
    category: 'ML Next-Hour Forecast',
    description: 'Statistical machine learning model estimate for t+1; conditional on historical features.',
    color: '#1d4ed8',
    bgColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  'SCENARIO / SIMULATED': {
    badge: 'SCENARIO / SIMULATED',
    category: 'Counterfactual Simulation',
    description: 'Model-derived counterfactual estimate under hypothetical policy intervention; not a causal measurement.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  MODEL_COUNTERFACTUAL_ESTIMATE: {
    badge: 'SIMULATED',
    category: 'Counterfactual Model Output',
    description: 'Model-derived counterfactual estimate under hypothetical policy intervention; not a causal measurement.',
    color: '#c2410c',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
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
