const test = require("ava")
const bent = require("bent")
const frp = require("../")
const getPort = require("get-port")
const micro = require("micro")
const getJSON = bent("json")

test("frpc should respond to requests after running", async (t) => {
  const frpsServerPort = await getPort()
  const localWebPort = await getPort()
  const remoteWebPort = await getPort()
  const webService = micro((req, res) => {
    res.end(JSON.stringify({ success: true }))
  })
  webService.listen(localWebPort)

  const server = await frp.startServer({
    common: {
      bindPort: frpsServerPort,
    },
  })

  const client = await frp.startClient({
    common: {
      serverPort: frpsServerPort,
      serverAddr: "127.0.0.1",
    },
    ssh: {
      type: "tcp",
      localIp: "127.0.0.1",
      localPort: localWebPort,
      remotePort: remoteWebPort,
    },
  })

  const res = await getJSON(`http://127.0.0.1:${remoteWebPort}`)

  t.assert(res.success)

  webService.close()
  server.stop()
  client.stop()
})
