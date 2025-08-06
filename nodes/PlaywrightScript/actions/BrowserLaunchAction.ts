import {
	NodeOperationError,
} from 'n8n-workflow';

import { BaseAction, PlaywrightActionContext } from './BaseAction';
import { BrowserSessionManager } from './BrowserSessionManager';

export class BrowserLaunchAction extends BaseAction {
	async execute(context: PlaywrightActionContext): Promise<any> {
		const { executeFunctions, itemIndex, playwright } = context;
		
		const browserType = executeFunctions.getNodeParameter('browserType', itemIndex) as string;
		const browserOptions = executeFunctions.getNodeParameter('browserOptions', itemIndex, {}) as any;
		const sessionManager = BrowserSessionManager.getInstance();
		
		// Check if single browser already exists
		const existingBrowser = sessionManager.getSingleBrowser();
		const existingSessionId = sessionManager.getSingleSessionId();
		
		if (existingBrowser && existingSessionId) {
			return {
				success: true,
				sessionId: existingSessionId,
				browserType,
				isConnected: existingBrowser.isConnected(),
				message: `Reusing existing single browser session ${existingSessionId}`,
				reusedExisting: true,
				timestamp: new Date().toISOString()
			};
		}
		
		try {
			// Generate unique session ID for new single browser instance
			const sessionId = `single-browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			
			// Launch browser with specified options
			const browser = await this.getBrowserInstance(browserType, playwright, browserOptions);
			
			// Store as single browser in shared manager
			sessionManager.setSingleBrowser(sessionId, browser);
			
			return {
				success: true,
				sessionId,
				browserType,
				isConnected: browser.isConnected(),
				message: `Single browser ${browserType} launched successfully`,
				reusedExisting: false,
				timestamp: new Date().toISOString()
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Failed to launch browser: ${errorMessage}`
			);
		}
	}
}