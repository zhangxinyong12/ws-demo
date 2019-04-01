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

desc('koaRoutr#router')
.should('create a new router at the mounted point', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router
    .router('/abc')
      .get('/123', function * () { this.body = 'OK!!!' })


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
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router
    .router('/abc')
      .get('/123', function * () { this.body = 'OK!!!' })

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/456' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 404)
      t.notEquals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('allow param matching in nest router', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router
    .router('/abc')
    .param('no', function * (next) {
      t.equals(this.params.no, '1234')
      yield next
    })
    .get('/:no', function * () {
      this.body = this.params.no + '!!!'
    })

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/1234' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, '1234!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('normalise urls to match url\'s with slashes at the end and beginning', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router
    .router('/abc/')
      .get('/123', function * () { this.body = 'OK!!!' })


  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/123' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('allow params to be at the start with no leading slash', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router
    .router('/abc')
    .get(':no', function * () {
      this.body = this.params.no + '!!!'
    })

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/1234' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, '1234!!!')
      s.close(function () { t.end() })
    }
  })
})
