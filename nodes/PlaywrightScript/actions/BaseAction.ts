import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

import type { Browser, BrowserType } from 'playwright';

export interface PlaywrightActionContext {
	executeFunctions: IExecuteFunctions;
	itemIndex: number;
	items: INodeExecutionData[];
	playwright: any;
}

export abstract class BaseAction {
	protected browserInstances = new Map<string, Browser>();

	protected async getBrowserInstance(
		browserType: string,
		playwright: any,
		options: any = {},
	): Promise<Browser> {
		const cacheKey = `${browserType}-${JSON.stringify(options)}`;

		if (this.browserInstances.has(cacheKey)) {
			const browser = this.browserInstances.get(cacheKey)!;
			if (browser.isConnected()) {
				return browser;
			} else {
				this.browserInstances.delete(cacheKey);
			}
		}

		// Force chromium browser
		const browserEngine = playwright.chromium as BrowserType;
		const launchOptions = {
			executablePath: '/usr/bin/chromium-browser', // Alpine Docker chromium path
			headless: options.headless !== false, // Always headless unless explicitly set to false
			ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? false,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		};

		const browser = await browserEngine.launch(launchOptions);
		this.browserInstances.set(cacheKey, browser);
		return browser;
	}

	public async cleanupBrowsers(): Promise<void> {
		for (const [key, browser] of this.browserInstances) {
			try {
				if (browser.isConnected()) {
					await browser.close();
				}
			} catch (error) {
				// Ignore cleanup errors
			}
			this.browserInstances.delete(key);
		}
	}

	protected createScriptConsole(itemIndex: number) {
		return {
			log: (...args: any[]) => {
				// eslint-disable-next-line no-console
				console.log(`[PlaywrightScript Item ${itemIndex}]:`, ...args);
			},
			error: (...args: any[]) => {
				// eslint-disable-next-line no-console
				console.error(`[PlaywrightScript Item ${itemIndex}]:`, ...args);
			},
		};
	}

	protected createScriptRequire(executeFunctions: IExecuteFunctions) {
		return (moduleName: string) => {
			// Allow require for common modules using dynamic import for Alpine compatibility
			const allowedModules = ['fs', 'path', 'crypto', 'util', 'os', 'url'];
			if (allowedModules.includes(moduleName)) {
				// Use dynamic import for Alpine Docker compatibility
				try {
					return eval(`require('${moduleName}')`);
				} catch (error) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						`Failed to load module '${moduleName}': ${error}`,
					);
				}
			}
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Module '${moduleName}' is not allowed for security reasons`,
			);
		};
	}

	abstract execute(context: PlaywrightActionContext, ...args: any[]): Promise<any>;
}
