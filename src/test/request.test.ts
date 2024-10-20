import { describe, it } from 'vitest';
import { APIRequest } from '@/index';
import { delay } from '@wang-yige/utils';

describe('APIRequest', () => {
	it('use', async () => {
		const Root = new APIRequest('http://localhost:3000');
		Root.response.use(val => {
			console.log('use');
			return val;
		});
		const api = () => Root.get('/', { cache: true, cacheTime: 3000 });

		await api().then(res => {
			console.log(res);
			console.log(1);
		});

		// await delay(2000);

		// await api().then(res => {
		// 	// console.log(res);
		// 	console.log(2);
		// });
	});
});
