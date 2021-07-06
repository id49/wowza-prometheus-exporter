require('dotenv').config()

const express = require('express')
const axios = require('axios')
const Prometheus = require('prom-client')

const auth = {
  username: process.env.WOWZA_USER,
  password: process.env.WOWZA_PASS
}

const app = express()
app.get('/:auth', async (req, res) => {
  if (req.params.auth === process.env.AUTH) {
    res.end(await Prometheus.register.metrics())
  } else {
    res.send({ auth: false })
  }
})
/*
const collectDefaultMetrics = Prometheus.collectDefaultMetrics
collectDefaultMetrics({
  timeout: 5000
})*/

const serviceHealthStreamsGauge = new Prometheus.Gauge({
  name: 'streams_health',
  help: 'Health streams',
  labelNames: ['server']
})
const serviceTotalStreamsGauge = new Prometheus.Gauge({
  name: 'streams_total',
  help: 'Total streams',
  labelNames: ['server']
})
const serverUptimeGauge = new Prometheus.Gauge({
  name: 'uptime',
  help: 'Server uptime',
  labelNames: ['server']
})
const serverBytesInGauge = new Prometheus.Gauge({
  name: 'server_bytesIn',
  help: 'Server bytesIn',
  labelNames: ['server']
})
const serverBytesInRateGauge = new Prometheus.Gauge({
  name: 'server_bytesInRate',
  help: 'Server bytesInRate',
  labelNames: ['server']
})
const serverBytesOutGauge = new Prometheus.Gauge({
  name: 'server_bytesOut',
  help: 'Server bytesOut',
  labelNames: ['server']
})
const serverBytesOutRateGauge = new Prometheus.Gauge({
  name: 'server_bytesOutRate',
  help: 'Server bytesOutRate',
  labelNames: ['server']
})
const serverTotalConnectionsGauge = new Prometheus.Gauge({
  name: 'server_totalConnections',
  help: 'Server totalConnections',
  labelNames: ['server']
})

const collectServerStatus = async () => {
  const url = `http://${process.env.WOWZA_SERVER}:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/live/monitoring/current`
  const res = await axios({
    method: 'get',
    url,
    auth
  })
  const {
    uptime,
    bytesIn,
    bytesOut,
    bytesInRate,
    bytesOutRate,
    totalConnections
  } = res.data

  serverUptimeGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    uptime
  )
  serverBytesInGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    bytesIn
  )
  serverBytesInRateGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    bytesInRate
  )
  serverBytesOutGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    bytesOut
  )
  serverBytesOutRateGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    bytesOutRate
  )

  serverTotalConnectionsGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    totalConnections
  )
}
const collectStreamsStatus = async () => {
  const url = `http://${process.env.WOWZA_SERVER}:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/live/instances/_definst_`
  const res = await axios({
    method: 'get',
    url,
    auth
  })
  const { incomingStreams } = res.data
  const validStreams = incomingStreams.filter(
    (item) => item.sourceIp !== item.name
  )
  const health = validStreams.filter((item) => item.isConnected)
  serviceHealthStreamsGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    health.length
  )
  serviceTotalStreamsGauge.set(
    {
      server: process.env.SERVER_NAME
    },
    validStreams.length
  )
}

setInterval(() => {
  try {
    collectStreamsStatus()
  } catch (err) {}
  try {
    collectServerStatus()
  } catch (err) {}
}, 10000)

const port = process.env.PORT || 3000
app.listen(port, (err) => {
  if (err) {
    console.log('problem running exporter', err)
  } else {
    console.log('exporter running on port', port)
  }
})
