const test = require("ava")
const bent = require("bent")
const frpc = require("../")
const getPort = require("get-port")

const getJSON = bent("json")

test("frpc should respond to requests after running", async (t) => {
  const serverPort = await getPort()
  const server = await frpc.startProcess({
    dbUri: "postgres://postgres@localhost:5432/postgres",
    dbSchema: "public",
    serverPort,
    dbAnonRole: "postgres",
  })
  const response = await getJSON(`http://localhost:${serverPort}`)
  t.is(response.info.title, "frpc API")

  server.stop()
})
