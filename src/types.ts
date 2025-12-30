export interface DurationType {
  duration_seconds?: string | number;
  duration_formatted?: string;
}
export interface MetadataType {
  album?: string;
  artist?: string;
  title?: string;
  year?: string;
  image?: string;
  duration?: DurationType;
}
