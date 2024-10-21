import type { Axios } from 'axios';
import { type Fn, type PromiseResolve, createPromise, upperCase, ParallelTask } from '@wang-yige/utils';
import type { AbortPromise, RequestConfig, RequestConfigWithAbort } from '@/config';
import { Methods } from './methods';
import { createAbortController } from './abort';

export enum SingleType {
	/**
	 * Always use the next request,
	 * and if the prev request is not finished, it will be aborted.
	 */
	NEXT = 'next',
	/**
	 * Always use the prev request,
	 * and if current request is not finished, the latest request will be aborted.
	 */
	PREV = 'prev',
	/**
	 * If the prev request is not finished, the latest request will be added to the queue.
	 */
	QUEUE = 'queue',
}

export class SingleController {
	#axios: Axios;
	#singleTasks: Map<string, ParallelTask> = new Map();
	#singleNext: Map<string, Fn> = new Map();
	#singlePrev: Set<string> = new Set();

	constructor(axios: Axios) {
		this.#axios = axios;
	}

	request<R>(fn: Fn<[config: RequestConfig], Promise<any>>, url: string, config: RequestConfigWithAbort) {
		const { single = true, singleType = SingleType.QUEUE } = config;
		if (single !== false) {
			const KEY = this.#singleKey(url, config);
			if (singleType === SingleType.QUEUE) {
				const { promise, resolve, reject } = createPromise<R, AbortPromise<R>>();
				if (!this.#singleTasks.has(KEY)) {
					this.#singleTasks.set(KEY, new ParallelTask(1));
					this.#singleTasks.get(KEY)!.onEmpty(() => {
						this.#singleTasks.delete(KEY);
					});
				}
				const tasks = this.#singleTasks.get(KEY)!;
				const task = async () => {
					await this.#send<R>(fn, config).then(resolve, reject);
				};
				tasks.add(task);
				promise.abort = promise.cancel = () => {
					if (config.__abort) {
						return config.__abort();
					}
					return tasks.cancel(task);
				};
				return promise;
			}
			if (singleType === SingleType.NEXT) {
				if (this.#singleNext.has(KEY)) {
					this.#singleNext.get(KEY)?.();
				}
				const promise = this.#send<R>(fn, config);
				this.#singleNext.set(KEY, promise.abort);
				promise.finally(() => {
					this.#singleNext.delete(KEY);
				});
				return promise;
			}
			if (singleType === SingleType.PREV) {
				if (this.#singlePrev.has(KEY)) {
					throw new Error('[Single#Prev] The previous request has not been completed');
				}
				this.#singlePrev.add(KEY);
				const promise = this.#send<R>(fn, config);
				promise.finally(() => {
					this.#singlePrev.delete(KEY);
				});
				return promise;
			}
		}
		return this.#send<R>(fn, config);
	}

	#send<R>(fn: Fn<[config: RequestConfig], Promise<any>>, config: RequestConfigWithAbort = {}) {
		const abort = createAbortController(config);
		config.__abort = abort;
		const promise = fn(config) as AbortPromise<R>;
		promise.abort = abort;
		promise.cancel = abort;
		return promise;
	}

	#singleKey(url: string, config: RequestConfig) {
		const { method = Methods.GET } = config;
		return `//${upperCase(method)}::${this.#axios.defaults.baseURL}${url}`;
	}
}
