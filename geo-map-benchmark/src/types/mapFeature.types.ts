export type LngLat = [number, number];

export type PointCategory =
  | 'hospital'
  | 'shelter'
  | 'warehouse'
  | 'emergency-post'
  | 'response-unit';

export type PolygonCategory =
  | 'disaster-area'
  | 'administrative-area'
  | 'operational-zone';

export interface PointFeatureProperties {
  id: string;
  category: PointCategory;
  name: string;
  /** UI-only flag used by feature-selection highlighting (S07). */
  selected?: boolean;
}

export interface PointFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: LngLat };
  properties: PointFeatureProperties;
}

export interface PolygonFeatureProperties {
  id: string;
  category: PolygonCategory;
  name: string;
}

export interface PolygonFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: LngLat[][] };
  properties: PolygonFeatureProperties;
}

export type MapFeature = PointFeature | PolygonFeature;

export interface FeatureCollection<F extends MapFeature = MapFeature> {
  type: 'FeatureCollection';
  features: F[];
}

export type PointFeatureCollection = FeatureCollection<PointFeature>;
export type PolygonFeatureCollection = FeatureCollection<PolygonFeature>;
