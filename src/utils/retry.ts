import axios, { AxiosError } from 'axios';
import { delay, type Fn, isDef, isNumber, isString } from '@wang-yige/utils';
import type { RequestConfig, RequestConfigWithAbort } from '@/config';

const DefaultRetryErrorCodes = [AxiosError.ECONNABORTED, AxiosError.ERR_NETWORK, AxiosError.ETIMEDOUT, 'ECONNREFUSED'];
const DefaultResponseCodes = [500, 404, 502];

export function handleRetry<T extends Promise<any>>(
	fn: Fn<[config: RequestConfig], T>,
	config: RequestConfigWithAbort,
	domains: string[] | undefined,
): T {
	const { retry = false } = config;
	if (retry !== true) {
		return fn(config);
	}
	const {
		retryErrorCode = DefaultRetryErrorCodes,
		retryResponseCode = DefaultResponseCodes,
		retryCount = 5,
		retryDelay = 1000,
	} = config;
	let errCode = retryErrorCode;
	if (isString(errCode)) {
		errCode = [errCode];
	}
	let responseCodes = retryResponseCode;
	if (isNumber(responseCodes)) {
		responseCodes = [responseCodes];
	}
	const time = Math.max(+retryDelay || 1000, 0);
	let count = Math.max(+retryCount || 5, 1);
	let changeDomain = false;
	let domainIndex = -1;
	const usedDomains = [...(domains || [])];
	if (usedDomains && usedDomains.length) {
		changeDomain = true;
		count = Math.max(usedDomains.length, count);
	}
	const useRetry = async (n: number = 0): Promise<any> => {
		let requestConfig = config;
		if (changeDomain) {
			const index = domainIndex++;
			if (domainIndex >= usedDomains.length) {
				domainIndex = -1;
			}
			if (index >= 0) {
				const target = usedDomains![index];
				requestConfig = {
					...config,
					...(isDef(target) ? { baseURL: usedDomains![index] } : {}),
				};
			}
		}
		return fn(requestConfig).catch(err => {
			// cancel request or max retry throw directly
			if (axios.isCancel(err) || n >= count) {
				return Promise.reject(err) as T;
			}
			let nextRetry = false;
			if (errCode.includes(err.code)) {
				nextRetry = true;
			} else if (err.code === AxiosError.ERR_BAD_RESPONSE) {
				const code = err?.response?.status;
				if (responseCodes.includes(code)) {
					nextRetry = true;
				}
			}
			if (nextRetry) {
				return delay(time).then(() => useRetry(n + 1)) as T;
			}
			return Promise.reject(err) as T;
		}) as T;
	};
	return useRetry() as T;
}
