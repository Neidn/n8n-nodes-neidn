import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BrowserManager implements ICredentialType {
	name = 'browserManager';
	displayName = 'Browser Manager';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'Browser Timeout (ms)',
			name: 'browserTimeout',
			type: 'number',
			default: 30000,
			description: 'Maximum time to wait for browser operations in milliseconds',
		},
		{
			displayName: 'Headless Mode',
			name: 'headless',
			type: 'boolean',
			default: false,
			description: 'Whether to run browser in headless mode (default: false for visible browser)',
		},
	];
}