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
				const headerText = Array.from(headers).map(
					(h: Element) => h.textContent?.toLowerCase() || '',
				);

				if (
					headerText.some(
						(text) => text.includes('name') || text.includes('vpc') || text.includes('status'),
					)
				) {
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
				headerCells.forEach((cell) => {
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
					row_index: index + 1,
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
					attributes: Array.from(element.attributes).reduce(
						(acc, attr) => {
							acc[attr.name] = attr.value;
							return acc;
						},
						{} as Record<string, string>,
					),
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
			headerRow.querySelectorAll('th, td').forEach((cell) => {
				headers.push(cell.textContent?.trim() || '');
			});

			// Process data rows
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const cells = row.querySelectorAll('td');
				const rowData: any = { row_index: i };

				cells.forEach((cell, cellIndex) => {
					const headerName = headers[cellIndex] || `column_${cellIndex + 1}`;
					rowData[headerName.toLowerCase().replace(/\s+/g, '_')] = cell.textContent?.trim() || '';
				});

				results.push(rowData);
			}

			return results;
		}, selector);

		console.log(`Extracted ${tableData.length} table rows`);
		return tableData;
	}

	async getAllSslVpnUsersFromVpnData(vpnData: VpcData[]): Promise<any[]> {
		const allUsersData: any[] = [];

		console.log(`Processing ${vpnData.length} VPNs from step3 data`);

		// Loop through each VPN from the provided VPN data
		for (let i = 0; i < vpnData.length; i++) {
			const vpn = vpnData[i];
			const tbodyChildNumber = vpn.row_index + 1; // Convert row_index to tbody child number

			console.log(
				`\n=== Processing VPN ${i + 1}/${vpnData.length}: "${vpn.name}" (tbody:nth-child(${tbodyChildNumber})) ===`,
			);

			try {
				// Get users for this specific VPN
				const vpnUsers = await this.getSslVpnUsers(tbodyChildNumber);

				// Add VPN identifier to each user record
				const vpnUsersWithId = vpnUsers.map((user) => ({
					...user,
					vpn_number: i + 1,
					vpn_name: vpn.name,
					vpn_row_index: vpn.row_index,
					vpn_tbody_child: tbodyChildNumber,
				}));

				allUsersData.push(...vpnUsersWithId);

				// Wait a bit before processing next VPN
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				console.error(
					`Error processing VPN ${i + 1} "${vpn.name}" (tbody:nth-child(${tbodyChildNumber})):`,
					error,
				);
				// Try to close modal and continue with next VPN
				try {
					const page = this.browserManager.getPage();
					const modalCloseSelector =
						'.modal-content > .modal-body > button.btn-wrap.justify-content-center > button.btn.btn-lg.line-2';
					await page.click(modalCloseSelector);
				} catch (e) {
					console.log('Close button not found in error handling, trying Escape key');
					const page = this.browserManager.getPage();
					await page.keyboard.press('Escape');
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log(
			`\n=== Total extracted ${allUsersData.length} SSL VPN users from ${vpnData.length} VPNs ===`,
		);
		return allUsersData;
	}

	async getSslVpnUsers(tbodyChildNumber: number = 3): Promise<any[]> {
		const page = this.browserManager.getPage();

		// Check the checkbox using the provided tbody child number
		const checkboxSelector = `#app > div > div.ph-30.page-body > div.scroll-tbl > div.tbody > table > tbody:nth-child(${tbodyChildNumber})`;

		console.log(`Found ${checkboxSelector} (tbody:nth-child(${tbodyChildNumber})):`);

		// Click the checkbox to select all users
		await page.click(checkboxSelector);
		console.log(`Checkbox for tbody:nth-child(${tbodyChildNumber}) clicked`);

		// Press the button
		const buttonSelector =
			'#app > div > div.ph-30.page-body > div.sticky-holder > div > div > div > button:nth-child(2)';
		await page.click(buttonSelector);
		console.log('Button clicked');

		// Wait for the modal content to appear
		await page.waitForSelector('.modal-content', { state: 'visible', timeout: 5000 });

		// Extract users data using the specific selector
		console.log(`Extracting SSL VPN users data for tbody:nth-child(${tbodyChildNumber})...`);
		const usersData = await this.extractUsersFromDOM(page);

		console.log(
			`Extracted ${usersData.length} SSL VPN users from tbody:nth-child(${tbodyChildNumber})`,
		);

		// Go to SSL VPN page after extracting data
		const sslVpnUrl = process.env.SSL_VPN_CONSOLE_URL;
		if (sslVpnUrl) {
			console.log('Navigating back to SSL VPN page...');
			await page.goto(sslVpnUrl);
			await page.waitForLoadState();
			console.log('Successfully navigated to SSL VPN page');
		} else {
			console.warn('SSL_VPN_CONSOLE_URL not found in environment variables');
		}

		return usersData;
	}

	private async extractUsersFromDOM(page: any): Promise<any[]> {
		console.log('Running DOM extraction function...');

		// Enable console logging from browser context
		page.on('console', (msg: any) => {
			console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
		});

		const results = await page.evaluate(() => {
			const extractedData: any[] = [];
			const debugInfo: string[] = [];

			// First, let's debug the DOM structure
			debugInfo.push('=== DOM DEBUG ===');

			// Find div element with 'modal-content' class
			const modalContent = document.querySelector('.modal-content');
			debugInfo.push(`Modal content found: ${!!modalContent}`);

			if (!modalContent) {
				debugInfo.push('No modal-content element found');
				return { extractedData, debugInfo };
			}

			debugInfo.push(`Modal content HTML: ${modalContent.outerHTML.substring(0, 500)}...`);

			// Use specific data tbody selector
			const dataTbodyFromModalSelector =
				'.modal-body > .box > .scrool-tbl > div.tbody > .mCustomScrollBox > div > table';
			const dataTbody = modalContent.querySelector(dataTbodyFromModalSelector);

			debugInfo.push(`Data tbody found with specific selector: ${!!dataTbody}`);
			if (dataTbody) {
				debugInfo.push(`Data tbody HTML: ${dataTbody.outerHTML.substring(0, 500)}...`);
			} else {
				debugInfo.push(
					'Data tbody not found with specific selector, checking modal-content for div.tbody...',
				);
				const modalTbody = modalContent.querySelector('div.tbody');
				debugInfo.push(`Modal content div.tbody found: ${!!modalTbody}`);
				if (modalTbody) {
					debugInfo.push(
						`Modal content div.tbody HTML: ${modalTbody.outerHTML.substring(0, 500)}...`,
					);
				}
			}

			// Get the tbody element (try specific selector first, then fallback to modal content)
			const tbody = dataTbody || modalContent.querySelector('div.tbody');

			if (!tbody) {
				debugInfo.push('No data tbody element found');
				return { extractedData, debugInfo };
			}

			// Now get all tr elements from the data tbody
			const userRows = Array.from(tbody.querySelectorAll('tr'));

			debugInfo.push(`Found ${userRows.length} user rows in modal content table`);

			// Print each row for debugging
			userRows.forEach((row, index: number) => {
				const rowElement = row as HTMLElement;
				debugInfo.push(`Row ${index + 1} HTML: ${rowElement.outerHTML.substring(0, 200)}...`);
				const cells = Array.from(rowElement.querySelectorAll('td'));
				debugInfo.push(`Row ${index + 1} has ${cells.length} cells`);
			});

			if (userRows.length === 0) {
				debugInfo.push('No user rows found in modal content, checking alternative approaches...');

				// Try alternative selectors within the modal content
				const altSelectors = ['tr', 'tbody tr', 'table tr'];

				altSelectors.forEach((selector) => {
					const altRows = modalContent.querySelectorAll(selector);
					debugInfo.push(
						`Alternative selector "${selector}" in modal content found ${altRows.length} rows`,
					);
				});

				return { extractedData, debugInfo };
			}

			// Extract data from found rows
			userRows.forEach((row, index: number) => {
				const rowElement = row as HTMLElement;
				const cells = Array.from(rowElement.querySelectorAll('td'));
				if (cells.length > 0) {
					const userData: any = { user_index: index + 1 };
					cells.forEach((cell: Element, cellIndex: number) => {
						userData[`column_${cellIndex + 1}`] = cell.textContent?.trim() || '';
					});
					extractedData.push(userData);
				}
			});

			return { extractedData, debugInfo };
		});

		// Print all debug information from browser context
		results.debugInfo.forEach((info: string) => {
			console.log(`[DOM] ${info}`);
		});

		console.log(`DOM extraction completed, found ${results.extractedData.length} records`);
		return results.extractedData;
	}

	async getSeparatedData(): Promise<{ vpcData: VpcData[]; userData: any[] }> {
		console.log('Getting separated VPC and user data...');

		// Get VPC data first
		const vpcData = await this.extractVpcData();

		// Get SSL VPN users data
		const userData = await this.getSslVpnUsers();

		return {
			vpcData,
			userData,
		};
	}

	async waitForDataLoad(timeout: number = 30000): Promise<void> {
		console.log('Waiting for data to load...');

		const page = this.browserManager.getPage();

		// Wait for any loading indicators to disappear
		await page.waitForFunction(
			() => {
				const loadingElements = document.querySelectorAll('.loading, .spinner, .loader');
				return loadingElements.length === 0;
			},
			{ timeout },
		);

		// Wait for data tables to be present
		await page.waitForFunction(
			() => {
				const tables = document.querySelectorAll('table');
				return tables.length > 0 && tables[0].querySelectorAll('tr').length > 1;
			},
			{ timeout },
		);

		console.log('Data loading completed');
	}
}
