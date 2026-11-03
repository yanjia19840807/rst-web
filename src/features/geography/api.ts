import { apiRequest } from '@/api/client'

import type {
  ClusterView,
  CountryCatalog,
  GeoGroup,
  GeoGroupRequest,
  GroupCatalog,
  RegionAdminView,
} from './types'

const reportBase = '/api/v1/geography'
const regionBase = '/api/v1/admin/regions'
const clusterBase = '/api/v1/clusters'

export const geographyApi = {
  countries: () => apiRequest<CountryCatalog>(`${reportBase}/countries`),
  regions: () => apiRequest<GroupCatalog>(`${reportBase}/regions`),
  listRegions: () => apiRequest<RegionAdminView>(regionBase),
  createRegion: (body: GeoGroupRequest) =>
    apiRequest<GeoGroup>(regionBase, { method: 'POST', body: JSON.stringify(body) }),
  updateRegion: (id: string, body: GeoGroupRequest) =>
    apiRequest<GeoGroup>(`${regionBase}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRegion: (id: string) => apiRequest<void>(`${regionBase}/${id}`, { method: 'DELETE' }),
  listClusters: () => apiRequest<ClusterView>(clusterBase),
  createCluster: (body: GeoGroupRequest) =>
    apiRequest<GeoGroup>(clusterBase, { method: 'POST', body: JSON.stringify(body) }),
  updateCluster: (id: string, body: GeoGroupRequest) =>
    apiRequest<GeoGroup>(`${clusterBase}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCluster: (id: string) => apiRequest<void>(`${clusterBase}/${id}`, { method: 'DELETE' }),
}
