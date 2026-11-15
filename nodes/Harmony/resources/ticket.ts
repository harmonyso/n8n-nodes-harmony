import type { INodeProperties } from 'n8n-workflow';
import {
	deskLocator,
	employeeLocator,
	getManyFields,
	idempotencyKeyOption,
	simplifyField,
	ticketIdField,
} from '../shared/descriptions';
import {
	enumOptions,
	TICKET_PRIORITIES,
	TICKET_SOURCES,
	TICKET_STATUSES,
	TICKET_TYPES,
	TICKET_TYPES_CREATE,
} from '../shared/options';
import { CSV_TO_LIST, JSON_VALUE, itemsFrom, paginate, simplify } from '../shared/transport';

const resource = ['ticket'];
const TICKETS = '/service-desk/api/v1/tickets';

const SIMPLIFIED_FIELDS = [
	'id',
	'display_id',
	'title',
	'status',
	'priority',
	'ticket_type',
	'desk_id',
	'reporter',
	'assignee',
	'created_at',
];

/** URL of one ticket, optionally followed by a sub-path such as "/activity" */
const ticketUrl = (suffix = '') => `=${TICKETS}/{{ toPathSegment($parameter.ticketId) }}${suffix}`;

const operations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource } },
	options: [
		{
			name: 'Create',
			value: 'create',
			action: 'Create ticket',
			description: 'Create a new ticket',
			routing: {
				request: { method: 'POST', url: `${TICKETS}/` },
				output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
			},
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get ticket',
			description: 'Retrieve a ticket',
			routing: {
				request: { method: 'GET', url: ticketUrl() },
				output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
			},
		},
		{
			name: 'Get Activity',
			value: 'getActivity',
			action: 'Get ticket activity',
			description: 'Retrieve the activity log of a ticket',
			routing: {
				request: { method: 'GET', url: ticketUrl('/activity') },
				operations: { pagination: paginate({ style: 'offset', pageSize: 200 }) },
				output: { postReceive: [itemsFrom('items')] },
			},
		},
		{
			name: 'Get Custom Fields',
			value: 'getCustomFields',
			action: 'Get ticket custom fields',
			description: "Retrieve a ticket's custom field values for its current desk",
			routing: {
				request: { method: 'GET', url: ticketUrl('/custom-fields') },
			},
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many tickets',
			description: 'Retrieve a list of tickets',
			routing: {
				request: { method: 'GET', url: `${TICKETS}/` },
				operations: { pagination: paginate({ style: 'page', pageSize: 100 }) },
				output: { postReceive: [itemsFrom('items'), simplify(SIMPLIFIED_FIELDS)] },
			},
		},
		{
			name: 'Search',
			value: 'search',
			action: 'Search tickets',
			description: 'Search tickets with filters, including ticket metadata',
			routing: {
				request: { method: 'POST', url: `${TICKETS}/query` },
				operations: {
					pagination: paginate({ style: 'page', location: 'body', pageSize: 100 }),
				},
				output: { postReceive: [itemsFrom('items'), simplify(SIMPLIFIED_FIELDS)] },
			},
		},
		{
			name: 'Set Custom Fields',
			value: 'setCustomFields',
			action: 'Set ticket custom fields',
			description: "Set a ticket's custom field values for its current desk",
			routing: {
				request: { method: 'PUT', url: ticketUrl('/custom-fields') },
			},
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update ticket',
			description: 'Update a ticket',
			routing: {
				request: { method: 'PATCH', url: ticketUrl() },
				output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
			},
		},
		{
			name: 'Update Many',
			value: 'updateMany',
			action: 'Update many tickets',
			description: 'Apply the same priority, status or assignee to several tickets at once',
			routing: {
				request: { method: 'POST', url: `${TICKETS}/bulk-update` },
			},
		},
	],
	default: 'create',
};

// ---------------------------------------------------------------- create

const showCreate = { resource, operation: ['create'] };

const createFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Laptop will not turn on',
		displayOptions: { show: showCreate },
		routing: { send: { type: 'body', property: 'title' } },
	},
	deskLocator('deskId', showCreate, {
		description: 'The desk to open the ticket in',
		routing: { send: { type: 'body', property: 'desk_id' } },
	}),
	employeeLocator('Reporter', 'reporter', showCreate, {
		description: 'The employee the ticket is for',
		routing: { send: { type: 'body', property: 'reporter' } },
	}),
	{
		displayName: 'Ticket Type',
		name: 'ticketType',
		type: 'options',
		required: true,
		options: enumOptions(TICKET_TYPES_CREATE),
		default: 'request',
		displayOptions: { show: showCreate },
		routing: { send: { type: 'body', property: 'ticket_type' } },
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'options',
		required: true,
		options: enumOptions(TICKET_PRIORITIES),
		default: 'medium',
		displayOptions: { show: showCreate },
		routing: { send: { type: 'body', property: 'priority' } },
	},
	simplifyField(showCreate),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showCreate },
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
				description: 'Employee ID of the agent to assign the ticket to',
				routing: { send: { type: 'body', property: 'assignee' } },
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of previously uploaded attachments',
				routing: { send: { type: 'body', property: 'attachment_ids', value: CSV_TO_LIST } },
			},
			{
				displayName: 'Checklist',
				name: 'checklist',
				type: 'json',
				default: '[]',
				description:
					'Checklist items for task tickets, e.g. [{"text": "Order laptop", "completed": false}]',
				routing: { send: { type: 'body', property: 'checklist', value: JSON_VALUE } },
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'json',
				default: '{}',
				description: "Custom field values for the ticket's desk, keyed by field ID",
				routing: { send: { type: 'body', property: 'custom_fields', value: JSON_VALUE } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			idempotencyKeyOption,
			{
				displayName: 'Related Asset IDs',
				name: 'relatedAssetIds',
				type: 'string',
				default: '',
				description: 'Comma-separated asset UUIDs to link to the ticket',
				routing: {
					send: { type: 'body', property: 'related_asset_ids', value: CSV_TO_LIST },
				},
			},
			{
				displayName: 'Service Catalog Item ID',
				name: 'serviceCatalogItemId',
				type: 'string',
				default: '',
				description: 'The catalog item the ticket was requested from',
				routing: { send: { type: 'body', property: 'service_catalog_item_id' } },
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: enumOptions(TICKET_SOURCES),
				default: 'harmony',
				description: 'The channel the ticket came from',
				routing: { send: { type: 'body', property: 'source' } },
			},
			{
				displayName: 'Subdesk ID',
				name: 'subdeskId',
				type: 'string',
				default: '',
				description: 'The team to route the ticket to. Routing is automatic when empty.',
				routing: { send: { type: 'body', property: 'subdesk_id' } },
			},
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				default: '',
				description: 'An existing conversation thread to attach. A new one is created when empty.',
				routing: { send: { type: 'body', property: 'thread_id' } },
			},
			{
				displayName: 'Ticket Metadata',
				name: 'ticketMetadata',
				type: 'json',
				default: '{}',
				description: 'Free-form metadata to store on the ticket. Searchable with Ticket > Search.',
				routing: { send: { type: 'body', property: 'ticket_metadata', value: JSON_VALUE } },
			},
		],
	},
];

// ---------------------------------------------------------------- get

const showGet = { resource, operation: ['get'] };

const getFields: INodeProperties[] = [
	ticketIdField(showGet),
	simplifyField(showGet),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showGet },
		options: [
			{
				displayName: 'Include AI Insights',
				name: 'includeAiInsights',
				type: 'boolean',
				default: false,
				description: 'Whether to include AI category insights from auto-tagging',
				routing: { send: { type: 'query', property: 'include_ai_insights' } },
			},
			{
				displayName: 'Include Harmony Ticket Links',
				name: 'includeHarmonyTicketLinks',
				type: 'boolean',
				default: false,
				description:
					'Whether to include links to other Harmony tickets (related, parent, child, blocking, duplicate)',
				routing: { send: { type: 'query', property: 'include_harmony_ticket_links' } },
			},
			{
				displayName: 'Include Linked External Tickets',
				name: 'includeLinkedTickets',
				type: 'boolean',
				default: false,
				description: 'Whether to include linked tickets in external ITSM tools',
				routing: { send: { type: 'query', property: 'include_linked_tickets' } },
			},
		],
	},
];

// ---------------------------------------------------------------- get many / search

function ticketFilters(operation: string, type: 'query' | 'body'): INodeProperties[] {
	const show = { resource, operation: [operation] };
	const send = (property: string, value?: string) => ({
		send: value ? { type, property, value } : { type, property },
	});

	const filters: INodeProperties[] = [
		{
			displayName: 'Assignee IDs',
			name: 'assignee',
			type: 'string',
			default: '',
			description: 'Comma-separated assignee employee IDs. Use _UNASSIGN_ for unassigned tickets.',
			routing: send('assignee', CSV_TO_LIST),
		},
		{
			displayName: 'Auto-Tag Categories',
			name: 'autoTagCategories',
			type: 'string',
			default: '',
			description: 'Comma-separated auto-tag categories',
			routing: send('auto_tag_categories', CSV_TO_LIST),
		},
		{
			displayName: 'Auto-Tag Entities',
			name: 'autoTagEntities',
			type: 'string',
			default: '',
			description: 'Comma-separated auto-tag entities',
			routing: send('auto_tag_entities', CSV_TO_LIST),
		},
		{
			displayName: 'Auto-Tag Symptoms',
			name: 'autoTagSymptoms',
			type: 'string',
			default: '',
			description: 'Comma-separated auto-tag symptoms',
			routing: send('auto_tag_symptoms', CSV_TO_LIST),
		},
		{
			displayName: 'Created After',
			name: 'createdAfter',
			type: 'dateTime',
			default: '',
			description: 'Only tickets created at or after this time',
			routing: send('created_after'),
		},
		{
			displayName: 'Created Before',
			name: 'createdBefore',
			type: 'dateTime',
			default: '',
			description: 'Only tickets created before this time',
			routing: send('created_before'),
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Text to search for in the ticket description',
			routing: send('description'),
		},
		{
			displayName: 'Desk IDs',
			name: 'deskId',
			type: 'string',
			default: '',
			placeholder: 'e.g. it-desk, hr',
			description: 'Comma-separated desk slugs',
			routing: send('desk_id', CSV_TO_LIST),
		},
		{
			displayName: 'Priorities',
			name: 'priority',
			type: 'multiOptions',
			options: enumOptions(TICKET_PRIORITIES),
			default: [],
			routing: send('priority'),
		},
		{
			displayName: 'Reporter IDs',
			name: 'reporter',
			type: 'string',
			default: '',
			description: 'Comma-separated reporter employee IDs',
			routing: send('reporter', CSV_TO_LIST),
		},
		{
			displayName: 'Reporter Locations',
			name: 'locationReporter',
			type: 'string',
			default: '',
			description: "Comma-separated locations of the ticket's reporter",
			routing: send('location_reporter', CSV_TO_LIST),
		},
		{
			displayName: 'Reporter Is VIP',
			name: 'vipReporter',
			type: 'boolean',
			default: false,
			description: 'Whether to only return tickets whose reporter is (or is not) a VIP',
			routing: send('vip_reporter'),
		},
		{
			displayName: 'Resolved After',
			name: 'resolvedAfter',
			type: 'dateTime',
			default: '',
			description: 'Only tickets resolved at or after this time',
			routing: send('resolved_after'),
		},
		{
			displayName: 'Resolved Before',
			name: 'resolvedBefore',
			type: 'dateTime',
			default: '',
			description: 'Only tickets resolved before this time',
			routing: send('resolved_before'),
		},
		{
			displayName: 'Service Catalog Item IDs',
			name: 'serviceCatalogItemIds',
			type: 'string',
			default: '',
			description: 'Comma-separated catalog item IDs the tickets were requested from',
			routing: send('service_catalog_item_ids', CSV_TO_LIST),
		},
		{
			displayName: 'Sources',
			name: 'source',
			type: 'multiOptions',
			options: enumOptions(TICKET_SOURCES),
			default: [],
			routing: send('source'),
		},
		{
			displayName: 'Statuses',
			name: 'status',
			type: 'multiOptions',
			options: enumOptions(TICKET_STATUSES),
			default: [],
			routing: send('status'),
		},
		{
			displayName: 'Subdesk IDs',
			name: 'subdeskId',
			type: 'string',
			default: '',
			description: 'Comma-separated team IDs. Use _UNASSIGN_ for the main team.',
			routing: send('subdesk_id', CSV_TO_LIST),
		},
		{
			displayName: 'Tag Names',
			name: 'tagNames',
			type: 'string',
			default: '',
			description: 'Comma-separated tag names',
			routing: send('tag_names', CSV_TO_LIST),
		},
		{
			displayName: 'Ticket Types',
			name: 'ticketType',
			type: 'multiOptions',
			options: enumOptions(TICKET_TYPES),
			default: [],
			routing: send('ticket_type'),
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Text to search for in the ticket title',
			routing: send('title'),
		},
		{
			displayName: 'Updated After',
			name: 'updatedAfter',
			type: 'dateTime',
			default: '',
			description: 'Only tickets updated at or after this time',
			routing: send('updated_after'),
		},
		{
			displayName: 'Updated Before',
			name: 'updatedBefore',
			type: 'dateTime',
			default: '',
			description: 'Only tickets updated before this time',
			routing: send('updated_before'),
		},
		{
			displayName: 'Watcher IDs',
			name: 'watcherIds',
			type: 'string',
			default: '',
			description: 'Comma-separated employee IDs watching the tickets',
			routing: send('watcher_ids', CSV_TO_LIST),
		},
	];

	if (type === 'body') {
		filters.push({
			displayName: 'Metadata',
			name: 'metadataFilters',
			type: 'json',
			default: '{}',
			description: 'Only tickets whose metadata contains these key-value pairs',
			routing: send('metadata_filters', JSON_VALUE),
		});
		filters.sort((a, b) => a.displayName.localeCompare(b.displayName));
	}

	return [
		...getManyFields({ show, limitProperty: 'page_size', maxLimit: 10000, location: type }),
		simplifyField(show),
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			displayOptions: { show },
			options: filters,
		},
		{
			displayName: 'Sort',
			name: 'sort',
			type: 'collection',
			placeholder: 'Add Sort Rule',
			default: {},
			displayOptions: { show },
			options: [
				{
					displayName: 'Direction',
					name: 'direction',
					type: 'options',
					options: enumOptions([
						['asc', 'Ascending'],
						['desc', 'Descending'],
					]),
					default: 'desc',
					routing: send('sort_direction'),
				},
				{
					displayName: 'Sort By',
					name: 'sortBy',
					type: 'options',
					options: enumOptions([
						'title',
						'priority',
						'source',
						'status',
						'created_at',
						'resolved_at',
						'updated_at',
						'resolution_sla',
						'relevance',
					]),
					default: 'created_at',
					routing: send('sort_by'),
				},
			],
		},
	];
}

// ---------------------------------------------------------------- update

const showUpdate = { resource, operation: ['update'] };

const updateFields: INodeProperties[] = [
	ticketIdField(showUpdate),
	simplifyField(showUpdate),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showUpdate },
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
				description: 'Employee ID of the new assignee. Use _UNASSIGN_ to unassign.',
				routing: { send: { type: 'body', property: 'assignee' } },
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of previously uploaded attachments to link',
				routing: { send: { type: 'body', property: 'attachment_ids', value: CSV_TO_LIST } },
			},
			{
				displayName: 'Checklist',
				name: 'checklist',
				type: 'json',
				default: '[]',
				description: 'Replaces the whole checklist. Send [] to clear it.',
				routing: { send: { type: 'body', property: 'checklist', value: JSON_VALUE } },
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'json',
				default: '{}',
				description: 'Custom field values for the current or new desk, keyed by field ID',
				routing: { send: { type: 'body', property: 'custom_fields', value: JSON_VALUE } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Desk ID',
				name: 'deskId',
				type: 'string',
				default: '',
				placeholder: 'e.g. it-desk',
				description: 'Slug of the desk to move the ticket to',
				routing: { send: { type: 'body', property: 'desk_id' } },
			},
			{
				displayName: 'Expected Status',
				name: 'expectedStatus',
				type: 'options',
				options: enumOptions(TICKET_STATUSES),
				default: 'open',
				description:
					'Only apply the update if the ticket is still in this status. Prevents overwriting a concurrent change.',
				routing: { send: { type: 'body', property: 'expected_status' } },
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: enumOptions(TICKET_PRIORITIES),
				default: 'medium',
				routing: { send: { type: 'body', property: 'priority' } },
			},
			{
				displayName: 'Reporter ID',
				name: 'reporter',
				type: 'string',
				default: '',
				description: 'Employee ID of the new reporter',
				routing: { send: { type: 'body', property: 'reporter' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: enumOptions(TICKET_STATUSES),
				default: 'open',
				routing: { send: { type: 'body', property: 'status' } },
			},
			{
				displayName: 'Subdesk ID',
				name: 'subdeskId',
				type: 'string',
				default: '',
				description: 'Team to move the ticket to. Use "main" to remove it from a specific team.',
				routing: { send: { type: 'body', property: 'subdesk_id' } },
			},
			{
				displayName: 'Ticket Metadata',
				name: 'ticketMetadata',
				type: 'json',
				default: '{}',
				routing: { send: { type: 'body', property: 'ticket_metadata', value: JSON_VALUE } },
			},
			{
				displayName: 'Ticket Type',
				name: 'ticketType',
				type: 'options',
				options: enumOptions(TICKET_TYPES),
				default: 'request',
				routing: { send: { type: 'body', property: 'ticket_type' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'title' } },
			},
			{
				displayName: 'Transfer Reason',
				name: 'transferReason',
				type: 'options',
				options: enumOptions([
					'specialized_expertise_required',
					'workload_balancing',
					'escalation_or_complexity_change',
					'ownership_or_responsibility_boundaries',
					'incorrect_initial_categorization',
				]),
				default: 'workload_balancing',
				description: 'Why the ticket is moving to another team',
				routing: { send: { type: 'body', property: 'transfer_reason' } },
			},
		],
	},
];

// ---------------------------------------------------------------- update many

const showUpdateMany = { resource, operation: ['updateMany'] };

const updateManyFields: INodeProperties[] = [
	{
		displayName: 'Ticket IDs',
		name: 'ticketIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. INC-101, INC-102',
		description: 'Comma-separated ticket IDs to update',
		displayOptions: { show: showUpdateMany },
		routing: { send: { type: 'body', property: 'ticket_ids', value: CSV_TO_LIST } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showUpdateMany },
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
				description: 'Employee ID of the new assignee. Use _UNASSIGN_ to unassign.',
				routing: { send: { type: 'body', property: 'assignee' } },
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: enumOptions(TICKET_PRIORITIES),
				default: 'medium',
				routing: { send: { type: 'body', property: 'priority' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: enumOptions(TICKET_STATUSES),
				default: 'open',
				routing: { send: { type: 'body', property: 'status' } },
			},
		],
	},
];

// ---------------------------------------------------------------- activity & custom fields

const showActivity = { resource, operation: ['getActivity'] };
const showGetCustomFields = { resource, operation: ['getCustomFields'] };
const showSetCustomFields = { resource, operation: ['setCustomFields'] };

const otherFields: INodeProperties[] = [
	ticketIdField(showActivity),
	...getManyFields({ show: showActivity, limitProperty: 'limit', maxLimit: 200 }),
	ticketIdField(showGetCustomFields),
	ticketIdField(showSetCustomFields),
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'json',
		required: true,
		default: '{}',
		description: "Custom field values for the ticket's current desk, keyed by field ID",
		displayOptions: { show: showSetCustomFields },
		routing: { send: { type: 'body', property: 'custom_fields', value: JSON_VALUE } },
	},
];

export const ticketDescription: INodeProperties[] = [
	operations,
	...createFields,
	...getFields,
	...ticketFilters('getAll', 'query'),
	...ticketFilters('search', 'body'),
	...updateFields,
	...updateManyFields,
	...otherFields,
];
