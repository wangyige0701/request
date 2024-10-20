import { describe, expect, it } from 'vitest';
import { APIRequest } from '@/index';
import { delay } from '@wang-yige/utils';

describe('APIRequest', () => {
	it('cache', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.response.use(val => {
			// console.log('use');
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
			Root.get('/single/queue', { single: true, singleType: APIRequest.Single.QUEUE, params: { index: i++ } });
		const current = Date.now();
		await delay(500);

		const result1 = api();
		const result2 = api();
		const result3 = api();
		const result4 = api();
		const result = api();
		await result.then(res => console.log('result', res));
		result1.then(res => console.log('result1', res));
		result2.then(res => console.log('result2', res));
		result3.then(res => console.log('result3', res));
		result4.then(res => console.log('result4', res));

		expect(Date.now() - current).toBeGreaterThanOrEqual(2500);
	}, 10000);
});
