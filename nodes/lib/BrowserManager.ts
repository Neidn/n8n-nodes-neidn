import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    async connectToDebugBrowser(debugPort: number = 9222): Promise<Page> {
        try {
            console.log(`Connecting to debug browser on port ${debugPort}...`);
            this.browser = await chromium.connectOverCDP(`http://localhost:${debugPort}`);
            
            const contexts = this.browser.contexts();
            if (contexts.length > 0) {
                this.context = contexts[0];
            } else {
                this.context = await this.browser.newContext();
            }

            const pages = this.context.pages();
            if (pages.length > 0) {
                this.page = pages[0];
            } else {
                this.page = await this.context.newPage();
            }

            console.log('Successfully connected to debug browser');
            return this.page;
        } catch (error) {
            console.error('Failed to connect to debug browser:', error);
            throw new Error(`Failed to connect to debug browser on port ${debugPort}. Make sure Chrome is running with --remote-debugging-port=${debugPort}`);
        }
    }

    async navigateToPage(url: string): Promise<void> {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }

        console.log(`Navigating to: ${url}`);
        await this.page.goto(url, { waitUntil: 'networkidle' });
    }

    async waitForSelector(selector: string, timeout: number = 30000): Promise<void> {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }

        await this.page.waitForSelector(selector, { timeout });
    }

    async clickElement(selector: string): Promise<void> {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }

        await this.page.click(selector);
    }

    async fillInput(selector: string, value: string): Promise<void> {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }

        await this.page.fill(selector, value);
    }

    async waitForNavigation(timeout: number = 30000): Promise<void> {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }

        await this.page.waitForLoadState('networkidle', { timeout });
    }

    getPage(): Page {
        if (!this.page) {
            throw new Error('No page available. Connect to browser first.');
        }
        return this.page;
    }

    setPage(page: Page): void {
        this.page = page;
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}