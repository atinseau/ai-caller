import { Hono } from "hono";

export const toolRouter = new Hono()

toolRouter.post('/invoke', async (ctx) => {
  console.log(await ctx.req.json())
  return ctx.json({ message: 'Tool invoked successfully' })
})
