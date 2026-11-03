export type GeoGroup = {
  id: string
  name: string
  countries: string[]
}

export type GeoGroupRequest = {
  name: string
  countries: string[]
}

export type RegionAdminView = {
  countries: string[]
  groups: GeoGroup[]
}

export type ClusterView = {
  countries: string[]
  groups: GeoGroup[]
}

export type CountryCatalog = {
  countries: string[]
}

export type GroupCatalog = {
  groups: GeoGroup[]
}
