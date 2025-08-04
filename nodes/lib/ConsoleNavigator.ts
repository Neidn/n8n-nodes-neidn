import { BrowserManager } from './BrowserManager';

export class ConsoleNavigator {
    private browserManager: BrowserManager;

    constructor(browserManager: BrowserManager) {
        this.browserManager = browserManager;
    }

    async navigateToConsole(consoleUrl: string, timeout: number = 30000): Promise<void> {
        console.log('Navigating to NCP console...');
        
        await this.browserManager.navigateToPage(consoleUrl);
        
        // Handle popup dismissal
        await this.handlePopupDismissal(timeout);
        
        console.log('Console navigation completed');
    }

    private async handlePopupDismissal(timeout: number): Promise<void> {
        console.log('Checking for explanation popup...');
        
        const page = this.browserManager.getPage();
        
        try {
            // Wait for popup with specified timeout
            const popupSelector = 'input[type="checkbox"][name="notShowAgain"], input[type="checkbox"][id*="notShow"], .popup-checkbox, .modal-checkbox';
            await page.waitForSelector(popupSelector, { timeout });
            
            console.log('Popup detected, dismissing...');
            
            // Check the "don't show again" checkbox
            await this.browserManager.clickElement(popupSelector);
            
            // Look for and click the close/confirm button
            const buttonSelectors = [
                'button:has-text("확인")',
                'button:has-text("OK")', 
                'button:has-text("닫기")',
                'button:has-text("Close")',
                '.popup-close-button',
                '.modal-close-button',
                'button[type="submit"]'
            ];
            
            for (const selector of buttonSelectors) {
                const button = await page.$(selector);
                if (button) {
                    await button.click();
                    console.log(`Clicked button with selector: ${selector}`);
                    break;
                }
            }
            
            // Wait for popup to disappear
            await page.waitForFunction(() => {
                const popup = document.querySelector('.popup, .modal, .overlay') as HTMLElement;
                return !popup || popup.style.display === 'none';
            }, { timeout: 10000 });
            
            console.log('Popup dismissed successfully');
            
        } catch (error) {
            console.log('No popup found or popup handling failed - continuing...');
        }
    }

    async navigateToVpcPage(): Promise<void> {
        console.log('Navigating to VPC page...');
        
        const page = this.browserManager.getPage();
        
        // Look for VPC-related links or navigation elements
        const vpcSelectors = [
            'a:has-text("VPC")',
            'a[href*="vpc"]',
            '.nav-item:has-text("VPC")',
            '.menu-item:has-text("VPC")'
        ];
        
        for (const selector of vpcSelectors) {
            const element = await page.$(selector);
            if (element) {
                await element.click();
                console.log(`Clicked VPC navigation element: ${selector}`);
                await this.browserManager.waitForNavigation();
                break;
            }
        }
        
        console.log('VPC page navigation completed');
    }

    async navigateToSslVpnPage(sslVpnUrl: string): Promise<void> {
        console.log('Navigating to SSL VPN page...');
        
        await this.browserManager.navigateToPage(sslVpnUrl);
        
        // Wait for SSL VPN page to load
        await this.browserManager.waitForSelector('table, .data-table, .vpc-list', 10000);
        
        console.log('SSL VPN page loaded successfully');
    }

    async waitForPageReady(): Promise<void> {
        const page = this.browserManager.getPage();
        
        // Wait for page to be fully loaded and interactive
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        console.log('Page is ready for interaction');
    }
}