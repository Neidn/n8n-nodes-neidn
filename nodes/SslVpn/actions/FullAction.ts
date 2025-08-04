import { ExtractAction } from './ExtractAction';

export class FullAction {
    private extractAction: ExtractAction;

    constructor() {
        this.extractAction = new ExtractAction();
    }

    async execute(credentials: any, debugPort: number, manualSms: boolean, popupTimeout: number, dataTimeout: number): Promise<any> {
        // Full process is the same as data extraction since it includes all steps
        console.log('=== Starting Full SSL VPN Process ===');
        
        const result = await this.extractAction.execute(credentials, debugPort, manualSms, popupTimeout, dataTimeout);
        
        // Update message to reflect full process
        return {
            ...result,
            message: 'Complete SSL VPN automation process finished successfully'
        };
    }
}