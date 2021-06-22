const child_process = require("child_process")
const fs = require("fs")
const tmp = require("tmp")
const decamelize = require("decamelize")
const path = require("path")
const bent = require("bent")

const getJSON = bent("json")

module.exports.startProcess = async (config) => {
  let configPath, serverPort
  if (typeof config === "string") {
    configPath = config
    const configContent = fs.readFileSync(configPath).toString()
    serverPort = parseInt(/^server_port=(.*)$/.match(configContent))
  } else {
    serverPort = config.serverPort || config.server_port
    const frpcConfigContent = `${Object.entries(config)
      .map(([k, v]) => `${decamelize(k, "-").toLowerCase()} = ${v}`)
      .join("\n")}`
    configPath = tmp.tmpNameSync() + ".conf"
    fs.writeFileSync(configPath, frpcConfigContent)
  }

  const proc = child_process.spawn(
    path.resolve(__dirname, "frpc"),
    [configPath],
    {
      shell: true,
    }
  )

  proc.stdout.on("data", (data) => {
    console.log(`frpc stdout: ${data}`)
  })

  proc.stderr.on("data", (data) => {
    console.log(`frpc stderr: ${data}`)
  })

  let isClosed = false
  proc.on("close", (code) => {
    isClosed = true
  })

  await new Promise((resolve, reject) => {
    const processCloseTimeout = setTimeout(() => {
      if (isClosed) {
        reject("frpc didn't start properly")
      } else {
        reject(`frpc didn't respond`)
        proc.kill("SIGINT")
      }
    }, 5000) // 500ms to wait for start

    async function checkIffrpcRunning() {
      const result = await getJSON(`http://localhost:${serverPort}`).catch(
        () => null
      )
      if (result) {
        clearTimeout(processCloseTimeout)
        resolve()
      } else {
        setTimeout(checkIffrpcRunning, 50)
      }
    }
    checkIffrpcRunning()
  })

  return {
    proc,
    stop: async () => {
      proc.kill("SIGINT")
    },
  }
}
