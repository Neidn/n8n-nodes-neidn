import { BrowserManager } from './BrowserManager';

export interface AuthCredentials {
    authUrl: string;
    loginAlias: string;
    username: string;
    password: string;
    smsCode?: string;
}

export class AuthenticationHandler {
    private browserManager: BrowserManager;

    constructor(browserManager: BrowserManager) {
        this.browserManager = browserManager;
    }

    async performAuthentication(credentials: AuthCredentials): Promise<void> {
        const { authUrl, loginAlias, username, password, smsCode } = credentials;

        console.log('Starting authentication process...');
        
        // Navigate to auth page
        await this.browserManager.navigateToPage(authUrl);
        
        // Fill login form
        await this.fillLoginForm(loginAlias, username, password);
        
        // Handle SMS authentication
        await this.handleSmsAuthentication(smsCode);
        
        console.log('Authentication completed successfully');
    }

    private async fillLoginForm(loginAlias: string, username: string, password: string): Promise<void> {
        console.log('Filling login form...');
        
        // Wait for and fill login alias
        await this.browserManager.waitForSelector('#loginAlias');
        await this.browserManager.fillInput('#loginAlias', loginAlias);
        
        // Fill username
        await this.browserManager.fillInput('#username', username);
        
        // Fill password
        await this.browserManager.fillInput('#passwordPlain', password);
        
        // Click login button
        await this.browserManager.clickElement('#loginForm > button');
        
        console.log('Login form submitted');
    }

    private async handleSmsAuthentication(smsCode?: string): Promise<void> {
        console.log('Handling SMS authentication...');
        
        // Press SMS auth button first
        await this.browserManager.clickElement('#app > div.popup > div.panel.certi > div.content > div:nth-child(3) > div.btn-wrap > a');
        
        const page = this.browserManager.getPage();
        
        // Set up dialog handler for alerts
        page.once('dialog', async (dialog) => {
            if (dialog.type() === 'alert') {
                await dialog.dismiss();
            }
        });

        if (smsCode) {
            // Headless mode: use provided SMS code
            console.log('Using provided SMS code for headless authentication');
            await this.browserManager.fillInput('#loginForm > div > input[type=text]', smsCode);
            await this.browserManager.clickElement('#loginForm > a');
            await this.browserManager.waitForNavigation();
        } else {
            // Interactive mode: wait for manual SMS input
            console.log('Waiting for manual SMS code input...');
            console.log('Please check your phone for the SMS code and enter it in the browser.');
            
            // Wait for SMS code to be entered manually
            await page.waitForFunction(
                "document.querySelector('#loginForm > div > input[type=text]').value.length > 5",
                { timeout: 300000 } // 5 minute timeout
            );
            
            console.log('SMS code detected in browser input field.');
            
            // Submit the SMS code
            await this.browserManager.clickElement('#loginForm > a');
            await this.browserManager.waitForNavigation();
        }
        
        console.log('SMS authentication completed');
    }

    async waitForAuthenticationComplete(): Promise<void> {
        const page = this.browserManager.getPage();
        
        // Wait until we're redirected away from auth page
        await page.waitForFunction(() => {
            return window.location.href.includes('console') || 
                   window.location.href.includes('dashboard');
        }, { timeout: 60000 });
        
        console.log('Authentication process verified complete');
    }
}