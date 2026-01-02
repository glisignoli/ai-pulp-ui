export interface StatusVersion {
  component: string;
  version: string;
  package: string;
  module: string;
  domain_compatible: boolean;
}

export interface StatusApp {
  name: string;
  last_heartbeat: string;
  versions: Record<string, string>;
}

export interface StatusConnection {
  connected: boolean;
}

export interface StatusStorage {
  total: number;
  used: number;
  free: number;
}

export interface StatusContentSettings {
  content_origin: string;
  content_path_prefix: string;
}

export interface PulpStatusResponse {
  versions: StatusVersion[];
  online_workers: StatusApp[];
  online_api_apps: StatusApp[];
  online_content_apps: StatusApp[];
  database_connection: StatusConnection;
  redis_connection: StatusConnection;
  storage: StatusStorage;
  content_settings: StatusContentSettings;
  domain_enabled: boolean;
}
