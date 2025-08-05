import { BrowserManager } from '../../lib/BrowserManager';
import { AuthenticationHandler, AuthCredentials } from '../../lib/AuthenticationHandler';

export class AuthenticateAction {
    async execute(credentials: any, debugPort: number, manualSms: boolean): Promise<any> {
        const browserManager = new BrowserManager();
        const authHandler = new AuthenticationHandler(browserManager);

        try {
            console.log('=== Starting SSL VPN Authentication ===');
            
            // Connect to debug browser
            await browserManager.connectToDebugBrowser(debugPort);
            
            // Prepare credentials
            const authCredentials: AuthCredentials = {
                authUrl: credentials.authUrl,
                loginAlias: credentials.loginAlias,
                username: credentials.username,
                password: credentials.password,
                smsCode: manualSms ? undefined : credentials.smsCode
            };
            
            // Perform authentication
            await authHandler.performAuthentication(authCredentials);
            
            console.log('SSL VPN Authentication completed successfully');
            return { 
                success: true, 
                message: 'Authentication completed successfully',
                step: 'authentication',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Authentication failed: ${errorMessage}`);
        }
    }
}