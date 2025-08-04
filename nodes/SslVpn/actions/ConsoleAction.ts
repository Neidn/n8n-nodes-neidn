import { BrowserManager } from '../../lib/BrowserManager';
import { AuthenticationHandler, AuthCredentials } from '../../lib/AuthenticationHandler';
import { ConsoleNavigator } from '../../lib/ConsoleNavigator';

export class ConsoleAction {
    async execute(credentials: any, debugPort: number, manualSms: boolean, popupTimeout: number): Promise<any> {
        const browserManager = new BrowserManager();
        const authHandler = new AuthenticationHandler(browserManager);
        const consoleNavigator = new ConsoleNavigator(browserManager);

        try {
            console.log('=== Starting SSL VPN Authentication + Console Navigation ===');
            
            // Connect to debug browser
            await browserManager.connectToDebugBrowser(debugPort);
            
            // Step 1: Authentication
            console.log('Step 1: Performing authentication...');
            const authCredentials: AuthCredentials = {
                authUrl: credentials.authUrl,
                loginAlias: credentials.loginAlias,
                username: credentials.username,
                password: credentials.password,
                smsCode: manualSms ? undefined : credentials.smsCode
            };
            
            await authHandler.performAuthentication(authCredentials);
            console.log('Step 1: Authentication completed successfully');
            
            // Step 2: Console Navigation
            console.log('Step 2: Navigating to console...');
            await consoleNavigator.navigateToConsole(credentials.consoleUrl, popupTimeout);
            console.log('Step 2: Console navigation completed successfully');
            
            return { 
                success: true, 
                message: 'Authentication and console navigation completed successfully',
                steps: ['authentication', 'console'],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Console navigation failed: ${error.message}`);
        }
    }
}