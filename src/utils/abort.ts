import { getGlobal } from '@wang-yige/utils';
import axios, { type InternalAxiosRequestConfig, CancelToken } from 'axios';

export const createAbortController = (() => {
	if (getGlobal().AbortController) {
		return function (config: InternalAxiosRequestConfig) {
			const controller = new AbortController();
			config.signal = controller.signal;
			return controller.abort.bind(controller);
		};
	} else {
		return function (config: InternalAxiosRequestConfig) {
			const CancellToken = axios.CancelToken;
			const source = CancellToken.source();
			config.cancelToken = source.token;
			return source.cancel.bind(source);
		};
	}
})();
