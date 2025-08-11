import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import type {Browser} from 'playwright';
import {ManagedScriptAction} from './actions';
import {CustomScriptAction} from './actions';
import {BrowserLaunchAction} from './actions';
import {BrowserInteractAction} from './actions';
import {BrowserCloseAction} from './actions';
import {PlaywrightActionContext} from './actions';

export class PlaywrightScript implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Playwright Script',
		name: 'playwrightScript',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Execute custom Node.js scripts with Playwright browser automation. Supports managed browser instances with automatic cleanup.',
		defaults: {
			name: 'Playwright Script',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Browser Type',
				name: 'browserType',
				type: 'options',
				default: 'chromium',
				options: [
					{
						name: 'Chromium',
						value: 'chromium',
						description: 'Use Chromium browser (fastest)',
					},
					/*
					{
						name: 'Firefox',
						value: 'firefox',
						description: 'Use Firefox browser',
					},
					{
						name: 'WebKit',
						value: 'webkit',
						description: 'Use Safari WebKit browser',
					},
					 */
				],
				description: 'Browser engine to use for automation',
			},
			{
				displayName: 'Script Mode',
				name: 'scriptMode',
				type: 'options',
				options: [
					{
						name: 'Browser Close',
						value: 'close',
						description: 'Close browser session(s) manually',
					},
					{
						name: 'Browser Interact',
						value: 'interact',
						description: 'Interact with an existing browser session',
					},
					{
						name: 'Browser Launch',
						value: 'launch',
						description: 'Launch a new browser session and return session ID',
					},
					{
						name: 'Custom Script',
						value: 'custom',
						description: 'Full control over browser lifecycle in script',
					},
					{
						name: 'Managed Browser',
						value: 'managed',
						description: 'Browser and page instances are automatically managed',
					},
				],
				default: 'launch',
				description: 'How browser instances are managed',
			},
			{
				displayName: 'Node.js Script',
				name: 'script',
				type: 'string',
				typeOptions: {
					editor: 'codeNodeEditor',
					editorLanguage: 'javaScript',
				},
				default: `// Available variables in Managed Browser mode:
// - items: Input data array
// - $json: Current item's JSON data
// - $index: Current item index
// - page: Ready-to-use page instance
// - browser: Browser instance (for advanced usage)
// - playwright: Playwright library

// Navigate to a website
await page.goto('https://example.com');

// Get page title
const title = await page.title();

// Extract some data
const headings = await page.$$eval('h1, h2, h3', elements =>
  elements.map(el => ({ tag: el.tagName, text: el.textContent }))
);

// Take a screenshot and save to file
const fs = require('fs');
const path = require('path');
const os = require('os');

const outputDir = path.join(os.homedir(), '.n8n', 'outputfiles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const screenshotPath = path.join(outputDir, \`screenshot_\${Date.now()}.png\`);
await page.screenshot({ path: screenshotPath, type: 'png' });

// Return structured data
return {
  success: true,
  url: page.url(),
  title,
  headings,
  screenshotPath,
  timestamp: new Date().toISOString()
};`,
				description: 'Custom Node.js script to execute with Playwright',
				displayOptions: {
					show: {
						scriptMode: ['managed'],
					},
				},
			},
			{
				displayName: 'Custom Script',
				name: 'customScript',
				type: 'string',
				typeOptions: {
					editor: 'codeNodeEditor',
					editorLanguage: 'javaScript',
				},
				default: `// Available variables:
// - items: Input data array
// - $json: Current item's JSON data
// - $index: Current item index
// - playwright: Playwright library

const { chromium, firefox, webkit } = playwright;

// Example: Full browser lifecycle control
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

try {
  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (compatible; n8n-playwright)');

  // Navigate and interact
  await page.goto('https://httpbin.org/json');
  const jsonData = await page.textContent('pre');

  return {
    success: true,
    data: JSON.parse(jsonData),
    timestamp: new Date().toISOString()
  };
} finally {
  await browser.close();
}`,
				description: 'Custom script with full browser lifecycle control',
				displayOptions: {
					show: {
						scriptMode: ['custom'],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: 'default-session',
				placeholder: 'session-123456789-abc',
				description: 'Browser session ID to interact with or close',
				required: true,
				displayOptions: {
					show: {
						scriptMode: ['interact', 'close'],
					},
				},
			},
			{
				displayName: 'Interaction Script',
				name: 'interactionScript',
				type: 'string',
				typeOptions: {
					editor: 'codeNodeEditor',
					editorLanguage: 'javaScript',
				},
				default: `// Available variables:
// - page: Page instance (ready to use)
// - browser: Browser instance
// - playwright: Playwright library
// - sessionId: Current session ID
// - $json: Current item's JSON data
// - $index: Current item index
// - items: Input data array

// Navigate to a website
await page.goto('https://example.com');

// Get page title and URL
const title = await page.title();
const url = page.url();

// Take a screenshot and save to file
const fs = require('fs');
const path = require('path');
const os = require('os');

const outputDir = path.join(os.homedir(), '.n8n', 'outputfiles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const screenshotPath = path.join(outputDir, \`screenshot_\${Date.now()}.png\`);
await page.screenshot({ path: screenshotPath, type: 'png' });

// Extract data from the page
const headings = await page.$$eval('h1, h2, h3', elements =>
  elements.map(el => ({ tag: el.tagName, text: el.textContent }))
);

// Return the results
return {
  title,
  url,
  headings,
  screenshotPath
};`,
				description: 'JavaScript code to execute with the browser page',
				displayOptions: {
					show: {
						scriptMode: ['interact'],
					},
				},
			},
			{
				displayName: 'Close All Sessions',
				name: 'closeAllSessions',
				type: 'boolean',
				default: false,
				description: 'Whether to close all active browser sessions (ignores Session ID)',
				displayOptions: {
					show: {
						scriptMode: ['close'],
					},
				},
			},
			{
				displayName: 'Reuse Pages',
				name: 'reusePages',
				type: 'boolean',
				default: false,
				description: 'Whether to reuse page instances within the same session',
				displayOptions: {
					show: {
						scriptMode: ['interact'],
					},
				},
			},
			{
				displayName: 'Browser Options',
				name: 'browserOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Default Timeout',
						name: 'defaultTimeout',
						type: 'number',
						default: 10000,
						description: 'Default timeout for page operations in milliseconds',
					},
					{
						displayName: 'Headless',
						name: 'headless',
						type: 'boolean',
						default: true,
						description: 'Whether to run browser in headless mode',
					},
					{
						displayName: 'Ignore HTTPS Errors',
						name: 'ignoreHTTPSErrors',
						type: 'boolean',
						default: false,
						description: 'Whether to ignore HTTPS certificate errors',
					},
					{
						displayName: 'Navigation Timeout',
						name: 'navigationTimeout',
						type: 'number',
						default: 30000,
						description: 'Navigation timeout in milliseconds',
					},
					{
						displayName: 'User Agent',
						name: 'userAgent',
						type: 'string',
						default: '',
						placeholder: 'Mozilla/5.0 (compatible; n8n-playwright)',
						description: 'Custom user agent string (leave empty for default)',
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						default: 720,
						description: 'Browser viewport height in pixels',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						default: 1280,
						description: 'Browser viewport width in pixels',
					},
				],
				displayOptions: {
					show: {
						scriptMode: ['launch', 'managed', 'interact'],
					},
				},
			},
			{
				displayName: 'Reuse Browser',
				name: 'reuseBrowser',
				type: 'boolean',
				default: false,
				description: 'Whether to reuse browser instance across multiple items for better performance',
				displayOptions: {
					show: {
						scriptMode: ['managed'],
					},
				},
			},
			{
				displayName: 'Continue on Fail',
				name: 'continueOnFail',
				type: 'boolean',
				default: false,
				description: 'Whether to continue execution if script fails',
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Create action instances within execute method
		const managedScriptAction = new ManagedScriptAction();
		const customScriptAction = new CustomScriptAction();
		const browserLaunchAction = new BrowserLaunchAction();
		const browserInteractAction = new BrowserInteractAction();
		const browserCloseAction = new BrowserCloseAction();

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Import Playwright dynamically
		let playwright: any;
		try {
			playwright = await import('playwright');
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'Playwright is not installed. Please install it using: npm install playwright',
			);
		}

		const scriptMode = this.getNodeParameter('scriptMode', 0) as string;
		const reuseBrowser = this.getNodeParameter('reuseBrowser', 0, false) as boolean;
		let sharedBrowser: Browser | null = null;

		try {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					let result: any;

					const context: PlaywrightActionContext = {
						executeFunctions: this,
						itemIndex,
						items,
						playwright,
					};

					if (scriptMode === 'launch') {
						result = await browserLaunchAction.execute(context);
					} else if (scriptMode === 'interact') {
						const sessionId = this.getNodeParameter('sessionId', itemIndex, 'default-session') as string;
						if (!sessionId || sessionId.trim() === '') {
							throw new NodeOperationError(this.getNode(), 'Session ID is required for browser interaction');
						}
						result = await browserInteractAction.execute(context, sessionId);
					} else if (scriptMode === 'close') {
						const closeAllSessions = this.getNodeParameter('closeAllSessions', itemIndex, false) as boolean;
						const sessionId = closeAllSessions ? undefined : this.getNodeParameter('sessionId', itemIndex) as string;
						if (!closeAllSessions && !sessionId) {
							throw new NodeOperationError(this.getNode(), 'Session ID is required to close specific browser session');
						}
						result = await browserCloseAction.execute(context, sessionId);
					} else if (scriptMode === 'managed') {
						result = await managedScriptAction.execute(context, sharedBrowser, reuseBrowser);
						if (reuseBrowser && !sharedBrowser && result.browser) {
							sharedBrowser = result.browser;
						}
					} else {
						result = await customScriptAction.execute(context);
					}

					// Handle result
					if (result === null || result === undefined) {
						returnData.push({
							json: {
								success: true,
								result: null,
								itemIndex,
							},
							pairedItem: {item: itemIndex},
						});
					} else if (typeof result === 'object') {
						// Remove internal browser reference from result
						const {browser: _, ...cleanResult} = result;
						returnData.push({
							json: {
								...cleanResult,
								itemIndex,
							},
							pairedItem: {item: itemIndex},
						});
					} else {
						returnData.push({
							json: {
								success: true,
								result,
								itemIndex,
							},
							pairedItem: {item: itemIndex},
						});
					}

				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);

					if (this.continueOnFail() || this.getNodeParameter('continueOnFail', itemIndex, false)) {
						returnData.push({
							json: {
								success: false,
								error: errorMessage,
								itemIndex,
								timestamp: new Date().toISOString(),
							},
							pairedItem: {item: itemIndex},
						});
						continue;
					}

					throw new NodeOperationError(this.getNode(), `Script execution failed: ${errorMessage}`);
				}
			}
		} finally {
			// Clean up shared browser if it was used
			if (sharedBrowser && !reuseBrowser) {
				try {
					await sharedBrowser.close();
				} catch (error) {
					// Ignore cleanup errors
				}
			}

			// Clean up any remaining browser instances if not reusing
			if (!reuseBrowser) {
				await managedScriptAction.cleanupBrowsers();
				await customScriptAction.cleanupBrowsers();
				await browserLaunchAction.cleanupBrowsers();
				await browserInteractAction.cleanupBrowsers();
				await browserCloseAction.cleanupBrowsers();
			}
		}

		return [returnData];
	}
}
