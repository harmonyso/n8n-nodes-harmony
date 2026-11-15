import type { INodeProperties } from 'n8n-workflow';
import { employeeLocator, getManyFields, simplifyField } from '../shared/descriptions';
import { enumOptions } from '../shared/options';
import { CSV_TO_LIST, itemsFrom, paginate, simplify } from '../shared/transport';

const resource = ['employee'];
const EMPLOYEES = '/employees/api/v1/employees';

const SIMPLIFIED_FIELDS = [
	'id',
	'display_name',
	'work_email',
	'first_name',
	'last_name',
	'job_title',
	'department',
	'location',
	'manager_id',
	'employment_status',
];

const EMPLOYEE_FIELDS = [
	'first_name',
	'last_name',
	'display_name',
	'job_title',
	'department',
	'location',
	'location_details',
	'timezone',
	'manager_name',
	'manager_id',
	'photo_url',
	'phone_numbers',
	'employment_status',
	'employment_start_date',
	'employment_end_date',
	'employment_role',
	'employment_type',
	'level',
	'sync_status',
	'type',
	'settings',
	'custom_fields',
	'custom_fields_with_config',
	'sources',
	'last_login',
	'deleted_at',
];

const showGet = { resource, operation: ['get'] };
const showGetAll = { resource, operation: ['getAll'] };
const showBatch = { resource, operation: ['batchGet'] };

const includeCustomFieldsConfig: INodeProperties = {
	displayName: 'Include Custom Field Definitions',
	name: 'includeCustomFieldsConfig',
	type: 'boolean',
	default: false,
	description: 'Whether to include the definition of each custom field alongside its value',
	routing: { send: { type: 'query', property: 'include_custom_fields_config' } },
};

const csvFilter = (
	displayName: string,
	name: string,
	property: string,
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	description,
	routing: { send: { type: 'query', property, value: CSV_TO_LIST } },
});

const dateFilter = (
	displayName: string,
	name: string,
	property: string,
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'dateTime',
	default: '',
	description,
	routing: {
		send: { type: 'query', property, value: '={{ String($value).slice(0, 10) }}' },
	},
});

export const employeeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Batch Get',
				value: 'batchGet',
				action: 'Batch get employees',
				description: 'Retrieve several employees by ID or work email, in the order given',
				routing: {
					request: { method: 'POST', url: `${EMPLOYEES}/batch_query` },
					output: { postReceive: [itemsFrom('results')] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get employee',
				description: 'Retrieve an employee',
				routing: {
					request: {
						method: 'GET',
						url: `=${EMPLOYEES}/{{ toPathSegment($parameter.employeeId) }}`,
					},
					output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many employees',
				description: 'Retrieve a list of employees synced from your HRIS and identity provider',
				routing: {
					request: { method: 'GET', url: `${EMPLOYEES}/` },
					operations: { pagination: paginate({ style: 'offset', pageSize: 500 }) },
					output: { postReceive: [itemsFrom('items'), simplify(SIMPLIFIED_FIELDS)] },
				},
			},
		],
		default: 'get',
	},

	// ------------------------------------------------------------ get
	employeeLocator('Employee', 'employeeId', showGet),
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
	...getManyFields({ show: showGetAll, limitProperty: 'limit', maxLimit: 10000 }),
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
				displayName: 'Custom Fields',
				name: 'customFieldFilters',
				type: 'json',
				default: '{}',
				description: 'Filter by custom field values, e.g. {"config_id:field_id": ["value"]}',
				routing: {
					send: {
						type: 'query',
						property: 'custom_field_filters',
						value: '={{ typeof $value === "string" ? $value : JSON.stringify($value) }}',
					},
				},
			},
			csvFilter('Departments', 'department', 'department', 'Comma-separated department names'),
			csvFilter('Employee IDs', 'id', 'id', 'Comma-separated employee IDs'),
			{
				displayName: 'Employment Statuses',
				name: 'employmentStatus',
				type: 'multiOptions',
				options: enumOptions(['active', 'inactive', 'terminated', 'other']),
				default: [],
				routing: { send: { type: 'query', property: 'employment_status' } },
			},
			dateFilter(
				'End Date From',
				'employmentEndDateFrom',
				'employment_end_date_from',
				'Only employees whose employment ends on or after this date',
			),
			dateFilter(
				'End Date To',
				'employmentEndDateTo',
				'employment_end_date_to',
				'Only employees whose employment ends on or before this date',
			),
			{
				displayName: 'Include Any Status',
				name: 'anyStatus',
				type: 'boolean',
				default: false,
				description:
					'Whether to include employees in every employment status, not only active ones',
				routing: { send: { type: 'query', property: 'any_status' } },
			},
			{
				displayName: 'Include Deleted',
				name: 'includeDeleted',
				type: 'boolean',
				default: false,
				description: 'Whether to include employees removed from the source directory',
				routing: { send: { type: 'query', property: 'include_deleted' } },
			},
			{ ...includeCustomFieldsConfig },
			{
				displayName: 'Is VIP',
				name: 'isVip',
				type: 'boolean',
				default: false,
				description: 'Whether to only return VIP employees (or only non-VIP ones)',
				routing: { send: { type: 'query', property: 'is_vip' } },
			},
			csvFilter('Levels', 'level', 'level', 'Comma-separated levels'),
			csvFilter('Locations', 'location', 'location', 'Comma-separated locations'),
			csvFilter('Manager IDs', 'managerId', 'manager_id', 'Comma-separated manager employee IDs'),
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Text to search for in names and emails',
				routing: { send: { type: 'query', property: 'q' } },
			},
			dateFilter(
				'Start Date From',
				'employmentStartDateFrom',
				'employment_start_date_from',
				'Only employees who started on or after this date',
			),
			dateFilter(
				'Start Date To',
				'employmentStartDateTo',
				'employment_start_date_to',
				'Only employees who started on or before this date',
			),
			{
				displayName: 'Sync Status',
				name: 'syncStatus',
				type: 'options',
				options: [
					{
						name: 'Synced',
						value: 'SYNCED',
						description: 'Synced from an HRIS or identity provider',
					},
					{ name: 'Local', value: 'LOCAL', description: 'Created in Harmony only' },
				],
				default: 'SYNCED',
				routing: { send: { type: 'query', property: 'sync_status' } },
			},
			{
				displayName: 'Types',
				name: 'type',
				type: 'multiOptions',
				options: enumOptions(['person', 'service_account']),
				default: [],
				routing: { send: { type: 'query', property: 'type' } },
			},
			csvFilter('Work Emails', 'workEmail', 'work_email', 'Comma-separated work email addresses'),
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
				routing: { send: { type: 'query', property: 'custom_field_sort_by' } },
			},
			{
				displayName: 'Custom Field Type',
				name: 'customFieldSortType',
				type: 'options',
				options: enumOptions(['number', 'text']),
				default: 'text',
				description: 'How to compare custom field values',
				routing: { send: { type: 'query', property: 'custom_field_sort_type' } },
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
				routing: { send: { type: 'query', property: 'sort_direction' } },
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: enumOptions(['work_email', 'display_name', 'sync_status', 'type']),
				default: 'work_email',
				routing: { send: { type: 'query', property: 'sort_by' } },
			},
		],
	},

	// ------------------------------------------------------------ batch get
	{
		displayName: 'Look Up By',
		name: 'lookupBy',
		type: 'options',
		options: [
			{ name: 'Employee ID', value: 'id' },
			{ name: 'Work Email', value: 'work_email' },
		],
		default: 'work_email',
		displayOptions: { show: showBatch },
	},
	{
		displayName: 'Values',
		name: 'lookupValues',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com, ana@example.com',
		description: 'Comma-separated employee IDs or work emails. Results keep this order.',
		displayOptions: { show: showBatch },
		routing: {
			send: {
				type: 'body',
				property: 'queries',
				value:
					'={{ String($value).split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => ({ [$parameter.lookupBy]: v })) }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showBatch },
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				options: enumOptions(EMPLOYEE_FIELDS),
				default: [],
				description: 'Fields to return. ID and work email are always returned.',
				routing: { send: { type: 'body', property: 'fields' } },
			},
			{ ...includeCustomFieldsConfig },
		],
	},
];
