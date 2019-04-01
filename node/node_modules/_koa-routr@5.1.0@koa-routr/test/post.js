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
    readData(res).then(function (d) {
      cb(res, d)
    })
  })
}

function readData(r) {
  return new Promise(function (resolve, reject) {
    const data = []
    r.on('data', function (d) { data.push(d) })
    r.on('error', reject)
    r.once('end', function () {
      resolve(Buffer.concat(data).toString('utf8'))
    })
  });
}

desc('koaRoutr#post')
.should('create `post` handle', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.post('/abc', function * () {
    yield readData(this.req).then(function (body) {
      t.equals(body, 'HEY!')
      this.body = 'OK!!!'
    }.bind(this))
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { method: 'POST', path: '/abc'}, fn).end('HEY!')
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'OK!!!')
      s.close(function () { t.end() })
    }
  })
})
.should('create `post` handling params', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.post('/abc/:no', function * () {
    yield readData(this.req).then(function (body) {
      t.equals(body, 'HEY!')
      t.equals(this.params.no, '123')
      this.body = 'OK!!!'
    }.bind(this))
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { method: 'POST', path: '/abc/123'}, fn).end('HEY!')
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
  var notCalled = true
  router.post('/def', function * () {
    notCalled = false
    this.body = 'OK!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { method: 'POST', path: '/abc'}, fn).end('HEY!')
    function fn(res, body) {
      t.equals(res.statusCode, 404)
      t.notEquals(body, 'OK!!!')
      t.assert(notCalled)
      s.close(function () { t.end() })
    }
  })
})
.should('handle middleware before `post`', function (t) {
  const app = koa()
  const router = koaRoutr()
  router.use(function * (next) {
    this.body = 'beep '
    yield next
  })

  router.post('/abc', function * () {
    this.body += 'boop'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { method: 'POST', path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, 'beep boop')
      s.close(function () { t.end() })
    }
  })
})
