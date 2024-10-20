import { SingleType } from './utils/single';

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
	 * Max time to request in seconds.
	 * - default `10`
	 */
	maximum?: number;
}
