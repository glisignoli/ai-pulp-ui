export interface Distribution {
  pulp_href: string;
  name: string;
  base_path: string;
  content_guard?: string;
}

export interface Publication {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  repository_version?: string;
  repository?: string;
  checkpoint?: boolean;
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
}

export interface Remote {
  pulp_href: string;
  prn?: string;
  pulp_created?: string;
  pulp_last_updated?: string;
  name: string;
  url: string;
  ca_cert?: string;
  client_cert?: string;
  tls_validation?: boolean;
  proxy_url?: string;
  pulp_labels?: { [key: string]: string };
  download_concurrency?: number;
  max_retries?: number;
  policy?: 'immediate' | 'on_demand' | 'streamed';
  total_timeout?: number;
  connect_timeout?: number;
  sock_connect_timeout?: number;
  sock_read_timeout?: number;
  headers?: Array<{ [key: string]: string }>;
  rate_limit?: number;
  hidden_fields?: Array<{ name: string; is_set: boolean }>;
  sles_auth_token?: string;
}

export interface PulpListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
