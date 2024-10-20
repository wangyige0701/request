import { type Fn, nextTick, UseQueue } from '@wang-yige/utils';
import { type AxiosResponse } from 'axios';

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

export class RequestSingle extends Error {
	promise: Promise<AxiosResponse>;

	constructor(promise: Promise<AxiosResponse>) {
		super('Single');
		this.promise = promise;
	}
}

export class SingleQueue extends UseQueue<Fn<[], Promise<void>>> {
	#isRunning: boolean = false;

	constructor() {
		super();
	}

	enQueue(...args: any[]): void {
		super.enQueue(...args);
		if (!this.#isRunning) {
			this.#isRunning = true;
			this.#execute();
		}
	}

	#execute() {
		if (this.length) {
			nextTick(async () => {
				const item = this.deQueue!;
				await item();
				this.#execute();
			});
		} else {
			this.#isRunning = false;
		}
	}
}
