import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { Fn } from '@wang-yige/utils';
import type { SingleType } from './utils/single';

export interface InitialConfig {
	/**
	 * Then User-Agent header config, default is void.
	 * Used in node environment.
	 */
	userAgent?: string;
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
	/**
	 * Max number to trigger request by current instance in a second,
	 * if it is zero or negative, it will not check.
	 * - default `100`
	 */
	triggerLimit?: number;
}

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
	 * - default `false`
	 */
	retry?: boolean;
	/**
	 * Retry count.
	 * - default `5`
	 */
	retryCount?: number;
	/**
	 * Delay time for retry in miliseconds.
	 * - default `1000`
	 */
	retryDelay?: number;
	/**
	 * The axios error codes to retry.
	 * - default `['ECONNABORTED', 'ERR_NETWORK, 'ETIMEDOUT', 'ECONNREFUSED']`
	 * `'ECONNREFUSED'` is only available in nodejs.
	 */
	retryErrorCode?: string | string[];
	/**
	 * If `retryErrorCode` not include `ERR_BAD_RESPONSE`,
	 * this config will be matched when response `err.code` equals `'ERR_BAD_RESPONSE'`.
	 * - default codes are `500`, `404`, `502`
	 */
	retryResponseCode?: number | number[];
	/**
	 * If `retryErrorCode` not include `ERR_BAD_REQUEST`,
	 * this config will be matched when response `err.code` equals `'ERR_BAD_REQUEST'`.
	 * - default code is `404`
	 */
	retryRequestCode?: number | number[];
	/**
	 * Whether use domains to retry.
	 * - default `true`
	 */
	useDomains?: boolean;
}

export type RequestConfig<D = any> = AxiosRequestConfig<D> & CustomConfig & { [K in string]: any };

export type RequestConfigWithAbort = RequestConfig & { __abort?: Fn };

export type InterceptRequestConfig = InternalAxiosRequestConfig<any> & CustomConfig;

export type InterceptResponseConfig = { config: InterceptRequestConfig };

export type AbortPromise<T = any> = Promise<T> & {
	/**
	 * Abort the request.
	 */
	abort: Fn;
	/**
	 * alias of `abort` method.
	 */
	cancel: Fn;
};
