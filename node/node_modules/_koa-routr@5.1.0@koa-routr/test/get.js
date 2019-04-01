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

desc('koaRoutr#get')
.should('create `get` handle', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router.get('/abc', function * () {
    this.body = 'OK!!!'
  })

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('create `get` handling params', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.get('/abc/:no', function * () {
    t.equals(this.params.no, '123')
    this.body = 'OK!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('not call route is url doesn\'t match', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.get('/def', function * () {
    this.body = 'OK!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 404)
      t.notEquals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('handle middleware before `get`', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  const s = app.listen(function () {
    
    // add after listen so routes can be
    // dyanmically added!
    router.use(function * (next) {
      this.body = 'beep '
      yield next
    })

    router.get('/abc', function * () {
      this.body += 'boop'
    })

    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'beep boop')
      s.close(function () { t.end() })
    }
  })
})
