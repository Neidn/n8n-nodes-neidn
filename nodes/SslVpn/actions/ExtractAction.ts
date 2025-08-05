import { BrowserManager } from '../../lib/BrowserManager';
import { AuthenticationHandler, AuthCredentials } from '../../lib/AuthenticationHandler';
import { ConsoleNavigator } from '../../lib/ConsoleNavigator';
import { DataExtractor } from '../../lib/DataExtractor';

export class ExtractAction {
    async execute(credentials: any, debugPort: number, manualSms: boolean, popupTimeout: number, dataTimeout: number): Promise<any> {
        const browserManager = new BrowserManager();
        const authHandler = new AuthenticationHandler(browserManager);
        const consoleNavigator = new ConsoleNavigator(browserManager);
        const dataExtractor = new DataExtractor(browserManager);

        try {
            console.log('=== Starting SSL VPN Full Process with Data Extraction ===');
            
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
            
            // Step 3: SSL VPN Page Navigation
            console.log('Step 3: Navigating to SSL VPN page...');
            await consoleNavigator.navigateToSslVpnPage(credentials.sslVpnConsoleUrl);
            console.log('Step 3: SSL VPN page navigation completed successfully');
            
            // Step 4: Data Extraction
            console.log('Step 4: Extracting VPC data...');
            await dataExtractor.waitForDataLoad(dataTimeout);
            const vpcData = await dataExtractor.extractVpcData();
            console.log(`Step 4: VPC data extraction completed successfully (${vpcData.length} items)`);
            
            return { 
                success: true, 
                message: 'Full SSL VPN process with data extraction completed successfully',
                steps: ['authentication', 'console', 'ssl_vpn_navigation', 'data_extraction'],
                timestamp: new Date().toISOString(),
                data: vpcData,
                count: vpcData.length
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Data extraction failed: ${errorMessage}`);
        }
    }
}