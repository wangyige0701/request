import axios from 'axios';
import { delay, type Fn, isNumber } from '@wang-yige/utils';
import type { RequestConfig, RequestConfigWithAbort } from '@/config';

const DefaultRetryCodes = [500, 404, 502] as const;

export function handleRetry<T extends Promise<any>>(
	fn: Fn<[config: RequestConfig], T>,
	config: RequestConfigWithAbort,
): T {
	const { retry = true } = config;
	if (retry !== true) {
		return fn(config);
	}
	const { retryCode = DefaultRetryCodes, retryCount = 5, retryDelay = 1000 } = config;
	let codes = retryCode;
	if (isNumber(codes)) {
		codes = [codes];
	}
	const time = Math.max(+retryDelay || 1000, 0);
	const count = Math.max(+retryCount || 5, 1);
	const useRetry = async (n: number = 0): Promise<any> => {
		return fn(config).catch(err => {
			if (axios.isCancel(err)) {
				return Promise.reject(err) as T;
			}
			const code = err?.response?.status;
			if (codes.includes(code) && n < count) {
				return delay(time).then(() => useRetry(n + 1)) as T;
			}
			return Promise.reject(err) as T;
		}) as T;
	};
	return useRetry() as T;
}
