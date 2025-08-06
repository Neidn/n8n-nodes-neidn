import { BaseAction, PlaywrightActionContext } from './BaseAction';

export class CustomScriptAction extends BaseAction {
	async execute(context: PlaywrightActionContext): Promise<any> {
		const { executeFunctions, itemIndex, items, playwright } = context;

		const script = executeFunctions.getNodeParameter('customScript', itemIndex) as string;

		// Create async function from script using Function constructor
		// @ts-ignore
		const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
		const asyncFunction = new AsyncFunction(
			'items',
			'$json',
			'$index',
			'playwright',
			'console',
			'require',
			script
		);

		// Prepare context for script execution
		const scriptConsole = this.createScriptConsole(itemIndex);
		const scriptRequire = this.createScriptRequire(executeFunctions);

		// Execute script with context
		return await asyncFunction(
			items,
			items[itemIndex].json,
			itemIndex,
			playwright,
			scriptConsole,
			scriptRequire
		);
	}
}