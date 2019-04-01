const desc = require('macchiato')
const koa = require('koa')
const koaRoutr = require('../')
const request = require('http').request;

function assign(a, b) {
  return Object.keys(b).reduce(function (n, k) { n[k] = b[k]; return n }, a)
}

function makeRequest(address, options, cb) {
  return request(assign({
    hostname: address.address,
    port: address.port
  }, options))
  .once('response', function onResponse(res) {
    const data = []
    res.on('data', function (d) { data.push(d) })
    res.once('end', function () {
      cb(res, Buffer.concat(data).toString('utf8'))
    })
  })
}

desc('koaRoutr#use')
.should('middleware should be called in correct order', function (t) {
  const app = koa()
  const router = koaRoutr()

  var count = 0
  router.use(function * (next) {
    t.equals(count += 1, 1)
    yield next
    t.equals(count += 1, 3)
  })

  router.use(function * () {
    t.equals(count += 1, 2)
    this.status = 200
    this.body = 'OK!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 3)
      s.close(function () { t.end() })
    }
  })
})
.should('should allow middleware routing', function (t) {
  const app = koa()
  const router = koaRoutr()

  var notCalled1 = true
  router.use('/def', function * (next) {
    notCalled1 = false
    yield next
  })

  var count = 0
  router.use('/abc', function * (next) {
    t.equals(count += 1, 1)
    yield next
    t.equals(count += 1, 3)
  })

  var notCalled2 = true
  router.use('/abce', function * (next) {
    notCalled2 = false
    yield next
  })

  router.use('/abc/123', function * () {
    t.equals(count += 1, 2)
    this.status = 200
    this.body = 'OK!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 3)

      t.assert(notCalled1)
      t.assert(notCalled2)

      s.close(function () { t.end() })
    }
  })
})
.should('allow nested routing', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.use(
    '/abc',
    koaRoutr().get('/123', function * () { this.body = '123!!!' })
  )

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, '123!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('allow nested middleware', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.use(
    '/abc',
    koaRoutr()
      .use('/123', function * (next) { yield next })
      .use(function * () { this.body = 'OK!!!' })
  )

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('not call route is url doesn\'t match', function (t) {
  const app = koa().use(
    koaRoutr().use('/def', function * () {
      this.body = 'OK!!!'
    })
  )

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 404)
      t.notEquals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
