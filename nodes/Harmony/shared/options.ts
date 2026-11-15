import type { INodePropertyOptions } from 'n8n-workflow';

const ACRONYMS = new Set(['ai', 'edr', 'erp', 'hr', 'id', 'it', 'jsm', 'mdm', 'usb', 'vpn']);

function humanize(value: string): string {
	return value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => {
			const lower = word.toLowerCase();
			if (ACRONYMS.has(lower)) return lower.toUpperCase();
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');
}

/**
 * Builds sorted options from API enum values. Pass `[value, name]` to override
 * the generated display name.
 */
export function enumOptions(values: Array<string | [string, string]>): INodePropertyOptions[] {
	return values
		.map((entry) =>
			Array.isArray(entry)
				? { name: entry[1], value: entry[0] }
				: { name: humanize(entry), value: entry },
		)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export const TICKET_TYPES_CREATE = ['request', 'incident', 'task', 'change'];
export const TICKET_TYPES = [...TICKET_TYPES_CREATE, 'question'];
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TICKET_STATUSES = [
	'open',
	'in_progress',
	'pending',
	'pending_reporter',
	'pending_approval',
	'pending_internal_team',
	'pending_third_party',
	'pending_on_hold',
	'resolved',
	'closed',
	'canceled',
];
export const TICKET_SOURCES: Array<string | [string, string]> = [
	'slack',
	'harmony',
	'teams',
	['freshservice', 'Freshservice'],
	['jsm', 'Jira Service Management'],
	['solarwinds', 'SolarWinds'],
	'email',
	'siit',
	['servicenow', 'ServiceNow'],
	'zendesk',
];

export const ASSET_TYPES = [
	'LAPTOP',
	'DESKTOP',
	'ADAPTER',
	'CABLES',
	'DOCKING_HUB',
	'HEADPHONES',
	'KEYBOARD',
	'MICROPHONE',
	'MOBILE_CONNECTIVITY',
	'MONITOR',
	'MOUSE',
	'NETWORK_DEVICE',
	'PHONE',
	'PRINTER',
	'SERVER',
	'SPEAKER',
	'TABLET',
	'UNKNOWN',
	'USB',
	'WEBCAM',
];
export const ASSET_STATUSES = [
	'in_stock',
	'reserved',
	'in_repair',
	'active',
	'planned',
	'grace_period',
	'expired',
	'retired',
];
export const ASSET_OWNERSHIPS = ['COMPANY_OWNED', 'LEASED', 'PERSONAL', 'RELEASED'];
export const ASSET_MDM_STATUSES = ['ACTIVE', 'INACTIVE', 'IN_REPAIR', 'END_OF_LIFE'];
export const ASSET_RETIREMENT_REASONS = [
	'auto_detected',
	'sold',
	'disposed',
	'given_away',
	'donated',
	'stolen',
	'broken',
	'other',
];

export const APPLICATION_STATUSES = [
	'DISCOVERED',
	'IN_REVIEW',
	'APPROVED',
	'REJECTED',
	'RETIRED',
	'IGNORED',
];
export const APPLICATION_SOURCES: Array<string | [string, string]> = [
	'OKTA',
	['JUMPCLOUD', 'JumpCloud'],
	['JUMPCLOUD-IDP', 'JumpCloud IdP'],
	['PINGONE', 'PingOne'],
	'KANDJI',
	['MICROSOFT-ENTRA', 'Microsoft Entra'],
	'INTUNE',
	['JAMF', 'Jamf'],
	'ADDIGY',
	'GOOGLE-WORKSPACE',
	['MANAGE-ENGINE', 'ManageEngine'],
	['NINJAONE', 'NinjaOne'],
	'MANUAL',
	'DEMO-OKTA',
	'APP',
	'MESH-PAYMENTS',
	'RAMP',
];
export const STAKEHOLDER_ROLES: Array<[string, string]> = [
	['APP_OWNER', 'App Owner'],
	['IT_APPROVER', 'IT Approver'],
	['BUDGET_APPROVER', 'Budget Approver'],
];
