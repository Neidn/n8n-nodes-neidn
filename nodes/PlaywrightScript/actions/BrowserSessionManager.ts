import type { Browser, Page } from 'playwright';

export class BrowserSessionManager {
	private static instance: BrowserSessionManager;
	private singleBrowser: Browser | null = null;
	private singleSessionId: string | null = null;
	private pageInstances = new Map<string, Page>();

	private constructor() {}

	public static getInstance(): BrowserSessionManager {
		if (!BrowserSessionManager.instance) {
			BrowserSessionManager.instance = new BrowserSessionManager();
		}
		return BrowserSessionManager.instance;
	}

	// Single browser management
	setSingleBrowser(sessionId: string, browser: Browser): void {
		// Close existing browser if any
		if (this.singleBrowser && this.singleBrowser.isConnected()) {
			this.singleBrowser.close().catch(() => {
				// Ignore close errors
			});
		}
		
		// Clear existing pages
		this.pageInstances.clear();
		
		// Set new single browser
		this.singleBrowser = browser;
		this.singleSessionId = sessionId;
	}

	getSingleBrowser(): Browser | null {
		if (this.singleBrowser && this.singleBrowser.isConnected()) {
			return this.singleBrowser;
		}
		
		// Clean up if disconnected
		if (this.singleBrowser && !this.singleBrowser.isConnected()) {
			this.singleBrowser = null;
			this.singleSessionId = null;
			this.pageInstances.clear();
		}
		
		return null;
	}

	getSingleSessionId(): string | null {
		return this.getSingleBrowser() ? this.singleSessionId : null;
	}

	// Legacy compatibility methods (redirect to single browser)
	setBrowserSession(sessionId: string, browser: Browser): void {
		this.setSingleBrowser(sessionId, browser);
	}

	getBrowserSession(sessionId: string): Browser | null {
		// Always return the single browser regardless of sessionId
		return this.getSingleBrowser();
	}

	async closeBrowserSession(sessionId: string): Promise<boolean> {
		const browser = this.getSingleBrowser();
		if (browser) {
			try {
				// Close all pages first
				for (const page of this.pageInstances.values()) {
					try {
						if (!page.isClosed()) {
							await page.close();
						}
					} catch (error) {
						// Ignore page close errors
					}
				}
				
				if (browser.isConnected()) {
					await browser.close();
				}
				
				this.singleBrowser = null;
				this.singleSessionId = null;
				this.pageInstances.clear();
				return true;
			} catch (error) {
				// Still cleanup even if close fails
				this.singleBrowser = null;
				this.singleSessionId = null;
				this.pageInstances.clear();
				return false;
			}
		}
		return false;
	}

	// Page management (simplified for single browser)
	setPageSession(sessionId: string, pageId: string, page: Page): void {
		this.pageInstances.set(pageId, page);
	}

	getPageSession(sessionId: string, pageId: string): Page | null {
		const page = this.pageInstances.get(pageId);
		return (page && !page.isClosed()) ? page : null;
	}

	async closePageSession(sessionId: string, pageId: string): Promise<boolean> {
		const page = this.pageInstances.get(pageId);
		if (page) {
			try {
				if (!page.isClosed()) {
					await page.close();
				}
			} catch (error) {
				// Ignore cleanup errors
			}
			this.pageInstances.delete(pageId);
			return true;
		}
		return false;
	}

	// Utility methods
	getActiveSessions(): string[] {
		const browser = this.getSingleBrowser();
		return browser ? [this.singleSessionId!] : [];
	}

	isSessionActive(sessionId: string): boolean {
		const browser = this.getSingleBrowser();
		return browser !== null;
	}

	async closeAllSessions(): Promise<number> {
		if (this.singleSessionId && await this.closeBrowserSession(this.singleSessionId)) {
			return 1;
		}
		return 0;
	}

	// Clean up disconnected sessions
	cleanupDisconnectedSessions(): void {
		// Check if single browser is disconnected and cleanup
		if (this.singleBrowser && !this.singleBrowser.isConnected()) {
			this.singleBrowser = null;
			this.singleSessionId = null;
			this.pageInstances.clear();
		}
	}
}