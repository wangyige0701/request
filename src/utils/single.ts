import type { Axios } from 'axios';
import { type Fn, createPromise, upperCase, ParallelTask } from '@wang-yige/utils';
import type { AbortPromise, RequestConfig, RequestConfigWithAbort } from '@/config';
import { Methods } from './methods';
import { createAbortController } from './abort';
import { handleRetry } from './retry';

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

/**
 * In SingleController also handle pipeline and retry config.
 */
export class SingleController {
	#axios: Axios;
	#pipeline: ParallelTask;
	#singleTasks: Map<string, ParallelTask> = new Map();
	#singleNext: Map<string, Fn> = new Map();
	#singlePrev: Set<string> = new Set();

	constructor(axios: Axios, pipeline: ParallelTask) {
		this.#axios = axios;
		this.#pipeline = pipeline;
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
				const useTask = tasks.add(task);
				promise.abort = promise.cancel = () => {
					useTask.cancel();
					if (config.__abort) {
						config.__abort();
					}
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

	static replacePrefixSlash = /^\/*([^\/].*)$/;

	static replaceSuffixSlash = /^(.*[^\/])\/*$/;

	#singleKey(url: string, config: RequestConfig) {
		const { method = Methods.GET } = config;
		const baseURL = (this.#axios.defaults.baseURL || '').replace(SingleController.replaceSuffixSlash, '$1');
		const path = (url || '').replace(SingleController.replacePrefixSlash, '$1');
		return `//${upperCase(method)}::${baseURL}/${path}`;
	}

	#send<R>(fn: Fn<[config: RequestConfig], Promise<any>>, config: RequestConfigWithAbort = {}) {
		const abort = createAbortController(config);
		config.__abort = abort;
		// Add to parallel pipeline.
		const promise = this.#pipeline.add(async config => {
			// Handle retry config.
			return await handleRetry(fn, config);
		}, config) as unknown as AbortPromise<R>;
		// remove the index property from ParallelPromise.
		delete (promise as Promise<void> & { index?: number }).index;
		const _cancelTask = promise.cancel;
		promise.abort = promise.cancel = () => {
			_cancelTask();
			abort();
		};
		return promise;
	}
}
