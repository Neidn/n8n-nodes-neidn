import { BrowserManager } from './BrowserManager';
export declare class ConsoleNavigator {
    private browserManager;
    constructor(browserManager: BrowserManager);
    navigateToConsole(consoleUrl: string, timeout?: number): Promise<void>;
    private handlePopupDismissal;
    navigateToVpcPage(): Promise<void>;
    navigateToSslVpnPage(sslVpnUrl: string): Promise<void>;
    waitForPageReady(): Promise<void>;
}
//# sourceMappingURL=ConsoleNavigator.d.ts.map