import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { Fn } from '@wang-yige/utils';
import type { SingleType } from './utils/single';

export interface CustomConfig {
	/**
	 * The same url request is only single at a time.
	 * Not include the params.
	 * - default `true`
	 */
	single?: boolean;
	/**
	 * The type for single request.
	 * - default is `SingleType.QUEUE`
	 */
	singleType?: SingleType;
	/**
	 * Cache the Get request response.
	 * - default `false`
	 */
	cache?: boolean;
	/**
	 * Cache time in miliseconds.
	 * If time is negative or zero, it will not be cached.
	 */
	cacheTime?: number;
	/**
	 * Max number to sync request.
	 * - default `5`
	 */
	maximum?: number;
}

export type RequestConfig<D = any> = AxiosRequestConfig<D> & CustomConfig & { __abort?: Fn };

export type InterceptRequestConfig = InternalAxiosRequestConfig<any> &
	CustomConfig & {
		__abort?: Fn;
		__single?: true;
	};

export type InterceptResponseConfig = { config: InterceptRequestConfig };

export type AbortPromise<T> = Promise<T> & {
	/**
	 * Abort the request.
	 */
	abort: Fn;
	/**
	 * Abort the request, same as `abort` method.
	 */
	cancel: Fn;
};
