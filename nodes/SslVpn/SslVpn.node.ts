import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { AuthenticateAction } from './actions/AuthenticateAction';
import { ConsoleAction } from './actions/ConsoleAction';
import { ExtractAction } from './actions/ExtractAction';
import { FullAction } from './actions/FullAction';

export class SslVpn implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSL VPN',
		name: 'sslVpn',
		icon: 'file:sslvpn.svg',
		group: ['transform'],
		version: 1,
		description: 'Automate SSL VPN operations on Naver Cloud Platform',
		defaults: {
			name: 'SSL VPN',
		},
		inputs: ['main'] as any,
		outputs: ['main'] as any,
		credentials: [
			{
				name: 'sslVpnApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Authenticate Only',
						value: 'authenticate',
						description: 'Perform login and SMS authentication',
						action: 'Perform login and SMS authentication',
					},
					{
						name: 'Navigate to Console',
						value: 'console',
						description: 'Authenticate and navigate to NCP console',
						action: 'Authenticate and navigate to NCP console',
					},
					{
						name: 'Extract VPC Data',
						value: 'extract',
						description: 'Complete flow: authenticate, navigate, and extract VPC data',
						action: 'Complete flow authenticate navigate and extract vpc data',
					},
					{
						name: 'Full Process',
						value: 'full',
						description: 'Run all steps in sequence (authenticate → console → extract)',
						action: 'Run all steps in sequence authenticate console extract',
					},
				],
				default: 'full',
			},
			{
				displayName: 'Browser Debug Port',
				name: 'debugPort',
				type: 'number',
				default: 9222,
				description: 'Port for browser remote debugging connection',
			},
			{
				displayName: 'Manual SMS Input',
				name: 'manualSms',
				type: 'boolean',
				default: true,
				description: 'Whether to wait for manual SMS input in browser (recommended)',
				displayOptions: {
					show: {
						action: ['authenticate', 'console', 'extract', 'full'],
					},
				},
			},
			{
				displayName: 'Popup Timeout',
				name: 'popupTimeout',
				type: 'number',
				default: 5000,
				description: 'Timeout in milliseconds to wait for popup elements',
				displayOptions: {
					show: {
						action: ['console', 'extract', 'full'],
					},
				},
			},
			{
				displayName: 'Data Wait Timeout',
				name: 'dataTimeout',
				type: 'number',
				default: 10000,
				description: 'Timeout in milliseconds to wait for data table to load',
				displayOptions: {
					show: {
						action: ['extract', 'full'],
					},
				},
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Individual Items',
						value: 'items',
						description: 'Output each VPC as a separate item',
					},
					{
						name: 'Array in Single Item',
						value: 'array',
						description: 'Output all VPCs as an array in a single item',
					},
				],
				default: 'items',
				description: 'How to format the extracted VPC data',
				displayOptions: {
					show: {
						action: ['extract', 'full'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('sslVpnApi');
				const action = this.getNodeParameter('action', i) as string;
				const debugPort = this.getNodeParameter('debugPort', i) as number;
				const manualSms = this.getNodeParameter('manualSms', i, true) as boolean;
				const popupTimeout = this.getNodeParameter('popupTimeout', i, 5000) as number;
				const dataTimeout = this.getNodeParameter('dataTimeout', i, 10000) as number;
				const outputFormat = this.getNodeParameter('outputFormat', i, 'items') as string;

				let result: any;

				// Execute the appropriate action
				switch (action) {
					case 'authenticate':
						const authenticateAction = new AuthenticateAction();
						result = await authenticateAction.execute(credentials, debugPort, manualSms);
						break;

					case 'console':
						const consoleAction = new ConsoleAction();
						result = await consoleAction.execute(credentials, debugPort, manualSms, popupTimeout);
						break;

					case 'extract':
						const extractAction = new ExtractAction();
						result = await extractAction.execute(
							credentials,
							debugPort,
							manualSms,
							popupTimeout,
							dataTimeout,
						);
						break;

					case 'full':
						const fullAction = new FullAction();
						result = await fullAction.execute(
							credentials,
							debugPort,
							manualSms,
							popupTimeout,
							dataTimeout,
						);
						break;

					default:
						const nodeApiError = new NodeApiError(this.getNode(), {
							message: `Unknown action: ${action}`,
							description: 'Please select a valid action from the node options.',
						});

						throw nodeApiError;
				}

				// Handle output formatting for extraction actions
				if (
					(action === 'extract' || action === 'full') &&
					result.success &&
					result.data &&
					outputFormat === 'items'
				) {
					// Output each VPC as a separate item
					for (const vpc of result.data) {
						returnData.push({
							json: {
								...vpc,
								extractionInfo: {
									success: result.success,
									message: result.message,
									action: action,
									timestamp: result.timestamp,
									totalCount: result.count,
								},
							},
							pairedItem: { item: i },
						});
					}
				} else {
					// Output as single item
					returnData.push({
						json: {
							...result,
							action: action,
						},
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error instanceof Error ? error.message : String(error),
							action: this.getNodeParameter('action', i) as string,
							timestamp: new Date().toISOString(),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new NodeOperationError(this.getNode(), errorMessage);
			}
		}

		return [returnData];
	}
}
