import { type AxiosResponse } from 'axios';

export class ResponseCache extends Error {
	response: AxiosResponse<any, any>;

	constructor(cache: AxiosResponse<any, any>) {
		super('Cache');
		this.response = cache;
	}
}
