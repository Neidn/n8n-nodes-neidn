import {
	NodeOperationError,
} from 'n8n-workflow';
import { BaseAction, PlaywrightActionContext } from './BaseAction';
import { BrowserSessionManager } from './BrowserSessionManager';

export class BrowserCloseAction extends BaseAction {
	async execute(context: PlaywrightActionContext, sessionId?: string): Promise<any> {
		const { executeFunctions } = context;
		
		const sessionManager = BrowserSessionManager.getInstance();
		
		try {
			if (sessionId) {
				// Close specific browser session
				const closed = await sessionManager.closeBrowserSession(sessionId);
				
				return {
					success: true,
					message: closed 
						? `Browser session '${sessionId}' closed successfully`
						: `Browser session '${sessionId}' was already closed or not found`,
					sessionId,
					timestamp: new Date().toISOString()
				};
			} else {
				// Close all browser sessions
				const closedCount = await sessionManager.closeAllSessions();
				
				return {
					success: true,
					message: `Closed ${closedCount} browser session(s)`,
					timestamp: new Date().toISOString()
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Failed to close browser: ${errorMessage}`
			);
		}
	}
}