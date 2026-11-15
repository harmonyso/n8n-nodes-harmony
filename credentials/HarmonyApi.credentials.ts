import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HarmonyApi implements ICredentialType {
	name = 'harmonyApi';

	displayName = 'Harmony API';

	icon = {
		light: 'file:../nodes/Harmony/harmony.svg',
		dark: 'file:../nodes/Harmony/harmony.dark.svg',
	} as const;

	documentationUrl = 'https://docs.harmony.io/settings/managing-api-access-keys';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Key',
			name: 'accessKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create one in Harmony under Settings > Access Keys. Choose Read + Write to create and update records.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=AccessKey {{$credentials.accessKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.harmony.io',
			url: '/service-desk/api/v1/desks/',
		},
	};
}
