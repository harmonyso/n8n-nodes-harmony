import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { BASE_URL } from './transport';

const EMPLOYEE_PAGE_SIZE = 50;

async function harmonyRequest(
	this: ILoadOptionsFunctions,
	url: string,
	qs: IDataObject = {},
): Promise<IDataObject> {
	return (await this.helpers.httpRequestWithAuthentication.call(this, 'harmonyApi', {
		method: 'GET',
		baseURL: BASE_URL,
		url,
		qs,
		json: true,
	})) as IDataObject;
}

export async function searchDesks(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await harmonyRequest.call(this, '/service-desk/api/v1/desks/');
	const desks = (response.desks ?? []) as IDataObject[];
	const query = filter?.toLowerCase();

	const results: INodeListSearchItems[] = desks
		.map((desk) => ({ name: String(desk.name ?? desk.id), value: String(desk.id) }))
		.filter(
			(desk) =>
				!query ||
				desk.name.toLowerCase().includes(query) ||
				desk.value.toLowerCase().includes(query),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results };
}

export async function searchEmployees(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const offset = paginationToken ? Number(paginationToken) : 0;
	const qs: IDataObject = { limit: EMPLOYEE_PAGE_SIZE, offset, sort_by: 'display_name' };
	if (filter) qs.q = filter;

	const response = await harmonyRequest.call(this, '/employees/api/v1/employees/', qs);
	const employees = (response.items ?? []) as IDataObject[];
	const total = Number(response.total_count ?? 0);

	const results: INodeListSearchItems[] = employees.map((employee) => {
		const label = employee.display_name ?? employee.work_email ?? employee.id;
		const email = employee.work_email ? ` (${String(employee.work_email)})` : '';
		return { name: `${String(label)}${email}`, value: String(employee.id) };
	});

	const next = offset + employees.length;
	return {
		results,
		paginationToken: employees.length > 0 && next < total ? String(next) : undefined,
	};
}
