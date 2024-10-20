import koa from 'koa';

const app = new koa();
let i = 0;

app.use(async ctx => {
	console.log(i++);
	console.log(ctx.request);
	ctx.header['content-type'] = 'application/json';
	ctx.body = { success: true };
});

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});
