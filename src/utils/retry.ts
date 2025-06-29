import axios, { AxiosError } from 'axios';
import { type Fn, delay, isDef, toArray } from '@wang-yige/utils';
import type { RequestConfig, RequestConfigWithAbort } from '@/config';

const DefaultRetryErrorCodes = [AxiosError.ECONNABORTED, AxiosError.ERR_NETWORK, AxiosError.ETIMEDOUT, 'ECONNREFUSED'];
const DefaultResponseCodes = [500, 404, 502];
const DefaultRequestCodes = [404];

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
		retryRequestCode = DefaultRequestCodes,
		retryCount = 5,
		retryDelay = 1000,
		useDomains = true,
	} = config;
	const errCode = toArray(retryErrorCode);
	const responseCodes = toArray(retryResponseCode);
	const requestCodes = toArray(retryRequestCode);
	const time = Math.max(+retryDelay || 1000, 0);
	let count = Math.max(+retryCount || 5, 1);
	let changeDomain = false;
	let domainIndex = -1;
	let domainList: string[];
	if (useDomains && domains && domains.length) {
		changeDomain = true;
		domainList = [...(domains || [])];
		count = Math.max(domainList.length, count);
	}
	const useRetry = async (n: number = 0): Promise<any> => {
		let requestConfig = config;
		if (changeDomain) {
			// 循环修改请求域名
			const index = domainIndex++;
			if (domainIndex >= domainList.length) {
				domainIndex = -1;
			}
			if (index >= 0) {
				const target = domainList[index];
				requestConfig = {
					...config,
					...(isDef(target) ? { baseURL: domainList[index] } : {}),
				};
			}
		}
		return fn(requestConfig).catch(err => {
			// 请求取消或超出最大请求次数直接抛出
			if (axios.isCancel(err) || n >= count) {
				return Promise.reject(err) as T;
			}
			const needRetry =
				errCode.includes(err.code) ||
				(err.code === AxiosError.ERR_BAD_RESPONSE && responseCodes.includes(err?.status)) ||
				(err.code === AxiosError.ERR_BAD_REQUEST && requestCodes.includes(err?.status));
			if (needRetry) {
				return delay(time).then(() => useRetry(n + 1)) as T;
			}
			return Promise.reject(err) as T;
		}) as T;
	};
	return useRetry() as T;
}
