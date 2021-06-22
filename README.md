# Node FRP

> frp is a fast reverse proxy to help you expose a local server behind a NAT or firewall to the Internet. As of now, it supports TCP and UDP, as well as HTTP and HTTPS protocols, where requests can be forwarded to internal services by domain name.

Use [frp](https://github.com/fatedier/frp as an npm module for tighter integration with node apps (e.g. test fixtures).

## Usage

`npm install frp`

```javascript
const frp = require("frp")

const server = frpc.startClient({})

// you can also do this...
// frp.startClient("/path/to/frpc.ini")

// ...let stuff happen

server.stop()
```
