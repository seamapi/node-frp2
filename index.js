const child_process = require("child_process")
const fs = require("fs")
const tmp = require("tmp")
const decamelize = require("decamelize")
const downloadfrp = require("./download-frp")
const bunyan = require("bunyan")
const debug = require("debug")("node-frp2")

const log = bunyan.createLogger({
  name: "node-frp2",
  level: debug.enabled ? "trace" : "info",
})

const getTemporaryConfigFile = async (config) => {
  let configPath, bindPort
  if (typeof config === "string") {
    configPath = config
    const configContent = fs.readFileSync(configPath).toString()
    bindPort = parseInt(/^bind_port=(.*)$/.match(configContent))
  } else {
    bindPort = config.common?.bindPort
    const frpConfigContent = `${Object.entries(config)
      .map(
        ([group, subObj]) =>
          `[${group}]\n${Object.entries(subObj)
            .map(([k, v]) => `${decamelize(k, "_").toLowerCase()} = ${v}`)
            .join("\n")}`
      )
      .join("\n\n")}`
    log.trace({ frpConfigContent })
    configPath = tmp.tmpNameSync() + ".ini"
    fs.writeFileSync(configPath, frpConfigContent)
  }
  return { configPath, bindPort }
}

module.exports.startClient = async (config) => {
  const { frpcPath } = await downloadfrp()
  const { configPath } = await getTemporaryConfigFile(config)

  const proc = child_process.spawn(frpcPath, ["-c", configPath], {
    shell: true,
  })
  proc.stdout.on("data", (data) => {
    log.trace({ frpcStdout: data.toString() })
  })
  proc.stderr.on("data", (data) => {
    log.trace({ frpcStderr: data.toString() })
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

    async function checkIfRunning() {
      setTimeout(() => {
        if (!isClosed) {
          clearTimeout(processCloseTimeout)
          resolve()
        }
      }, 500)
    }
    checkIfRunning()
  })

  return {
    proc,
    stop: async () => {
      proc.kill("SIGINT")
    },
  }
}

module.exports.startServer = async (config) => {
  const { frpsPath } = await downloadfrp()
  const { configPath, bindPort } = await getTemporaryConfigFile(config)

  const proc = child_process.spawn(frpsPath, ["-c", configPath], {
    shell: true,
  })
  proc.stdout.on("data", (data) => {
    log.trace({ frpsStdout: data.toString() })
  })
  proc.stderr.on("data", (data) => {
    log.trace({ frpsStderr: data.toString() })
  })

  let isClosed = false
  proc.on("close", (code) => {
    isClosed = true
  })

  await new Promise((resolve, reject) => {
    const processCloseTimeout = setTimeout(() => {
      if (isClosed) {
        reject("frps didn't start properly")
      } else {
        reject(`frps didn't respond`)
        proc.kill("SIGINT")
      }
    }, 5000) // 500ms to wait for start

    async function checkIfRunning() {
      // TODO frps doesn't have a health check endpoint (as far as i can tell)
      // Issue: https://github.com/fatedier/frp/issues/2455
      // const result = await getJSON(`http://localhost:${bindPort}`).catch(
      //   () => null
      // )
      // if (result) {
      //   clearTimeout(processCloseTimeout)
      //   resolve()
      // } else {
      //   setTimeout(checkIffrpcRunning, 50)
      // }
      setTimeout(() => {
        if (!isClosed) {
          clearTimeout(processCloseTimeout)
          resolve()
        }
      }, 500)
    }
    checkIfRunning()
  })

  return {
    proc,
    stop: async () => {
      proc.kill("SIGINT")
    },
  }
}
