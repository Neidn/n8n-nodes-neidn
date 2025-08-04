import { BrowserManager } from './BrowserManager';

export interface VpcData {
    name: string;
    row_index: number;
    [key: string]: string | number;
}

export class DataExtractor {
    private browserManager: BrowserManager;

    constructor(browserManager: BrowserManager) {
        this.browserManager = browserManager;
    }

    async extractVpcData(): Promise<VpcData[]> {
        console.log('Starting VPC data extraction...');
        
        const page = this.browserManager.getPage();
        
        // Wait for table to be present
        await this.browserManager.waitForSelector('table, .data-table, .vpc-list');
        
        // Extract data from table
        const vpcData = await page.evaluate(() => {
            const results: VpcData[] = [];
            
            // Find the main data table
            const tables = Array.from(document.querySelectorAll('table'));
            let targetTable: HTMLTableElement | null = null;
            
            // Look for table with VPC data (usually has headers like Name, Status, etc.)
            for (const table of tables) {
                const headers = table.querySelectorAll('th, .header-cell');
                const headerText = Array.from(headers).map((h: Element) => h.textContent?.toLowerCase() || '');
                
                if (headerText.some(text => text.includes('name') || text.includes('vpc') || text.includes('status'))) {
                    targetTable = table;
                    break;
                }
            }
            
            if (!targetTable) {
                console.warn('No suitable table found, trying first table');
                targetTable = tables[0] as HTMLTableElement;
            }
            
            if (!targetTable) {
                throw new Error('No data table found on the page');
            }
            
            // Extract headers
            const headerRow = targetTable.querySelector('thead tr, tr:first-child');
            const headers: string[] = [];
            
            if (headerRow) {
                const headerCells = headerRow.querySelectorAll('th, td');
                headerCells.forEach(cell => {
                    const text = cell.textContent?.trim() || '';
                    headers.push(text);
                });
            }
            
            // Extract data rows
            const dataRows = targetTable.querySelectorAll('tbody tr, tr:not(:first-child)');
            
            dataRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                const rowData: VpcData = {
                    name: '',
                    row_index: index + 1
                };
                
                cells.forEach((cell, cellIndex) => {
                    const cellText = cell.textContent?.trim() || '';
                    const headerName = headers[cellIndex] || `column_${cellIndex + 1}`;
                    
                    // Set the name field from the first column or name column
                    if (cellIndex === 0 || headerName.toLowerCase().includes('name')) {
                        rowData.name = cellText;
                    }
                    
                    // Add all columns as properties
                    rowData[headerName.toLowerCase().replace(/\s+/g, '_')] = cellText;
                });
                
                // Only add rows that have meaningful data
                if (rowData.name || Object.keys(rowData).length > 2) {
                    results.push(rowData);
                }
            });
            
            return results;
        });
        
        console.log(`Extracted ${vpcData.length} VPC records`);
        return vpcData;
    }

    async extractCustomData(selector: string): Promise<any[]> {
        console.log(`Extracting custom data with selector: ${selector}`);
        
        const page = this.browserManager.getPage();
        
        await this.browserManager.waitForSelector(selector);
        
        const customData = await page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            const results: any[] = [];
            
            elements.forEach((element, index) => {
                results.push({
                    index: index + 1,
                    text: element.textContent?.trim() || '',
                    html: element.innerHTML,
                    attributes: Array.from(element.attributes).reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {} as Record<string, string>)
                });
            });
            
            return results;
        }, selector);
        
        console.log(`Extracted ${customData.length} custom data items`);
        return customData;
    }

    async extractTableData(tableSelector?: string): Promise<any[]> {
        console.log('Extracting table data...');
        
        const page = this.browserManager.getPage();
        
        const selector = tableSelector || 'table';
        await this.browserManager.waitForSelector(selector);
        
        const tableData = await page.evaluate((sel) => {
            const table = document.querySelector(sel) as HTMLTableElement;
            if (!table) {
                throw new Error(`Table not found with selector: ${sel}`);
            }
            
            const results: any[] = [];
            const rows = table.querySelectorAll('tr');
            
            if (rows.length === 0) {
                return results;
            }
            
            // Get headers from first row
            const headerRow = rows[0];
            const headers: string[] = [];
            headerRow.querySelectorAll('th, td').forEach(cell => {
                headers.push(cell.textContent?.trim() || '');
            });
            
            // Process data rows
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td');
                const rowData: any = { row_index: i };
                
                cells.forEach((cell, cellIndex) => {
                    const headerName = headers[cellIndex] || `column_${cellIndex + 1}`;
                    const cellValue = cell.textContent?.trim() || '';
                    rowData[headerName.toLowerCase().replace(/\s+/g, '_')] = cellValue;
                });
                
                results.push(rowData);
            }
            
            return results;
        }, selector);
        
        console.log(`Extracted ${tableData.length} table rows`);
        return tableData;
    }

    async waitForDataLoad(timeout: number = 30000): Promise<void> {
        console.log('Waiting for data to load...');
        
        const page = this.browserManager.getPage();
        
        // Wait for any loading indicators to disappear
        await page.waitForFunction(() => {
            const loadingElements = document.querySelectorAll('.loading, .spinner, .loader');
            return loadingElements.length === 0;
        }, { timeout });
        
        // Wait for data tables to be present
        await page.waitForFunction(() => {
            const tables = document.querySelectorAll('table');
            return tables.length > 0 && tables[0].querySelectorAll('tr').length > 1;
        }, { timeout });
        
        console.log('Data loading completed');
    }
}