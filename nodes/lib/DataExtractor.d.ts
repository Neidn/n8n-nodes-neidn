import { BrowserManager } from './BrowserManager';
export interface VpcData {
    name: string;
    row_index: number;
    [key: string]: string | number;
}
export declare class DataExtractor {
    private browserManager;
    constructor(browserManager: BrowserManager);
    extractVpcData(): Promise<VpcData[]>;
    extractCustomData(selector: string): Promise<any[]>;
    extractTableData(tableSelector?: string): Promise<any[]>;
    waitForDataLoad(timeout?: number): Promise<void>;
}
//# sourceMappingURL=DataExtractor.d.ts.map