const desc = require('macchiato')
const koa = require('koa')
const koaRoutr = require('../')
const request = require('http').request

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

desc('koaRoutr#param')
.should('allow param matching', function (t) {
  const app = koa()
  const router = koaRoutr()

  var count = 0
  router.param('no', function * (next) {
    t.equals(count += 1, 1)
    t.equals(this.params.no, '1234')
    yield next
    t.equals(count += 1, 3)
  })
  router.get('/abc/:no', function * () {
    t.equals(count += 1, 2)
    this.body = this.params.no + '!!!'
  })

  app.use(router)

  const s = app.listen(function () {
    makeRequest(s.address(), { path: '/abc/1234' }, fn).end()
    function fn(res, body) {
      t.equals(res.statusCode, 200)
      t.equals(body, '1234!!!')
      s.close(function () { t.end() })
    }
  })
})
