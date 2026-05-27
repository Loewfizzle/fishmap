/// <reference types="vite/client" />

// Allow importing the PR1 sample GeoJSON (static data) from TS without extra files
declare module "*.geojson" {
  const value: any;
  export default value;
}
