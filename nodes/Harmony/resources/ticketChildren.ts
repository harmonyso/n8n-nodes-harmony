import type { INodeProperties } from 'n8n-workflow';
import {
	employeeLocator,
	getManyFields,
	idempotencyKeyOption,
	ticketIdField,
} from '../shared/descriptions';
import { enumOptions } from '../shared/options';
import { CSV_TO_LIST, deletedResponse, itemsFrom, paginate } from '../shared/transport';

const ticketUrl = (suffix: string) =>
	`=/service-desk/api/v1/tickets/{{ toPathSegment($parameter.ticketId) }}${suffix}`;

// ================================================================ ticket message

const messageResource = ['ticketMessage'];
const showMessageCreate = { resource: messageResource, operation: ['create'] };
const showMessageGetAll = { resource: messageResource, operation: ['getAll'] };

export const ticketMessageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: messageResource } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create ticket message',
				description: 'Add a reply or internal note to a ticket',
				routing: { request: { method: 'POST', url: ticketUrl('/messages') } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many ticket messages',
				description: "Retrieve a ticket's conversation",
				routing: {
					request: { method: 'GET', url: ticketUrl('/messages') },
					operations: { pagination: paginate({ style: 'page', pageSize: 200 }) },
					output: { postReceive: [itemsFrom('items')] },
				},
			},
		],
		default: 'create',
	},
	ticketIdField(showMessageCreate),
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: 'The message text',
		displayOptions: { show: showMessageCreate },
		routing: { send: { type: 'body', property: 'content' } },
	},
	employeeLocator('Sender', 'senderId', showMessageCreate, {
		description: 'The employee who wrote the message',
		routing: { send: { type: 'body', property: 'sender_id' } },
	}),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showMessageCreate },
		options: [
			{
				displayName: 'AI Agent Should Reply',
				name: 'agentShouldProcess',
				type: 'boolean',
				default: true,
				description:
					'Whether the Harmony AI agent should process this message. Only applies to tickets assigned to an AI agent.',
				routing: { send: { type: 'body', property: 'agent_should_process' } },
			},
			{
				displayName: 'Attachment IDs',
				name: 'attachmentIds',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of previously uploaded attachments',
				routing: {
					send: { type: 'body', property: 'attachment_ids', value: CSV_TO_LIST },
				},
			},
			{
				displayName: 'Canned Response ID',
				name: 'cannedResponseId',
				type: 'number',
				default: 0,
				description: "The desk's quick response template the content was written from",
				routing: { send: { type: 'body', property: 'canned_response_id' } },
			},
			idempotencyKeyOption,
			{
				displayName: 'Internal Note',
				name: 'isInternal',
				type: 'boolean',
				default: false,
				description: 'Whether the message is an internal note that the reporter cannot see',
				routing: { send: { type: 'body', property: 'is_internal' } },
			},
			{
				displayName: 'Mentioned Employee IDs',
				name: 'mentionedEmployeeIds',
				type: 'string',
				default: '',
				description: 'Comma-separated employee IDs to add as watchers',
				routing: {
					send: { type: 'body', property: 'mentioned_employee_ids', value: CSV_TO_LIST },
				},
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: enumOptions([
					'harmony',
					'portal',
					'email',
					'slack',
					'teams',
					['freshservice', 'Freshservice'],
					['jsm', 'Jira Service Management'],
					['solarwinds', 'SolarWinds'],
					'siit',
					['service-desk', 'Service Desk'],
				]),
				default: 'harmony',
				description: 'The channel the message came from',
				routing: { send: { type: 'body', property: 'source' } },
			},
		],
	},
	ticketIdField(showMessageGetAll),
	...getManyFields({ show: showMessageGetAll, limitProperty: 'page_size', maxLimit: 200 }),
];

// ================================================================ ticket watcher

const watcherResource = ['ticketWatcher'];
const showWatcherAdd = { resource: watcherResource, operation: ['add'] };
const showWatcherRemove = { resource: watcherResource, operation: ['remove'] };

export const ticketWatcherDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: watcherResource } },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add ticket watcher',
				description: 'Add a watcher who is notified about ticket updates',
				routing: { request: { method: 'POST', url: ticketUrl('/watchers') } },
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove ticket watcher',
				description: 'Remove a watcher from a ticket',
				routing: {
					request: {
						method: 'DELETE',
						url: ticketUrl('/watchers/{{ toPathSegment($parameter.watcherId) }}'),
					},
					output: { postReceive: [deletedResponse] },
				},
			},
		],
		default: 'add',
	},
	ticketIdField(showWatcherAdd),
	{
		displayName: 'Watcher Type',
		name: 'watcherType',
		type: 'options',
		options: [
			{
				name: 'Employee',
				value: 'employee',
				description: 'An employee in Harmony',
			},
			{
				name: 'Email Address',
				value: 'email',
				description:
					'Any email address. Addresses without an employee follow the ticket by email, like a CC.',
			},
		],
		default: 'employee',
		displayOptions: { show: showWatcherAdd },
	},
	employeeLocator(
		'Watcher',
		'watcherId',
		{ ...showWatcherAdd, watcherType: ['employee'] },
		{
			description: 'The employee to add as a watcher',
			routing: { send: { type: 'body', property: 'watcher_id' } },
		},
	),
	{
		displayName: 'Email',
		name: 'watcherEmail',
		type: 'string',
		placeholder: 'e.g. nathan@example.com',
		required: true,
		default: '',
		description: 'The email address to add as a watcher',
		displayOptions: { show: { ...showWatcherAdd, watcherType: ['email'] } },
		routing: { send: { type: 'body', property: 'watcher_email' } },
	},
	ticketIdField(showWatcherRemove),
	employeeLocator('Watcher', 'watcherId', showWatcherRemove, {
		description: 'The employee to remove from the watchers',
	}),
];

// ================================================================ ticket link

const linkResource = ['ticketLink'];
const showLinkAdd = { resource: linkResource, operation: ['add'] };
const showLinkRemove = { resource: linkResource, operation: ['remove'] };
const showLinkGetAll = { resource: linkResource, operation: ['getAll'] };

const LINK_TYPES = [
	'related_to',
	'duplicate_of',
	'duplicated_by',
	'blocks',
	'blocked_by',
	'depends_on',
	'used_by',
	'parent_of',
	'child_of',
	'caused_by_problem',
	'problem_causes',
];

function linkFields(show: { resource: string[]; operation: string[] }): INodeProperties[] {
	return [
		ticketIdField(show),
		{
			displayName: 'Links',
			name: 'links',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, maxAllowedFields: 20 },
			placeholder: 'Add Link',
			required: true,
			default: {},
			description: 'Up to 20 links from this ticket. Linking requires access to both tickets.',
			displayOptions: { show },
			options: [
				{
					displayName: 'Link',
					name: 'link',
					values: [
						{
							displayName: 'Link Type',
							name: 'link_type',
							type: 'options',
							options: enumOptions(LINK_TYPES),
							default: 'related_to',
							description: 'How this ticket relates to the target ticket',
						},
						{
							displayName: 'Target Ticket ID',
							name: 'target_ticket_id',
							type: 'string',
							default: '',
							placeholder: 'e.g. INC-123',
						},
					],
				},
			],
			routing: {
				send: {
					type: 'body',
					property: 'links',
					value: '={{ $value.link ?? [] }}',
				},
			},
		},
	];
}

export const ticketLinkDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: linkResource } },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add ticket links',
				description: 'Link a ticket to other tickets, keeping its existing links',
				routing: { request: { method: 'POST', url: ticketUrl('/links/add') } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many ticket links',
				description: "Retrieve a ticket's links to other tickets",
				routing: {
					request: { method: 'GET', url: ticketUrl('/links') },
					output: { postReceive: [itemsFrom('items')] },
				},
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove ticket links',
				description: 'Remove links between a ticket and other tickets',
				routing: { request: { method: 'POST', url: ticketUrl('/links/remove') } },
			},
		],
		default: 'add',
	},
	...linkFields(showLinkAdd),
	...linkFields(showLinkRemove),
	ticketIdField(showLinkGetAll),
];
