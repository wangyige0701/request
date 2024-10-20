import { Fn, hasOwn, isString, nextTick } from '@wang-yige/utils';
import { Axios, type InternalAxiosRequestConfig, type AxiosResponse, AxiosInterceptorManager } from 'axios';
import type { AbortPromise, RequestConfig, InterceptRequestConfig, InterceptResponseConfig } from './config';
import { CacheController, ResponseCache } from './utils/cache';
import { RequestSingle, SingleController, SingleType } from './utils/single';
import { createAbortController } from './utils/abort';

export class APIRequest {
	/** The type of single */
	static Single = SingleType;

	#axios: Axios;
	#userAgent: string = 'axios-package';
	#requestInterceptor: {
		onFulfilled: (
			value: InternalAxiosRequestConfig<any>,
		) => InternalAxiosRequestConfig<any> | Promise<InternalAxiosRequestConfig<any>>;
		onRejected: (error: any) => any;
	};
	#requestInterceptorIndex: number;
	// ===== controller =====
	#cacheController: CacheController;
	#singleController: SingleController;
	// ======================

	constructor(baseURL: string) {
		if (!isString(baseURL)) {
			throw new Error(`APIRequest: baseURL must be a string`);
		}
		this.#axios = new Axios({ baseURL });
		this.#cacheController = new CacheController(this.#axios);
		this.#singleController = new SingleController(this.#axios);

		this.#requestInterceptor = {
			onFulfilled: (config: InterceptRequestConfig) => {
				const { headers } = config;
				this.#cacheController.request(config);
				if (!config.__single) {
					this.#singleController.request(config);
				}
				if (!this.#userAgent) {
					delete headers?.['User-Agent'];
				} else if (headers) {
					headers['User-Agent'] = this.#userAgent;
				}
				return config;
			},
			onRejected: err => {
				return Promise.reject(err);
			},
		};
		this.#requestInterceptorIndex = this.#axios.interceptors.request.use(
			this.#requestInterceptor.onFulfilled,
			this.#requestInterceptor.onRejected,
		);
		this.#axios.interceptors.response.use(
			(response: AxiosResponse<any, any> & InterceptResponseConfig) => {
				this.#cacheController.response(response.config, response);
				this.#singleController.response(response.config);
				return response;
			},
			async err => {
				if (err instanceof ResponseCache) {
					return Promise.resolve(err.response);
				}
				if (err instanceof RequestSingle) {
					const response = await err.promise;
					this.#cacheController.response(err.config, response);
					return response;
				}
				return Promise.reject(err);
			},
		);
	}

	get request() {
		const request = this.#axios.interceptors.request;
		return {
			use: (...args) => {
				request.eject(this.#requestInterceptorIndex);
				const index = request.use(...args);
				this.#requestInterceptorIndex = this.#axios.interceptors.request.use(
					this.#requestInterceptor.onFulfilled,
					this.#requestInterceptor.onRejected,
				);
				return index;
			},
			eject: (...args) => {
				return request.eject(...args);
			},
			clear: () => {
				return request.clear();
			},
		} as AxiosInterceptorManager<InternalAxiosRequestConfig<any>>;
	}

	get response() {
		return this.#axios.interceptors.response;
	}

	get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>) {
		return this.#registerAbortSingal<R>(this.#axios.get.bind(this.#axios, url), config);
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

	#registerAbortSingal<R>(fn: Fn<[config: RequestConfig], Promise<any>>, config: RequestConfig = {}) {
		const abort = createAbortController(config);
		config.__abort = abort;
		const abortPromise = fn(config) as AbortPromise<R>;
		abortPromise.abort = abort;
		abortPromise.cancel = abort;
		return abortPromise;
	}
}
