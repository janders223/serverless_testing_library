const express = require('express')
const request = require('supertest')
const yaml = require('js-yaml')
const bodyParser = require('body-parser')
const { resolve } = require('path')

const configureServer = config => {
  const serverless = yaml.safeLoad(config)

  const server = express()

  server.use(bodyParser.json())

  const foo = Object.entries(serverless.functions).forEach(([name, fn]) => {
    const event = fn.events.filter(e => {
      return Object.keys(e).includes('http')
    })[0].http

    const handlerPath = resolve(process.cwd(), fn.handler).split('.')

    const handle = require(handlerPath[0])

    const handler = handle[handlerPath[1]]

    const path = event.path.replace(/{(.*?)}/, ':$1')

    server[event.method](`/${path}`, async (req, res) => {
      const event = {
        headers: req.headers,
        path: req.url,
        httpmethod: req.method,
        pathParameters: req.params,
        querystringparameters: req.query,
        body: JSON.stringify(req.body),
        resource: '',
        stagevariables: {},
        requestcontext: {},
      }

      const callback = (err, result) => {
        if (err) {
          res
            .status(500)
            .set(err.headers)
            .send(err)
          return
        }
        res
          .status(result.statusCode)
          .set(result.headers)
          .send(JSON.stringify(result.body))
      }

      if (handler.length > 2) {
        return handler(event, {}, callback)
      }

      const response = await handler(event)

      res
        .set({ ...response.headers })
        .status(response.statusCode)
        .json(response.body)
    })
  })

  return server
}

const get = server => {
  return (path, options = { headers: {} }) => {
    const { headers } = options

    return new Promise(async (resolve, reject) => {
      const response = await request(server)
        .get(path)
        .set(headers)

      resolve({
        status: response.status,
        headers: response.headers,
        body: JSON.parse(response.body),
      })
    })
  }
}

const post = server => {
  return (path, options = { headers: {} }) => {
    const { data, headers } = options

    return new Promise(async (resolve, reject) => {
      const response = await request(server)
        .post(path)
        .set(headers)
        .send({ ...data })

      resolve({
        status: response.status,
        headers: response.headers,
        body: JSON.parse(response.body),
      })
    })
  }
}

const patch = server => {
  return (path, options = { headers: {} }) => {
    const { data, headers } = options

    return new Promise(async (resolve, reject) => {
      const response = await request(server)
        .patch(path)
        .set(headers)
        .send({ ...data })

      resolve({
        status: response.status,
        headers: response.headers,
        body: JSON.parse(response.body),
      })
    })
  }
}

const put = server => {
  return (path, options = { headers: {} }) => {
    const { data, headers } = options

    return new Promise(async (resolve, reject) => {
      const response = await request(server)
        .put(path)

        .set(headers)
        .send({ ...data })

      resolve({
        status: response.status,
        headers: response.headers,
        body: JSON.parse(response.body),
      })
    })
  }
}

const del = server => {
  return (path, options = { headers: {} }) => {
    const { headers } = options

    return new Promise(async (resolve, reject) => {
      const response = await request(server)
        .delete(path)
        .set(headers)

      resolve({
        status: response.status,
        headers: response.headers,
        body: JSON.parse(response.body),
      })
    })
  }
}

module.exports = config => {
  const server = configureServer(config)

  return {
    get: get(server),
    post: post(server),
    put: put(server),
    patch: patch(server),
    delete: del(server),
  }
}
