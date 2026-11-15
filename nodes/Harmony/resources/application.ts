import type { INodeProperties } from 'n8n-workflow';
import { employeeLocator, getManyFields, simplifyField } from '../shared/descriptions';
import {
	APPLICATION_SOURCES,
	APPLICATION_STATUSES,
	enumOptions,
	STAKEHOLDER_ROLES,
} from '../shared/options';
import {
	CSV_TO_LIST,
	JSON_VALUE,
	deletedResponse,
	paginate,
	itemsFrom,
	simplify,
} from '../shared/transport';

const APPS = '/applications/api/v1/apps';
const appUrl = (suffix = '') => `=${APPS}/{{ toPathSegment($parameter.applicationId) }}${suffix}`;

const SIMPLIFIED_FIELDS = [
	'id',
	'name',
	'display_name',
	'vendor',
	'category',
	'status',
	'access_request',
	'total_users',
	'total_monthly_cost',
	'updated_at',
];

const CATEGORIES: Array<string | [string, string]> = [
	'SALES',
	'MARKETING',
	'SECURITY',
	'ANALYTICS',
	'SOFTWARE_DEVELOPMENT',
	['IT', 'IT'],
	'COLLABORATION',
	['AI_TOOLS', 'AI Tools'],
	'PROJECT_MANAGEMENT',
	['HR', 'HR'],
	'DESIGN',
	'DOCUMENT_WORKFLOW',
	['ERP', 'ERP'],
	'FINANCE_ACCOUNTING',
	'HELPDESK',
	['VPN', 'VPN'],
	'BROWSER',
	'OTHER',
];

const applicationIdField = (show: Record<string, string[]>): INodeProperties => ({
	displayName: 'Application ID',
	name: 'applicationId',
	type: 'string',
	required: true,
	default: '',
	description: 'The application ID, as returned by Application > Get Many',
	displayOptions: { show },
});

const includeCustomFieldsConfig: INodeProperties = {
	displayName: 'Include Custom Field Definitions',
	name: 'includeCustomFieldsConfig',
	type: 'boolean',
	default: false,
	description: 'Whether to include the definition of each custom field alongside its value',
	routing: { send: { type: 'query', property: 'include_custom_fields_config' } },
};

const query = (property: string, value?: string) => ({
	send: value ? { type: 'query' as const, property, value } : { type: 'query' as const, property },
});

// ================================================================ application

const resource = ['application'];
const showGet = { resource, operation: ['get'] };
const showGetAll = { resource, operation: ['getAll'] };
const showUpdate = { resource, operation: ['update'] };

export const applicationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get application',
				description: 'Retrieve an application with its usage and cost data',
				routing: {
					request: { method: 'GET', url: appUrl() },
					output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many applications',
				description: 'Retrieve a list of SaaS and discovered applications',
				routing: {
					request: { method: 'GET', url: APPS },
					operations: { pagination: paginate({ style: 'offset', pageSize: 500 }) },
					output: { postReceive: [itemsFrom('items'), simplify(SIMPLIFIED_FIELDS)] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update application',
				description: "Update an application's status, access requests or custom fields",
				routing: { request: { method: 'PATCH', url: appUrl() } },
			},
		],
		default: 'get',
	},

	// ------------------------------------------------------------ get
	applicationIdField(showGet),
	simplifyField(showGet),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showGet },
		options: [includeCustomFieldsConfig],
	},

	// ------------------------------------------------------------ get many
	...getManyFields({ show: showGetAll, limitProperty: 'limit', maxLimit: 1000 }),
	simplifyField(showGetAll),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showGetAll },
		options: [
			{
				displayName: 'Access Request',
				name: 'accessRequest',
				type: 'multiOptions',
				options: enumOptions(['AVAILABLE', 'UNAVAILABLE']),
				default: [],
				description: 'Whether employees can request access to the application',
				routing: query('access_request'),
			},
			{
				displayName: 'App Owner IDs',
				name: 'appOwnerIds',
				type: 'string',
				default: '',
				description: 'Comma-separated employee IDs of app owners',
				routing: query('app_owner_ids', CSV_TO_LIST),
			},
			{
				displayName: 'Budget Approver IDs',
				name: 'budgetApproverIds',
				type: 'string',
				default: '',
				description: 'Comma-separated employee IDs of budget approvers',
				routing: query('budget_approver_ids', CSV_TO_LIST),
			},
			{
				displayName: 'Categories',
				name: 'category',
				type: 'multiOptions',
				options: enumOptions(CATEGORIES),
				default: [],
				routing: query('category'),
			},
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
				routing: query('created_after'),
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldFilters',
				type: 'json',
				default: '{}',
				description: 'Filter by custom field values, e.g. {"config_id:field_id": ["value"]}',
				routing: query(
					'custom_field_filters',
					'={{ typeof $value === "string" ? $value : JSON.stringify($value) }}',
				),
			},
			{
				displayName: 'Device ID',
				name: 'deviceId',
				type: 'string',
				default: '',
				description: 'Only applications found on this device. Requires the Sources filter.',
				routing: query('device_id'),
			},
			{
				displayName: 'Employee ID',
				name: 'employeeId',
				type: 'string',
				default: '',
				description: 'Only applications this employee has access to',
				routing: query('employee_id'),
			},
			{ ...includeCustomFieldsConfig },
			{
				displayName: 'Include Switched-Off Seats',
				name: 'includeSwitchedOffSeats',
				type: 'boolean',
				default: false,
				description:
					'Whether, with Employee ID, to also match applications the employee holds only through a seat switched off at its source',
				routing: query('include_switched_off_seats'),
			},
			{
				displayName: 'Insight',
				name: 'insight',
				type: 'options',
				options: enumOptions([
					'ghost_users',
					'inactive_users',
					'shadow_apps',
					'inactive_apps',
					'inactive_instances',
					'orphaned_apps',
					'orphaned_instances',
					'impaired_apps',
					'ghost_apps',
				]),
				default: 'shadow_apps',
				description: 'Only applications in this insight category',
				routing: query('insight'),
			},
			{
				displayName: 'IT Approver IDs',
				name: 'itApproverIds',
				type: 'string',
				default: '',
				description: 'Comma-separated employee IDs of IT approvers',
				routing: query('it_approver_ids', CSV_TO_LIST),
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to search for in name, display name, description or vendor',
				routing: query('search'),
			},
			{
				displayName: 'Sources',
				name: 'source',
				type: 'multiOptions',
				options: enumOptions(APPLICATION_SOURCES),
				default: [],
				routing: query('source'),
			},
			{
				displayName: 'Status Page Statuses',
				name: 'statuspageStatus',
				type: 'multiOptions',
				options: enumOptions([
					'OPERATIONAL',
					'UNDER_MAINTENANCE',
					'DEGRADED_PERFORMANCE',
					'PARTIAL_OUTAGE',
					'MAJOR_OUTAGE',
					'NOT_MONITORED',
					'NOT_REACHABLE',
					'FETCH_ERROR',
				]),
				default: [],
				description: "The vendor's service status",
				routing: query('statuspage_status'),
			},
			{
				displayName: 'Statuses',
				name: 'status',
				type: 'multiOptions',
				options: enumOptions(APPLICATION_STATUSES),
				default: [],
				routing: query('status'),
			},
			{
				displayName: 'Vendors',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'Comma-separated vendor names',
				routing: query('vendor', CSV_TO_LIST),
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'collection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: { show: showGetAll },
		options: [
			{
				displayName: 'Custom Field',
				name: 'customFieldSortBy',
				type: 'string',
				default: '',
				placeholder: 'e.g. config_id:field_id',
				description: 'Sort by a custom field instead. Takes precedence over Sort By.',
				routing: query('custom_field_sort_by'),
			},
			{
				displayName: 'Custom Field Type',
				name: 'customFieldSortType',
				type: 'options',
				options: enumOptions(['number', 'text']),
				default: 'text',
				description: 'How to compare custom field values',
				routing: query('custom_field_sort_type'),
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: enumOptions([
					['asc', 'Ascending'],
					['desc', 'Descending'],
				]),
				default: 'asc',
				routing: query('sort_order'),
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: enumOptions([
					'name',
					'display_name',
					'vendor',
					'category',
					'status',
					'access_request',
					'created_at',
					'updated_at',
					'total_users',
					'monthly_cost',
					'total_logins',
					['statuspage_status', 'Status Page Status'],
				]),
				default: 'name',
				routing: query('sort_by'),
			},
		],
	},

	// ------------------------------------------------------------ update
	applicationIdField(showUpdate),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showUpdate },
		options: [
			{
				displayName: 'Access Request',
				name: 'accessRequest',
				type: 'options',
				options: enumOptions(['AVAILABLE', 'UNAVAILABLE']),
				default: 'AVAILABLE',
				description: 'Whether employees can request access to the application',
				routing: { send: { type: 'body', property: 'access_request' } },
			},
			{
				displayName: 'Contract End Date',
				name: 'contractEndDateOverride',
				type: 'dateTime',
				default: '',
				description: "Pin the end of the application's contract to this date",
				routing: {
					send: {
						type: 'body',
						property: 'contract_end_date_override',
						value: '={{ String($value).slice(0, 10) }}',
					},
				},
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'json',
				default: '{}',
				description:
					'Custom field values to merge, e.g. {"config_ID": {"field_ID": "value"}}. A null value clears the field.',
				routing: { send: { type: 'body', property: 'custom_fields', value: JSON_VALUE } },
			},
			{
				displayName: 'Primary Sources',
				name: 'primarySources',
				type: 'multiOptions',
				options: enumOptions(APPLICATION_SOURCES),
				default: [],
				description: 'Sources to treat as the source of truth. Leave empty to use every source.',
				routing: { send: { type: 'body', property: 'primary_sources' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: enumOptions(APPLICATION_STATUSES),
				default: 'APPROVED',
				routing: { send: { type: 'body', property: 'status' } },
			},
		],
	},
];

// ================================================================ application stakeholder

const stakeholderResource = ['applicationStakeholder'];
const showAdd = { resource: stakeholderResource, operation: ['add'] };
const showStakeholders = { resource: stakeholderResource, operation: ['getAll'] };
const showRemove = { resource: stakeholderResource, operation: ['remove'] };

const roleField = (
	show: Record<string, string[]>,
	routing?: INodeProperties['routing'],
): INodeProperties => ({
	displayName: 'Role',
	name: 'role',
	type: 'options',
	required: true,
	options: enumOptions(STAKEHOLDER_ROLES),
	default: 'APP_OWNER',
	displayOptions: { show },
	...(routing ? { routing } : {}),
});

export const applicationStakeholderDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: stakeholderResource } },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add application stakeholder',
				description: 'Make an employee an owner or approver of an application',
				routing: { request: { method: 'POST', url: appUrl('/stakeholders') } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many application stakeholders',
				description: "Retrieve an application's owners and approvers",
				routing: { request: { method: 'GET', url: appUrl('/stakeholders') } },
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove application stakeholder',
				description: 'Remove an owner or approver from an application',
				routing: {
					request: {
						method: 'DELETE',
						url: appUrl(
							'/stakeholders/{{ toPathSegment($parameter.employeeId) }}/{{ toPathSegment($parameter.role) }}',
						),
					},
					output: { postReceive: [deletedResponse] },
				},
			},
		],
		default: 'add',
	},
	applicationIdField(showAdd),
	employeeLocator('Employee', 'employeeId', showAdd, {
		routing: { send: { type: 'body', property: 'employee_id' } },
	}),
	roleField(showAdd, { send: { type: 'body', property: 'role' } }),
	applicationIdField(showStakeholders),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showStakeholders },
		options: [
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				options: enumOptions(STAKEHOLDER_ROLES),
				default: 'APP_OWNER',
				routing: query('role'),
			},
		],
	},
	applicationIdField(showRemove),
	employeeLocator('Employee', 'employeeId', showRemove),
	roleField(showRemove),
];
