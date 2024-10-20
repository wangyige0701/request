import type { InternalAxiosRequestConfig, AxiosResponse, Axios } from 'axios';
import { isNumber, upperCase } from '@wang-yige/utils';
import type { InterceptRequestConfig, InterceptResponseConfig } from '@/config';
import { Methods } from './methods';

export class ResponseCache {
	response: AxiosResponse<any, any>;

	constructor(cache: AxiosResponse<any, any>) {
		this.response = cache;
	}
}

export class CacheController {
	#axios: Axios;
	#cacheKeys: WeakMap<InternalAxiosRequestConfig, string> = new WeakMap();
	#cache: Map<string, { response: AxiosResponse; timestamp: number }> = new Map();

	constructor(axios: Axios) {
		this.#axios = axios;
	}

	request(config: InterceptRequestConfig) {
		const { cache = false, cacheTime } = config;
		if (cache !== true) {
			return;
		}
		const cacheValue = this.#getCache(config);
		if (cacheValue) {
			const { response, timestamp } = cacheValue;
			if (isNumber(cacheTime) && cacheTime > 0 && Date.now() - timestamp > cacheTime) {
				this.#deleteCache(config);
			} else {
				throw new ResponseCache(response);
			}
		}
	}

	response(config: InterceptResponseConfig['config'], response: AxiosResponse & InterceptResponseConfig) {
		const { cache = false } = config;
		if (cache === true && !this.#hasCache(config)) {
			this.#setCache(config, response);
		}
	}

	#cacheKey(config: InternalAxiosRequestConfig) {
		if (this.#cacheKeys.has(config)) {
			return this.#cacheKeys.get(config)!;
		}
		const { method = Methods.GET } = config;
		const methodUpper = upperCase(method);
		if (methodUpper !== Methods.GET) {
			throw new Error('cache only support GET method');
		}
		const key = `//${methodUpper}::${this.#axios.getUri(config)}`;
		this.#cacheKeys.set(config, key);
		return key;
	}

	#hasCache(config: InternalAxiosRequestConfig) {
		return this.#cache.has(this.#cacheKey(config));
	}

	#getCache(config: InternalAxiosRequestConfig) {
		if (this.#hasCache(config)) {
			return this.#cache.get(this.#cacheKey(config))!;
		}
	}

	#setCache(config: InternalAxiosRequestConfig, cache: AxiosResponse<any, any>) {
		return this.#cache.set(this.#cacheKey(config), { response: cache, timestamp: Date.now() });
	}

	#deleteCache(config: InternalAxiosRequestConfig) {
		return this.#cache.delete(this.#cacheKey(config));
	}
}
