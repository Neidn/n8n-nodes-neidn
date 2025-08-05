import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SslVpnApi implements ICredentialType {
	name = 'sslVpnApi';
	displayName = 'SSL VPN API';
	documentationUrl = 'https://www.ncloud.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'Auth URL',
			name: 'authUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'The authentication URL for the SSL VPN service',
		},
		{
			displayName: 'Console URL',
			name: 'consoleUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'The console URL for the NCP dashboard',
		},
		{
			displayName: 'SSL VPN Console URL',
			name: 'sslVpnConsoleUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'The SSL VPN console URL for data extraction',
		},
		{
			displayName: 'Login Alias',
			name: 'loginAlias',
			type: 'string',
			default: '',
			required: true,
			description: 'The login alias for authentication',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'The username for authentication',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			required: true,
			description: 'The password for authentication',
		},
		{
			displayName: 'SMS Code',
			name: 'smsCode',
			type: 'string',
			default: '',
			required: false,
			description: 'SMS authentication code (optional, can be entered manually)',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.authUrl}}',
			url: '',
			method: 'GET',
		},
	};
}
