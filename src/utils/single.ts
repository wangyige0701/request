import type { InternalAxiosRequestConfig, AxiosResponse, Axios } from 'axios';
import {
	type Fn,
	type PromiseReject,
	type PromiseResolve,
	createPromise,
	nextTick,
	upperCase,
	UseQueue,
} from '@wang-yige/utils';
import type { InterceptRequestConfig, InterceptResponseConfig } from '@/config';
import { Methods } from './methods';

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

export class RequestSingle {
	promise: Promise<AxiosResponse>;
	config: InterceptRequestConfig;

	constructor(promise: Promise<AxiosResponse>, config: InterceptRequestConfig) {
		this.promise = promise;
		this.config = config;
	}
}

type QueueValue = { fn: Fn<[], Promise<AxiosResponse>>; resolve: PromiseResolve; reject: PromiseReject };

class SingleQueue<T extends QueueValue> extends UseQueue<T> {
	#isRunning: boolean = false;

	constructor() {
		super();
	}

	enQueue(...args: T[]): void {
		super.enQueue(...args);
	}

	execute() {
		if (this.#isRunning) {
			return;
		}
		if (this.length) {
			this.#isRunning = true;
			nextTick(async () => {
				const { fn, resolve, reject } = this.deQueue!;
				try {
					const res = await fn();
					this.execute();
					resolve(res);
				} catch (error) {
					this.execute();
					reject(error);
				}
			});
		} else {
			this.#isRunning = false;
		}
	}
}

export class SingleController {
	#axios: Axios;
	#singleQueues: Record<string, SingleQueue<QueueValue>> = {};
	#singleCurrent: Map<string, InterceptRequestConfig> = new Map();

	constructor(axios: Axios) {
		this.#axios = axios;
	}

	request(config: InterceptRequestConfig) {
		const { single = true, singleType = SingleType.QUEUE } = config;
		if (!this.#isSingle(single, singleType)) {
			return;
		}
		const KEY = this.#singleKey(config);
		if (!this.#singleCurrent.has(KEY)) {
			this.#singleCurrent.set(KEY, config);
			return;
		}
		if (singleType === SingleType.NEXT) {
			const target = this.#singleCurrent.get(KEY)!;
			if (target) {
				target.__abort?.();
			}
			this.#singleCurrent.set(KEY, config);
			return;
		} else if (singleType === SingleType.PREV) {
			try {
				config.__abort?.();
			} catch (err) {
				throw new Error('Request cancelled, because of single request [Next module]', {
					cause: err,
				});
			}
			return Promise.reject();
		}
		if (!this.#singleQueues[KEY]) {
			this.#singleQueues[KEY] = new SingleQueue();
		}
		const queue = this.#singleQueues[KEY];
		const { promise, resolve, reject } = createPromise<AxiosResponse>();
		queue.enQueue({
			fn: async () => {
				config.__single = true;
				this.#singleCurrent.set(KEY, config);
				return await this.#axios.request(config);
			},
			resolve,
			reject,
		});
		throw new RequestSingle(promise, config);
	}

	response(config: InterceptResponseConfig['config']) {
		const { single = true, singleType = SingleType.QUEUE } = config;
		if (!this.#isSingle(single, singleType)) {
			return;
		}
		const KEY = this.#singleKey(config);
		if (singleType === SingleType.QUEUE) {
			const queue = this.#singleQueues[KEY];
			if (queue) {
				queue.execute();
				if (queue.length) {
					return;
				}
			}
		}
		this.#singleCurrent.delete(KEY);
	}

	#singleKey(config: InternalAxiosRequestConfig) {
		const { method = Methods.GET } = config;
		return `//${upperCase(method)}::${config.baseURL}${config.url}`;
	}

	#isSingle(single: boolean, singleType: SingleType) {
		return (
			single !== false &&
			(singleType === SingleType.QUEUE || singleType === SingleType.NEXT || singleType === SingleType.PREV)
		);
	}
}
