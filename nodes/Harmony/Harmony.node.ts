import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { applicationDescription, applicationStakeholderDescription } from './resources/application';
import { assetDescription } from './resources/asset';
import {
	catalogCategoryDescription,
	catalogItemDescription,
	requestDescription,
} from './resources/catalogAndRequest';
import { deskDescription } from './resources/desk';
import { employeeDescription } from './resources/employee';
import { ticketDescription } from './resources/ticket';
import {
	ticketLinkDescription,
	ticketMessageDescription,
	ticketWatcherDescription,
} from './resources/ticketChildren';
import { searchDesks, searchEmployees } from './shared/methods';
import { BASE_URL } from './shared/transport';

export class Harmony implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Harmony',
		name: 'harmony',
		icon: { light: 'file:harmonyLogo.svg', dark: 'file:harmonyLogo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage tickets, employees, assets, applications and AI requests in Harmony',
		defaults: {
			name: 'Harmony',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'harmonyApi', required: true }],
		requestDefaults: {
			baseURL: BASE_URL,
			arrayFormat: 'repeat',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Application', value: 'application' },
					{ name: 'Application Stakeholder', value: 'applicationStakeholder' },
					{ name: 'Asset', value: 'asset' },
					{ name: 'Catalog Category', value: 'catalogCategory' },
					{ name: 'Catalog Item', value: 'catalogItem' },
					{ name: 'Desk', value: 'desk' },
					{ name: 'Employee', value: 'employee' },
					{
						name: 'Request',
						value: 'request',
						description: 'A conversation handled by the Harmony AI agent',
					},
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Ticket Link', value: 'ticketLink' },
					{ name: 'Ticket Message', value: 'ticketMessage' },
					{ name: 'Ticket Watcher', value: 'ticketWatcher' },
				],
				default: 'ticket',
			},
			...applicationDescription,
			...applicationStakeholderDescription,
			...assetDescription,
			...catalogCategoryDescription,
			...catalogItemDescription,
			...deskDescription,
			...employeeDescription,
			...requestDescription,
			...ticketDescription,
			...ticketLinkDescription,
			...ticketMessageDescription,
			...ticketWatcherDescription,
		],
	};

	methods = {
		listSearch: {
			searchDesks,
			searchEmployees,
		},
	};
}
