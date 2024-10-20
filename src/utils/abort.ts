import { getGlobal } from '@wang-yige/utils';
import axios, { type AxiosRequestConfig } from 'axios';

export const createAbortController = (() => {
	if (getGlobal().AbortController) {
		return function (config: AxiosRequestConfig) {
			const controller = new AbortController();
			config.signal = controller.signal;
			return controller.abort.bind(controller);
		};
	} else {
		return function (config: AxiosRequestConfig) {
			const CancellToken = axios.CancelToken;
			const source = CancellToken.source();
			config.cancelToken = source.token;
			return source.cancel.bind(source);
		};
	}
})();
