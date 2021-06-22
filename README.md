# Node FRP (node-frp2)

> frp is a fast reverse proxy to help you expose a local server behind a NAT or firewall to the Internet. As of now, it supports TCP and UDP, as well as HTTP and HTTPS protocols, where requests can be forwarded to internal services by domain name.

Use [frp](https://github.com/fatedier/frp) as an npm module for tighter integration with node apps (e.g. test fixtures).

## Usage

`npm install frp`

```javascript
// Web service to proxy (on client)
const webService = micro((req, res) => res.end("Hello world!"))
webService.listen(5000)

// Start FRPS server (normally you do this on a remote server with a public ip)
const server = await frp.startServer({
  common: {
    bindPort: 7000,
  },
})

// The frpc client requests to forward from 5000 locally to 2000 remotely
// through frps
const client = await frp.startClient({
  common: {
    serverPort: 7000,
    serverAddr: "127.0.0.1",
  },
  ssh: {
    type: "tcp",
    localIp: "127.0.0.1",
    localPort: 5000,
    remotePort: 2000,
  },
})

const response = await request(`http://127.0.0.1:2000`) 
// response === "Hello world!"
```
