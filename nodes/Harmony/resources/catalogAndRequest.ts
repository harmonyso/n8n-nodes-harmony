import type { INodeProperties } from 'n8n-workflow';
import { getManyFields, simplifyField } from '../shared/descriptions';
import { enumOptions } from '../shared/options';
import { CSV_TO_LIST, itemsFrom, paginate, simplify } from '../shared/transport';

// ================================================================ catalog category

const categoryResource = ['catalogCategory'];

export const catalogCategoryDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: categoryResource } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many catalog categories',
				description: 'Retrieve the service catalog categories with their items',
				routing: {
					request: { method: 'GET', url: '/service-catalog/api/v1/categories' },
					output: { postReceive: [itemsFrom('categories')] },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: categoryResource, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Include Discovered Items',
				name: 'includeDiscovered',
				type: 'boolean',
				default: false,
				description: 'Whether to include items discovered automatically but not yet published',
				routing: { send: { type: 'query', property: 'include_discovered' } },
			},
		],
	},
];

// ================================================================ catalog item

const itemResource = ['catalogItem'];
const showItemGet = { resource: itemResource, operation: ['get'] };

export const catalogItemDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: itemResource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get catalog item',
				description: 'Retrieve a service catalog item, including its form fields',
				routing: {
					request: {
						method: 'GET',
						url: '=/service-catalog/api/v1/items/{{ toPathSegment($parameter.itemId) }}',
					},
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'Catalog Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		description: 'The catalog item ID, as returned by Catalog Category > Get Many',
		displayOptions: { show: showItemGet },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showItemGet },
		options: [
			{
				displayName: 'Include Deleted',
				name: 'includeDeleted',
				type: 'boolean',
				default: false,
				description: 'Whether to return the item even if it was deleted',
				routing: { send: { type: 'query', property: 'include_deleted' } },
			},
		],
	},
];

// ================================================================ request (AI conversation)

const requestResource = ['request'];
const REQUESTS = '/agents/api/v1/conversations/requests';
const requestUrl = (suffix = '') =>
	`=${REQUESTS}/{{ toPathSegment($parameter.requestId) }}${suffix}`;

const SIMPLIFIED_FIELDS = [
	'id',
	'employee_id',
	'desk_id',
	'category',
	'source',
	'resolution',
	'summary',
	'ticket_id',
	'queried_at',
	'resolution_at',
];

const showRequestGet = { resource: requestResource, operation: ['get'] };
const showRequestGetAll = { resource: requestResource, operation: ['getAll'] };
const showRequestMessages = { resource: requestResource, operation: ['getMessages'] };

const requestIdField = (show: Record<string, string[]>): INodeProperties => ({
	displayName: 'Request ID',
	name: 'requestId',
	type: 'string',
	required: true,
	default: '',
	description: 'The request ID, as returned by Request > Get Many',
	displayOptions: { show },
});

const includeClassification: INodeProperties = {
	displayName: 'Include Classification',
	name: 'includeClassification',
	type: 'boolean',
	default: false,
	description:
		'Whether to include how the request was classified (relevance, AI and human contribution)',
	routing: { send: { type: 'query', property: 'include_classification' } },
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

export const requestDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: requestResource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get request',
				description: 'Retrieve a request handled by the Harmony AI agent',
				routing: {
					request: { method: 'GET', url: requestUrl() },
					output: { postReceive: [simplify(SIMPLIFIED_FIELDS)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many requests',
				description:
					'Retrieve requests the Harmony AI agent handled across Slack, Teams, the portal and email',
				routing: {
					request: { method: 'GET', url: REQUESTS },
					operations: { pagination: paginate({ style: 'page', pageSize: 200 }) },
					output: { postReceive: [itemsFrom('items'), simplify(SIMPLIFIED_FIELDS)] },
				},
			},
			{
				name: 'Get Messages',
				value: 'getMessages',
				action: 'Get request messages',
				description: 'Retrieve the conversation of a request',
				routing: {
					request: { method: 'GET', url: requestUrl('/messages') },
					output: { postReceive: [itemsFrom('messages')] },
				},
			},
		],
		default: 'getAll',
	},

	// ------------------------------------------------------------ get
	requestIdField(showRequestGet),
	simplifyField(showRequestGet),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showRequestGet },
		options: [includeClassification],
	},

	// ------------------------------------------------------------ get many
	...getManyFields({ show: showRequestGetAll, limitProperty: 'page_size', maxLimit: 200 }),
	simplifyField(showRequestGetAll),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showRequestGetAll },
		options: [
			csvFilter(
				'AI Contribution',
				'aiContribution',
				'ai_contribution',
				'Comma-separated AI contribution values',
			),
			csvFilter('Categories', 'category', 'category', 'Comma-separated request categories'),
			csvFilter(
				'Channels',
				'source',
				'source',
				'Comma-separated channels, e.g. slack, teams, portal, email',
			),
			csvFilter(
				'Classifications',
				'classification',
				'classification',
				'Comma-separated classifications',
			),
			{
				displayName: 'Date From',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				description: 'Only requests made at or after this time',
				routing: { send: { type: 'query', property: 'date_from' } },
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description: 'Only requests made before this time',
				routing: { send: { type: 'query', property: 'date_to' } },
			},
			csvFilter(
				'Departments',
				'department',
				'department',
				'Comma-separated departments of the requesting employee',
			),
			csvFilter(
				'Deflected by KB Article IDs',
				'deflectedKbArticleId',
				'deflected_kb_article_id',
				'Comma-separated knowledge base article IDs that resolved the request',
			),
			csvFilter('Desk IDs', 'deskId', 'desk_id', 'Comma-separated desk slugs'),
			{
				displayName: 'Employee ID',
				name: 'employeeId',
				type: 'string',
				default: '',
				description: 'Only requests from this employee',
				routing: { send: { type: 'query', property: 'employee_id' } },
			},
			csvFilter('Handling', 'handling', 'handling', 'Comma-separated handling values'),
			csvFilter(
				'Human Contribution',
				'humanContribution',
				'human_contribution',
				'Comma-separated human contribution values',
			),
			{ ...includeClassification },
			csvFilter(
				'Outcomes',
				'outcome',
				'outcome',
				'Comma-separated AI outcomes, e.g. ai_resolved_direct, ai_assisted_submitted, manual_ticketed',
			),
			csvFilter(
				'Referenced KB Article IDs',
				'referencedKbArticleId',
				'referenced_kb_article_id',
				'Comma-separated knowledge base article IDs the agent referenced',
			),
			csvFilter('Relevance', 'relevance', 'relevance', 'Comma-separated relevance values'),
			csvFilter(
				'Resolution Feedback',
				'resolutionFeedback',
				'resolution_feedback',
				'Comma-separated resolution feedback values',
			),
			csvFilter(
				'Resolutions',
				'resolution',
				'resolution',
				'Comma-separated values, e.g. resolved_by_harmony, escalated',
			),
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to search for in requests',
				routing: { send: { type: 'query', property: 'search' } },
			},
			csvFilter('Subdesk IDs', 'subdeskId', 'subdesk_id', 'Comma-separated team IDs'),
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'collection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: { show: showRequestGetAll },
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
				routing: { send: { type: 'query', property: 'sort_direction' } },
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: enumOptions([
					['queried_at', 'Request Time'],
					'category',
					'resolution',
					['source', 'Channel'],
				]),
				default: 'queried_at',
				routing: { send: { type: 'query', property: 'sort_by' } },
			},
		],
	},

	// ------------------------------------------------------------ messages
	requestIdField(showRequestMessages),
];
