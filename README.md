## @wang-yige/request

A warpper for axios, add some useful features like retry, cache, etc.

### Usage

```typescript
import { APIRequest } from '@wang-yige/request';

const Root = new APIRequest('https://jsonplaceholder.typicode.com');

const api = (i: number) => {
	return Root.get('/todos/' + i);
};

api(0); // result promise with abort method, and it alias for cancel method.
```

### Config

```typescript
const Root = new APIRequest('/', {
    /**
	 * Then User-Agent header config, default is void.
	 * Used in node environment.
	 */
	userAgent?: string,
	/**
	 * The domains that can be retried, if set it,
	 * the retry count will be the max of the `domains`'s length and `retryCount`.
	 */
	domains?: string[],
	/**
	 * Max number to sync request.
	 * - default `5`
	 */
	maximum?: number,
	/**
	 * Max number to trigger request by current url in a second,
	 * if it is zero or negative, it will not check.
	 * - default `50`
	 */
	triggerLimit?: number,
});

Root.get('/todos/0', {
    /**
	 * The same url request is only single at a time.
	 * Not include the params.
	 * - default `true`
	 */
	single?: boolean,
	/**
	 * The type for single request.
	 * - default is `SingleType.QUEUE`
	 */
	singleType?: SingleType,
	/**
	 * Cache the Get request response.
	 * - default `false`
	 */
	cache?: boolean,
	/**
	 * Cache time in miliseconds.
	 * If time is negative or zero, it will not be cached.
	 */
	cacheTime?: number,
	/**
	 * Retry the request if failed.
	 * - default `false`
	 */
	retry?: boolean,
	/**
	 * Retry count.
	 * - default `5`
	 */
	retryCount?: number,
	/**
	 * Delay time for retry in miliseconds.
	 * - default `1000`
	 */
	retryDelay?: number,
	/**
	 * The axios error codes to retry.
	 * - default `['ECONNABORTED', 'ERR_NETWORK, 'ETIMEDOUT', 'ECONNREFUSED']`
	 * `'ECONNREFUSED'` is only available in nodejs.
	 */
	retryErrorCode?: string | string[],
	/**
	 * If `retryErrorCode` not include `ERR_BAD_RESPONSE`,
	 * this config will be matched when response `err.code` equals `'ERR_BAD_RESPONSE'`.
	 * - default codes are `500`, `404`, `502`
	 */
	retryResponseCode?: number | number[],
	/**
	 * If `retryErrorCode` not include `ERR_BAD_REQUEST`,
	 * this config will be matched when response `err.code` equals `'ERR_BAD_REQUEST'`.
	 * - default code is `404`
	 */
	retryRequestCode?: number | number[],
	/**
	 * Whether use domains to retry.
	 * - default `true`
	 */
	useDomains?: boolean,
});
```
