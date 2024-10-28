import { checkFrequency, Fn, isDef, ParallelTask, toArray } from '@wang-yige/utils';
import axios, {
	type Axios,
	type InternalAxiosRequestConfig,
	type AxiosResponse,
	type AxiosRequestHeaders,
	type AxiosInterceptorManager,
	type CreateAxiosDefaults,
} from 'axios';
import type {
	RequestConfig,
	InterceptRequestConfig,
	InterceptResponseConfig,
	RequestConfigWithAbort,
	AbortPromise,
	InitialConfig,
} from './config';
import { CacheController, ResponseCache } from './utils/cache';
import { SingleController, SingleType } from './utils/single';

export class APIRequest {
	/** The type of single */
	static Single = SingleType;

	static frequencyOptions = { range: 1000, maximum: 20 };

	#userAgent?: string = void 0;
	#domains?: string[] = void 0;
	#maximum: number = 5;

	#axios: Axios;
	#pipeline: ParallelTask;
	#frequency: Fn<[number], any> | undefined = void 0;
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

	constructor(baseURL?: string, config?: InitialConfig & Omit<CreateAxiosDefaults, 'baseURL'>) {
		const { userAgent, maximum = 5, domains, triggerLimit = 100 } = config || {};
		this.#userAgent = isDef(userAgent) ? String(userAgent) : void 0;
		this.#maximum = Math.max(1, +maximum || 5);
		this.#pipeline = new ParallelTask(this.#maximum);
		const _limit = +triggerLimit || 0;
		if (_limit > 0) {
			this.#frequency = checkFrequency({ range: 1000, maximum: _limit }, () => {
				throw new Error(
					'The request frequency is over the limit in one second. \n' +
						"It's maybe an infinite loop, and if you want to continue, you can set the `triggerLimit` to a bigger number or zero.",
				);
			});
		}
		if (domains) {
			this.#domains = toArray(domains);
		}

		const defaultConfig = { ...config };
		delete defaultConfig.userAgent;
		delete defaultConfig.domains;
		delete defaultConfig.maximum;
		this.#axios = axios.create({ ...defaultConfig, baseURL });
		this.#cacheController = new CacheController(this.#axios);
		this.#singleController = new SingleController(this.#axios, this.#pipeline, this);

		this.#requestInterceptor = {
			onFulfilled: (config: InterceptRequestConfig) => {
				const { headers = <AxiosRequestHeaders>{} } = config;
				this.#cacheController.request(config);
				if (this.#userAgent && headers) {
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
				return response;
			},
			async err => {
				if (err instanceof ResponseCache) {
					return Promise.resolve(err.response);
				}
				return Promise.reject(err);
			},
		);
	}

	get domains() {
		return this.#domains;
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
		return this.#proxy<R>(this.#axios.get.bind(this.#axios, url), url, config);
	}

	post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>) {
		return this.#proxy<R>(this.#axios.post.bind(this, url, data), url, config);
	}

	put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>) {
		return this.#proxy<R>(this.#axios.put.bind(this, url, data), url, config);
	}

	delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>) {
		return this.#proxy<R>(this.#axios.delete.bind(this, url), url, config);
	}

	userAgent(str: string) {
		this.#userAgent = str;
	}

	/**
	 * Change the maximum number of parallel requests pipeline.
	 */
	pipelineMaximum(maximum: number) {
		this.#pipeline.changeMaxParallelCount(Math.max(1, +maximum || 5));
	}

	#proxy<R>(fn: Fn<[config: RequestConfig], Promise<any>>, url: string, config: RequestConfigWithAbort = {}) {
		if (this.#frequency) {
			this.#frequency(1);
		}
		return this.#singleController.request<R>(fn, url, { ...config }) as AbortPromise<R>;
	}
}
