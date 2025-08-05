import { Page } from 'playwright';
export declare class BrowserManager {
    private browser;
    private context;
    private page;
    connectToDebugBrowser(debugPort?: number): Promise<Page>;
    navigateToPage(url: string): Promise<void>;
    waitForSelector(selector: string, timeout?: number): Promise<void>;
    clickElement(selector: string): Promise<void>;
    fillInput(selector: string, value: string): Promise<void>;
    waitForNavigation(timeout?: number): Promise<void>;
    getPage(): Page;
    setPage(page: Page): void;
    close(): Promise<void>;
}
//# sourceMappingURL=BrowserManager.d.ts.map