export interface DurationType {
  duration_seconds?: number;
  duration_formatted?: string;
}
export interface MetadataType {
  album?: string;
  artist?: string;
  title?: string;
  year?: string;
  image?: string;
  path?: string;
  duration?: DurationType;
}

export interface PlaylistType {
  id: string;
  name: string;
  songs: MetadataType[];
}
