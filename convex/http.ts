import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { streamOverHttp } from './chat'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

http.route({
  path: '/api/chat',
  method: 'POST',
  handler: streamOverHttp,
})

export default http
