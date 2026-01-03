export interface Distribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url?: string;
  content_guard?: string | null;
  hidden?: boolean;
  repository?: string | null;
  repository_version?: string | null;
  publication?: string | null;
  private?: boolean;
  description?: string | null;
  generate_repo_config?: boolean;
  checkpoint?: boolean;
  pulp_labels?: { [key: string]: string };
}

export interface Publication {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  repository_version?: string;
  repository?: string;
  checkpoint?: boolean;
  manifest?: string;
  checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  metadata_checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  package_checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  gpgcheck?: number;
  repo_gpgcheck?: number;
  sqlite_metadata?: boolean;
  repo_config?: any;
  compression_type?: 'zstd' | 'gz';
  layout?: 'nested_alphabetically' | 'flat';
}

export interface Remote {
  pulp_href: string;
  name: string;
  url: string;
}

export interface Repository {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  versions_href?: string;
  latest_version_href?: string;
  name: string;
  description?: string;
  retain_repo_versions?: number;
  remote?: string;
  manifest_signing_service?: string;
  manifest?: string;
  autopublish?: boolean;
  metadata_signing_service?: string;
  package_signing_service?: string;
  package_signing_fingerprint?: string;
  retain_package_versions?: number;
  checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  metadata_checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  package_checksum_type?: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  gpgcheck?: number;
  repo_gpgcheck?: number;
  sqlite_metadata?: boolean;
  repo_config?: any;
  compression_type?: 'zstd' | 'gz';
  layout?: 'nested_alphabetically' | 'flat';
  pulp_labels?: { [key: string]: string };
  signing_service_release_overrides?: { [key: string]: string };
}

export interface RepositoryVersion {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  number?: number;
  repository?: string;
  base_version?: string;
  content_summary?: any;
}

export interface FileContent {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  pulp_labels?: { [key: string]: string };
  vuln_report?: string;
  artifact?: string;
  relative_path: string;
  md5?: string;
  sha1?: string;
  sha224?: string;
  sha256?: string;
  sha384?: string;
  sha512?: string;
}

export interface RpmPackage {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;

  name: string;
  epoch?: string;
  version: string;
  release: string;
  arch: string;

  pkgId?: string;
  checksum_type?: string;
  sha256?: string;

  summary?: string;
  description?: string;
  url?: string;

  location_base?: string;
  location_href?: string;

  artifact?: string;
  is_modular?: boolean;
}

export interface DebPackage {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;

  package: string;
  version: string;
  architecture: string;

  section?: string;
  maintainer?: string;
  description?: string;
}

export interface Remote {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  name: string;
  url: string;
  upstream_name?: string;
  ca_cert?: string;
  client_cert?: string;
  client_key?: string;
  tls_validation?: boolean;
  proxy_url?: string;
  proxy_username?: string;
  proxy_password?: string;
  username?: string;
  password?: string;
  pulp_labels?: { [key: string]: string };
  download_concurrency?: number;
  max_retries?: number;
  policy?: 'immediate' | 'on_demand' | 'streamed';
  total_timeout?: number;
  connect_timeout?: number;
  sock_connect_timeout?: number;
  sock_read_timeout?: number;
  headers?: { [key: string]: string };
  rate_limit?: number;
  hidden_fields?: Array<{ name: string; is_set: boolean }>;
  sles_auth_token?: string;
  include_tags?: string[];
  exclude_tags?: string[];
  sigstore?: string;
}

export interface PulpListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Task {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;

  state?: string;
  name?: string;
  started_at?: string | null;
  finished_at?: string | null;

  worker?: string | null;
  error?: any;

  // Tasks can include task-specific fields; keep the model flexible.
  [key: string]: any;
}

export interface PulpUser {
  pulp_href: string;
  prn?: string;
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined?: string;
  groups?: unknown[];
  hidden_fields?: Array<{ name: string; is_set: boolean }>;
}
