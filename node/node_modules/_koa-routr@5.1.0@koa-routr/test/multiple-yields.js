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

desc('koaRoutr multiple yields')
.should('allow for multiple yields in middleware', function (t) {
  const app = koa()
  const router = koaRoutr()
  app.use(router)

  router.get('/abc', function * () {
    var a = yield Promise.resolve(1);
    var b = yield Promise.resolve(a * 2);
    var c = yield Promise.resolve(b * 2);
    this.body = yield Promise.resolve(c * 2);
  })

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc'}, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, String(8))
      s.close(function () { t.end() })
    }
  })
})
