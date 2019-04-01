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

desc('koaRoutr multiple handles')
.should('create multiple handles under one url', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  var count = 0;
  router.get(
    '/abc',
    function * (next) {
      t.equals(++count, 1)
      yield next
    },
    function * () {
      t.equals(++count, 2)
      this.body = 'OK!!!'
    }
  )

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 2)
      s.close(function () { t.end() })
    }
  })
})
.should('create multiple handles with params', function (t) {
  const app = koa()
  const router = koaRoutr()

  var count = 0
  router.get(
    '/abc/:no',
    function * (next) {
      t.equals(++count, 1)
      yield next
    },
    function * () {
      t.equals(++count, 2)
      t.equals(this.params.no, '123')
      this.body = 'OK!!!'
    }
  )

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 2)
      s.close(function () { t.end() })
    }
  })
})
.should('create multiple handles under `use`', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  var count = 0;
  router.use(
    function * (next) {
      t.equals(++count, 1)
      yield next
    },
    function * () {
      t.equals(++count, 2)
      this.body = 'OK!!!'
    }
  )

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 2)
      s.close(function () { t.end() })
    }
  })
})
.should('create multiple handles under `use` with uri', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  var count = 0;
  router.use(
    '/abc',
    function * (next) {
      t.equals(++count, 1)
      yield next
    },
    function * () {
      t.equals(++count, 2)
      this.body = 'OK!!!'
    }
  )

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      t.equals(count, 2)
      s.close(function () { t.end() })
    }
  })
})
