import { createPromise, Fn, isNumber, isString, upperCase } from '@wang-yige/utils';
import axios, { Axios, type InternalAxiosRequestConfig, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { CustomConfig } from './config';
import { Methods } from './utils/methods';
import { ResponseCache } from './utils/cache';
import { RequestSingle, SingleQueue, SingleType } from './utils/single';
import { createAbortController } from './utils/abort';

type RequestConfig<D = any> = AxiosRequestConfig<D> & CustomConfig;

type ResponseConfig = { config: InternalAxiosRequestConfig<any> & CustomConfig };

export class APIRequest {
	/** The type of single */
	static Single = SingleType;

	#userAgent: string = 'axios-package';
	#axios: Axios;
	#cacheKeys: WeakMap<InternalAxiosRequestConfig, string> = new WeakMap();
	#cache: Map<string, { response: AxiosResponse; timestamp: number }> = new Map();
	#singleKeys: WeakMap<InternalAxiosRequestConfig, string> = new WeakMap();
	#singleQueues: Record<string, SingleQueue> = {};

	constructor(baseURL: string) {
		if (!isString(baseURL)) {
			throw new Error(`APIRequest: baseURL must be a string`);
		}
		this.#axios = new Axios({ baseURL });
		this.#axios.interceptors.request.use(
			(value: InternalAxiosRequestConfig & CustomConfig) => {
				const { cache = false, cacheTime, single = true, singleType = SingleType.QUEUE, headers } = value;
				if (cache === true) {
					const cacheValue = this.#getCache(value);
					if (cacheValue) {
						const { response, timestamp } = cacheValue;
						if (isNumber(cacheTime) && cacheTime > 0 && Date.now() - timestamp > cacheTime) {
							this.#deleteCache(value);
						} else if (response) {
							throw new ResponseCache(response);
						}
					}
				}
				if (!this.#userAgent) {
					delete headers?.['User-Agent'];
				} else if (headers) {
					headers['User-Agent'] = this.#userAgent;
				}
				createAbortController(value);
				if (single !== false) {
					if (singleType === SingleType.QUEUE) {
						if (!this.#singleQueues[this.#singleKey(value)]) {
							this.#singleQueues[this.#singleKey(value)] = new SingleQueue();
						}
						const queue = this.#singleQueues[this.#singleKey(value)];
						const { promise, resolve, reject } = createPromise<AxiosResponse>();
						queue.enQueue(async () => {
							try {
								const response = await axios(value);
								resolve(response);
							} catch (error) {
								reject(error);
							}
						});
						throw new RequestSingle(promise);
					} else if (singleType === SingleType.NEXT) {
					} else if (singleType === SingleType.PREV) {
					}
				}
				return value;
			},
			err => {
				return Promise.reject(err);
			},
		);
		this.#axios.interceptors.response.use(
			(value: AxiosResponse<any, any> & ResponseConfig) => {
				const { cache = false, single = true, singleType = SingleType.QUEUE } = value.config;
				if (cache === true && !this.#hasCache(value.config)) {
					this.#setCache(value.config, value);
				}
				return value;
			},
			err => {
				if (err instanceof ResponseCache) {
					return Promise.resolve(err.response);
				}
				if (err instanceof RequestSingle) {
					return Promise.resolve(err.promise);
				}
				return Promise.reject(err);
			},
		);
	}

	get response() {
		return this.#axios.interceptors.response;
	}

	get request() {
		return this.#axios.interceptors.request;
	}

	get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>) {
		return this.#axios.get<T, R, D>(url, config);
	}

	post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>) {
		return this.#axios.post<T, R, D>(url, data, config);
	}

	put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>) {
		return this.#axios.put<T, R, D>(url, data, config);
	}

	delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>) {
		return this.#axios.delete<T, R, D>(url, config);
	}

	userAgent(str: string) {
		this.#userAgent = str;
	}

	// Single

	#singleKey(config: InternalAxiosRequestConfig) {
		if (this.#singleKeys.has(config)) {
			return this.#singleKeys.get(config)!;
		}
		const { method = Methods.GET } = config;
		const key = `//${upperCase(method)}::${config.baseURL}${config.url}`;
		this.#singleKeys.set(config, key);
		return key;
	}

	// Cache methods

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
