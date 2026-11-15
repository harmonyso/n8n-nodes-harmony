import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	INodeExecutionData,
	PostReceiveAction,
} from 'n8n-workflow';

export const BASE_URL = 'https://api.harmony.io';

type PaginationStyle =
	/** `page` (starts at 1) + `page_size` */
	| 'page'
	/** `offset` (starts at 0) + `limit` */
	| 'offset';

interface PaginationConfig {
	style: PaginationStyle;
	/** Where the paging parameters are sent */
	location?: 'qs' | 'body';
	/** Page size used while fetching every result; must not exceed the endpoint's maximum */
	pageSize: number;
}

/**
 * Fetches every page of a list endpoint. Used when "Return All" is on.
 *
 * Harmony list endpoints use one of two pagination styles (see
 * https://docs.harmony.io/api-reference/introduction#pagination). A page that
 * returns fewer items than requested is the last one.
 */
export function paginate({ style, location = 'qs', pageSize }: PaginationConfig) {
	return async function (
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		const results: INodeExecutionData[] = [];
		const sizeKey = style === 'page' ? 'page_size' : 'limit';
		const indexKey = style === 'page' ? 'page' : 'offset';
		let index = style === 'page' ? 1 : 0;

		while (true) {
			const current = (requestOptions.options[location] ?? {}) as IDataObject;
			requestOptions.options[location] = { ...current, [sizeKey]: pageSize, [indexKey]: index };

			const page = await this.makeRoutingRequest(requestOptions);
			results.push(...page);

			if (page.length < pageSize) break;
			index += style === 'page' ? 1 : pageSize;
		}

		return results;
	};
}

/**
 * Returns at most the given top-level fields of each item when the operation's
 * "Simplify" parameter is on.
 */
export function simplify(fields: string[]): PostReceiveAction {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
	): Promise<INodeExecutionData[]> {
		if (!this.getNodeParameter('simplify', false)) return items;

		return items.map((item) => {
			const simplified: IDataObject = {};
			for (const field of fields) {
				if (field in item.json) simplified[field] = item.json[field];
			}
			return { ...item, json: simplified };
		});
	};
}

/** Returns `{ "deleted": true }` for endpoints that answer a delete with no content */
export const deletedResponse: PostReceiveAction = {
	type: 'set',
	properties: { value: '={{ { "deleted": true } }}' },
};

/** Splits each item of a list response out of the given property */
export function itemsFrom(property: string): PostReceiveAction {
	return { type: 'rootProperty', properties: { property } };
}

/** Turns a comma-separated parameter into a list, e.g. "a, b" → ["a", "b"] */
export const CSV_TO_LIST =
	'={{ String($value).split(",").map((v) => v.trim()).filter((v) => v !== "") }}';

/** Parses a JSON parameter that may arrive as a string or an object */
export const JSON_VALUE = '={{ typeof $value === "string" ? JSON.parse($value) : $value }}';
