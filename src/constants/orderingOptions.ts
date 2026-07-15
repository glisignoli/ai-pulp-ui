export type OrderingOption = {
  value: string;
  label: string;
};

const common = {
  pulp_id: { value: 'pulp_id', label: 'Pulp id' },
  pulp_id_desc: { value: '-pulp_id', label: 'Pulp id (descending)' },
  pulp_created: { value: 'pulp_created', label: 'Pulp created' },
  pulp_created_desc: { value: '-pulp_created', label: 'Pulp created (descending)' },
  pulp_last_updated: { value: 'pulp_last_updated', label: 'Pulp last updated' },
  pulp_last_updated_desc: { value: '-pulp_last_updated', label: 'Pulp last updated (descending)' },
  name: { value: 'name', label: 'Name' },
  name_desc: { value: '-name', label: 'Name (descending)' },
  pk: { value: 'pk', label: 'Pk' },
  pk_desc: { value: '-pk', label: 'Pk (descending)' },
} satisfies Record<string, OrderingOption>;

// Repository/remote/distribution/publication ordering fields come from the
// pulpcore base serializers, so every plugin shares the same sets.
export const pluginRepositoryOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  common.name,
  common.name_desc,
  { value: 'description', label: 'Description' },
  { value: '-description', label: 'Description (descending)' },
  { value: 'retain_repo_versions', label: 'Retain repo versions' },
  { value: '-retain_repo_versions', label: 'Retain repo versions (descending)' },
  common.pk,
  common.pk_desc,
];

export const pluginRemoteOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  common.name,
  common.name_desc,
  { value: 'url', label: 'Url' },
  { value: '-url', label: 'Url (descending)' },
  { value: 'policy', label: 'Policy' },
  { value: '-policy', label: 'Policy (descending)' },
  { value: 'username', label: 'Username' },
  { value: '-username', label: 'Username (descending)' },
  { value: 'tls_validation', label: 'Tls validation' },
  { value: '-tls_validation', label: 'Tls validation (descending)' },
  common.pk,
  common.pk_desc,
];

export const pluginDistributionOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  common.name,
  common.name_desc,
  { value: 'base_path', label: 'Base path' },
  { value: '-base_path', label: 'Base path (descending)' },
  { value: 'hidden', label: 'Hidden' },
  { value: '-hidden', label: 'Hidden (descending)' },
  common.pk,
  common.pk_desc,
];

export const pluginPublicationOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  { value: 'complete', label: 'Complete' },
  { value: '-complete', label: 'Complete (descending)' },
  { value: 'pass_through', label: 'Pass through' },
  { value: '-pass_through', label: 'Pass through (descending)' },
  common.pk,
  common.pk_desc,
];

export const debPackageOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  { value: 'package', label: 'Package' },
  { value: '-package', label: 'Package (descending)' },
  { value: 'version', label: 'Version' },
  { value: '-version', label: 'Version (descending)' },
  { value: 'architecture', label: 'Architecture' },
  { value: '-architecture', label: 'Architecture (descending)' },
  { value: 'timestamp_of_interest', label: 'Timestamp of interest' },
  { value: '-timestamp_of_interest', label: 'Timestamp of interest (descending)' },
  common.pk,
  common.pk_desc,
];

export const fileContentOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  { value: 'relative_path', label: 'Relative path' },
  { value: '-relative_path', label: 'Relative path (descending)' },
  { value: 'timestamp_of_interest', label: 'Timestamp of interest' },
  { value: '-timestamp_of_interest', label: 'Timestamp of interest (descending)' },
  common.pk,
  common.pk_desc,
];

export const rpmPackageOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  common.name,
  common.name_desc,
  { value: 'version', label: 'Version' },
  { value: '-version', label: 'Version (descending)' },
  { value: 'release', label: 'Release' },
  { value: '-release', label: 'Release (descending)' },
  { value: 'arch', label: 'Arch' },
  { value: '-arch', label: 'Arch (descending)' },
  { value: 'time_build', label: 'Time build' },
  { value: '-time_build', label: 'Time build (descending)' },
  common.pk,
  common.pk_desc,
];

export const taskOrderingOptions: OrderingOption[] = [
  common.pulp_id,
  common.pulp_id_desc,
  common.pulp_created,
  common.pulp_created_desc,
  common.pulp_last_updated,
  common.pulp_last_updated_desc,
  { value: 'state', label: 'State' },
  { value: '-state', label: 'State (descending)' },
  common.name,
  common.name_desc,
  { value: 'started_at', label: 'Started at' },
  { value: '-started_at', label: 'Started at (descending)' },
  { value: 'finished_at', label: 'Finished at' },
  { value: '-finished_at', label: 'Finished at (descending)' },
  common.pk,
  common.pk_desc,
];
