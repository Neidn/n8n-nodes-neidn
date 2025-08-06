import type { Browser, Page } from 'playwright';
import { BaseAction, PlaywrightActionContext } from './BaseAction';

export class ManagedScriptAction extends BaseAction {
	async execute(
		context: PlaywrightActionContext,
		sharedBrowser: Browser | null = null,
		reuseBrowser: boolean = false,
	): Promise<any> {
		const { executeFunctions, itemIndex, items, playwright } = context;

		const script = executeFunctions.getNodeParameter('script', itemIndex) as string;
		const browserType = executeFunctions.getNodeParameter('browserType', itemIndex, 'chromium') as string;
		const browserOptions = executeFunctions.getNodeParameter('browserOptions', itemIndex, {}) as any;

		let browser: Browser;
		let page: Page | null = null;
		let shouldCloseBrowser = false;

		if (reuseBrowser && sharedBrowser) {
			browser = sharedBrowser;
		} else {
			browser = await this.getBrowserInstance(browserType, playwright, browserOptions);
			shouldCloseBrowser = !reuseBrowser;
		}

		try {
			page = await browser.newPage();

			// Configure page
			if (browserOptions.viewportWidth && browserOptions.viewportHeight) {
				await page.setViewportSize({
					width: browserOptions.viewportWidth,
					height: browserOptions.viewportHeight,
				});
			}

			if (browserOptions.userAgent) {
				await page.setExtraHTTPHeaders({
					'User-Agent': browserOptions.userAgent,
				});
			}

			if (browserOptions.navigationTimeout) {
				page.setDefaultNavigationTimeout(browserOptions.navigationTimeout);
			}

			if (browserOptions.defaultTimeout) {
				page.setDefaultTimeout(browserOptions.defaultTimeout);
			}

			// Create async function from script
			// @ts-ignore
			const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
			const asyncFunction = new AsyncFunction(
				'items',
				'$json',
				'$index',
				'page',
				'browser',
				'playwright',
				'console',
				script
			);

			// Prepare context for script execution
			const scriptConsole = this.createScriptConsole(itemIndex);

			// Execute script with context
			const result = await asyncFunction(
				items,
				items[itemIndex].json,
				itemIndex,
				page,
				browser,
				playwright,
				scriptConsole
			);

			return { ...result, browser: reuseBrowser ? browser : undefined };

		} finally {
			if (page) {
				try {
					await page.close();
				} catch (error) {
					// Ignore page close errors
				}
			}
			
			if (shouldCloseBrowser && browser) {
				try {
					await browser.close();
				} catch (error) {
					// Ignore browser close errors
				}
			}
		}
	}
}