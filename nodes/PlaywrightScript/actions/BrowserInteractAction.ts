import {
	NodeOperationError,
} from 'n8n-workflow';

import type { Page } from 'playwright';
import { BaseAction, PlaywrightActionContext } from './BaseAction';
import { BrowserSessionManager } from './BrowserSessionManager';

export class BrowserInteractAction extends BaseAction {

	async execute(context: PlaywrightActionContext, sessionId: string): Promise<any> {
		const { executeFunctions, itemIndex, playwright } = context;
		
		if (!sessionId) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				'Session ID is required for browser interaction'
			);
		}
		
		// Get browser instance from shared session manager
		const sessionManager = BrowserSessionManager.getInstance();
		let browser = sessionManager.getBrowserSession(sessionId);
		let autoLaunched = false;
		
		// If browser doesn't exist or is disconnected, launch a new one
		if (!browser) {
			const browserType = executeFunctions.getNodeParameter('browserType', itemIndex) as string;
			const browserOptions = executeFunctions.getNodeParameter('browserOptions', itemIndex, {}) as any;
			
			try {
				// Launch new browser and store with the provided session ID
				browser = await this.getBrowserInstance(browserType, playwright, browserOptions);
				sessionManager.setBrowserSession(sessionId, browser);
				autoLaunched = true;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Failed to auto-launch browser for session '${sessionId}': ${errorMessage}`
				);
			}
		}
		
		const script = executeFunctions.getNodeParameter('interactionScript', itemIndex) as string;
		const reusePages = executeFunctions.getNodeParameter('reusePages', itemIndex, false) as boolean;
		
		try {
			// Get or create page instance using session manager
			let page: Page;
			const pageId = 'page'; // Default page ID
			
			if (reusePages) {
				const existingPage = sessionManager.getPageSession(sessionId, pageId);
				if (existingPage) {
					page = existingPage;
				} else {
					page = await browser.newPage();
					sessionManager.setPageSession(sessionId, pageId, page);
				}
			} else {
				page = await browser.newPage();
			}
			
			// Set up page configuration
			const browserOptions = executeFunctions.getNodeParameter('browserOptions', itemIndex, {}) as any;
			
			if (browserOptions.viewportWidth || browserOptions.viewportHeight) {
				await page.setViewportSize({
					width: browserOptions.viewportWidth || 1280,
					height: browserOptions.viewportHeight || 720,
				});
			}
			
			if (browserOptions.userAgent) {
				const context = page.context();
				await context.addInitScript(() => {
					Object.defineProperty(navigator, 'userAgent', {
						value: browserOptions.userAgent,
						configurable: true
					});
				});
			}
			
			if (browserOptions.defaultTimeout) {
				page.setDefaultTimeout(browserOptions.defaultTimeout);
			}
			
			if (browserOptions.navigationTimeout) {
				page.setDefaultNavigationTimeout(browserOptions.navigationTimeout);
			}
			
			// Create execution context for the script
			const scriptContext = {
				page,
				browser,
				playwright,
				sessionId,
				console: this.createScriptConsole(itemIndex),
				require: this.createScriptRequire(executeFunctions),
				$json: context.items[itemIndex].json,
				$index: itemIndex,
				items: context.items,
			};
			
			// Execute the interaction script (create async function)
			const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
			const scriptFunction = new AsyncFunction(
				'page', 'browser', 'playwright', 'sessionId', 'console', 'require', '$json', '$index', 'items',
				script
			);
			
			const result = await scriptFunction.call(
				scriptContext,
				page,
				browser,
				playwright,
				sessionId,
				scriptContext.console,
				scriptContext.require,
				scriptContext.$json,
				itemIndex,
				context.items
			);
			
			return {
				success: true,
				sessionId,
				autoLaunched,
				result,
				pageUrl: page.url(),
				timestamp: new Date().toISOString()
			};
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Browser interaction failed: ${errorMessage}`
			);
		}
	}
}