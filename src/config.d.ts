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
	 * Retry the request if failed.
	 * - default `true`
	 */
	retry?: boolean;
	/**
	 * Retry count.
	 * - default `5`
	 */
	retryCount?: number;
	/**
	 * Delay time for retry in miliseconds.
	 */
	retryDelay?: number;
	/**
	 * The domains that can be retried, if set it,
	 * the retry count will be the max of the `domains`'s length and `retryCount`.
	 */
	domains?: string[];
	/**
	 * Max number to sync request.
	 * - default `5`
	 */
	maximum?: number;
}

export type RequestConfig<D = any> = AxiosRequestConfig<D> & CustomConfig;

export type RequestConfigWithAbort = RequestConfig & { __abort?: Fn };

export type InterceptRequestConfig = InternalAxiosRequestConfig<any> & CustomConfig;

export type InterceptResponseConfig = { config: InterceptRequestConfig };

export type AbortPromise<T = any> = Promise<T> & {
	/**
	 * Abort the request.
	 */
	abort: Fn;
	/**
	 * Abort the request, same as `abort` method.
	 */
	cancel: Fn;
};
