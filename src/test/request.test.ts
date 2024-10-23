import { describe, expect, it } from 'vitest';
import { APIRequest } from '@/index';
import { delay } from '@wang-yige/utils';

describe('APIRequest', () => {
	it('cache', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.response.use(val => {
			console.log('use');
			return Promise.resolve(val.data);
		});
		const api = () => Root.get('/cache', { cache: true, cacheTime: 2000 });

		const result1 = await api();
		await delay(500);
		const result2 = await api();
		expect(result1).toBe(result2);
		await delay(2000);
		const result3 = await api();
		expect(result1).not.toBe(result3);
	}, 10000);

	it('single queue', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.response.use(val => {
			console.log('use');
			return Promise.resolve(val.data);
		});
		let i = 0;
		const api = () =>
			Root.get('/single/queue', {
				single: true,
				singleType: APIRequest.Single.QUEUE,
				params: { index: ++i },
			});
		const current = Date.now();
		await delay(500);

		const result1 = api();
		const result2 = api();
		const result3 = api();
		const result4 = api();
		const result5 = api();
		const result6 = api();
		const result7 = api();
		result3.abort();
		await result5.then(res => console.log('result5', res));
		result6.cancel();
		result1.then(res => console.log('result1', res));
		result2.then(res => console.log('result2', res));
		result3.then(res => console.log('result3', res));
		result4.then(res => console.log('result4', res));
		result6.then(res => console.log('result6', res));
		await result7.then(res => console.log('result7', res));

		expect(Date.now() - current).toBeGreaterThanOrEqual(3000);
	}, 10000);

	it('single prev', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.response.use(val => {
			console.log('use');
			return Promise.resolve(val.data);
		});
		const api = () =>
			Root.get('/single/delay', {
				single: true,
				singleType: APIRequest.Single.PREV,
			});
		const result1 = api();
		delay(500);
		expect(() => api()).toThrowError('[Single#Prev] The previous request has not been completed');
		const res = await result1;
		console.log(res);
		delay(500);
		const result2 = api();
		const res2 = await result2;
		console.log(res2);
	});

	it('single next', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.request.use(val => {
			// @ts-expect-error
			console.log('request', val.index);
			return val;
		});
		Root.response.use(val => {
			console.log('use', val.config);
			return Promise.resolve(val.data);
		});
		let index = 0;
		const api = () =>
			Root.get('/single/delay', {
				single: true,
				singleType: APIRequest.Single.NEXT,
				index: index++,
			});
		const result0 = api();
		await delay(500);
		const result1 = api();
		result0.catch(err => {
			console.log('err');
		});
		const res = await result1;
		console.log(res);
	});

	it('retry', async () => {
		const Root = new APIRequest('http://localhost:3000');
		let time = Date.now();
		Root.request.use(val => {
			const t = time;
			time = Date.now();
			console.log('request, time => ', time - t, 'ms');
			return val;
		});
		Root.response.use(val => {
			console.log('use');
			return Promise.resolve(val.data);
		});
		const api = () =>
			Root.get('/retry', {
				retry: true,
				retryDelay: 1500,
				retryCount: 3,
			});
		const result = api();
		const res = await result;
		console.log(res);
	});
});
