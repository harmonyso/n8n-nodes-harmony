import type { INodeProperties } from 'n8n-workflow';

type Show = NonNullable<NonNullable<INodeProperties['displayOptions']>['show']>;

/** Resource locator for a desk: pick from a list or enter its slug */
export function deskLocator(
	name: string,
	show: Show,
	overrides: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName: 'Desk',
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The desk to use',
		displayOptions: { show },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchDesks', searchable: true },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. it-desk',
				hint: 'The desk slug from its URL in Harmony: /tickets/desk/<ID>',
			},
		],
		...overrides,
	};
}

/** Resource locator for an employee: search by name or email, or enter an ID */
export function employeeLocator(
	displayName: string,
	name: string,
	show: Show,
	overrides: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchEmployees', searchable: true },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 3f6c2a8e-1b2d-4c5e-9f7a-8b9c0d1e2f3a',
			},
		],
		...overrides,
	};
}

/** The ticket parameter used by every ticket-scoped operation */
export function ticketIdField(show: Show): INodeProperties {
	return {
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. INC-7814',
		description: 'The ticket display ID (case-insensitive)',
		displayOptions: { show },
	};
}

interface GetManyConfig {
	show: Show;
	/** Query or body parameter that sets the page size */
	limitProperty: 'limit' | 'page_size';
	/** Largest page size the endpoint accepts */
	maxLimit: number;
	location?: 'query' | 'body';
}

/** "Return All" and "Limit" parameters for a list operation */
export function getManyFields({
	show,
	limitProperty,
	maxLimit,
	location = 'query',
}: GetManyConfig): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			routing: { send: { paginate: '={{ $value }}' } },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1, maxValue: maxLimit },
			default: 50,
			description: 'Max number of results to return',
			routing: {
				send: { type: location, property: limitProperty },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

/** The "Simplify" toggle, for operations whose items have more than 10 fields */
export function simplifyField(show: Show): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		displayOptions: { show },
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	};
}

/** Sends a header used to make retries of a create safe */
export const idempotencyKeyOption: INodeProperties = {
	displayName: 'Idempotency Key',
	name: 'idempotencyKey',
	type: 'string',
	default: '',
	placeholder: 'e.g. order-1234-ticket',
	description:
		'A unique value for this operation. Retrying with the same key returns the original result instead of creating a duplicate.',
	routing: {
		request: { headers: { 'X-Idempotency-Key': '={{ $value }}' } },
	},
};
