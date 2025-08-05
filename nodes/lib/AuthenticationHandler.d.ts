import { BrowserManager } from './BrowserManager';
export interface AuthCredentials {
    authUrl: string;
    loginAlias: string;
    username: string;
    password: string;
    smsCode?: string;
}
export declare class AuthenticationHandler {
    private browserManager;
    constructor(browserManager: BrowserManager);
    performAuthentication(credentials: AuthCredentials): Promise<void>;
    private fillLoginForm;
    private handleSmsAuthentication;
    waitForAuthenticationComplete(): Promise<void>;
}
//# sourceMappingURL=AuthenticationHandler.d.ts.map