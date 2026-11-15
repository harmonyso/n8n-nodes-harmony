import type { INodeProperties } from 'n8n-workflow';
import { deskLocator } from '../shared/descriptions';
import { itemsFrom } from '../shared/transport';

const resource = ['desk'];
const DESKS = '/service-desk/api/v1/desks';
const deskUrl = (suffix = '') => `=${DESKS}/{{ toPathSegment($parameter.deskId) }}${suffix}`;

const show = (operation: string) => ({ resource, operation: [operation] });

function booleanOption(
	displayName: string,
	name: string,
	property: string,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'boolean',
		default: false,
		description,
		routing: { send: { type: 'query', property } },
	};
}

export const deskDescription: INodeProperties[] = [
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
				action: 'Get desk',
				description: 'Retrieve a desk',
				routing: { request: { method: 'GET', url: deskUrl() } },
			},
			{
				name: 'Get Custom Field Definitions',
				value: 'getCustomFieldDefinitions',
				action: 'Get desk custom field definitions',
				description:
					'Retrieve the ticket custom fields that apply to a desk, including tenant-wide ones',
				routing: {
					request: {
						method: 'GET',
						url: '=/service-desk/api/v1/config/custom-fields/for-entity/{{ toPathSegment($parameter.deskId) }}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many desks',
				description: 'Retrieve the desks the access key can view',
				routing: {
					request: { method: 'GET', url: `${DESKS}/` },
					output: { postReceive: [itemsFrom('desks')] },
				},
			},
			{
				name: 'Get Subdesks',
				value: 'getSubdesks',
				action: 'Get desk subdesks',
				description: "Retrieve a desk's teams (subdesks)",
				routing: {
					request: { method: 'GET', url: deskUrl('/subdesks') },
					output: { postReceive: [itemsFrom('subdesks')] },
				},
			},
			{
				name: 'Get Tags',
				value: 'getTags',
				action: 'Get desk tags',
				description: 'Retrieve the ticket tags of a desk',
				routing: {
					request: { method: 'GET', url: deskUrl('/tags') },
					output: { postReceive: [itemsFrom('items')] },
				},
			},
		],
		default: 'get',
	},
	deskLocator('deskId', {
		resource,
		operation: ['get', 'getCustomFieldDefinitions', 'getSubdesks', 'getTags'],
	}),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: show('get') },
		options: [
			booleanOption(
				'Include Subdesks',
				'includeSubdesks',
				'include_subdesks',
				'Whether to include the desk’s teams (subdesks)',
			),
			booleanOption(
				'Include Ticket Assignees',
				'includeTicketAssignees',
				'include_ticket_assignees',
				'Whether to include employees assigned to tickets in this desk, even if they are no longer desk members',
			),
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: show('getAll') },
		options: [
			booleanOption(
				'Include Custom Fields',
				'includeCustomFields',
				'include_custom_fields',
				'Whether to include each desk’s custom field definitions',
			),
			booleanOption(
				'Include Disabled Desks',
				'includeDisabled',
				'include_disabled',
				'Whether to include disabled desks',
			),
			{
				...booleanOption(
					'Include Main Subdesk',
					'includeMainSubdesk',
					'include_main_subdesk',
					'Whether to include each desk’s main team when subdesks are included',
				),
				default: true,
			},
			booleanOption(
				'Include Subdesks',
				'includeSubdesks',
				'include_subdesks',
				'Whether to include each desk’s teams (subdesks)',
			),
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: show('getSubdesks') },
		options: [
			booleanOption(
				'Include Auto-Assignment Settings',
				'includeAutoAssignment',
				'include_auto_assignment',
				'Whether to include each team’s auto-assignment settings',
			),
			booleanOption(
				'Include Main Subdesk',
				'includeMain',
				'include_main',
				'Whether to include the desk’s main team',
			),
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: show('getTags') },
		options: [
			booleanOption(
				'Include Ticket Counts',
				'includeCounts',
				'include_counts',
				'Whether to include how many tickets on this desk use each tag',
			),
		],
	},
];
