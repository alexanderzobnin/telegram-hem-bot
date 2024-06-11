const http = require("http");
const client = require("prom-client");

const METRIC_PREFIX = "hembot_";

const host = "localhost";
const port = process.env.METRICS_PORT || 8300;

async function initDefaultMetrics() {
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics();
  runMetricsServer(port, host, client.register);
}

async function runMetricsServer(port, host, register) {
  const requestHandler = async (req, res) => {
    switch (req.url) {
      case "/metrics":
        await metricsHandler(req, res);
        break;
      case "/health":
        await healthHandler(req, res);
        break;
      default:
        defaultHandler(req, res);
    }
  };

  const metricsHandler = async (req, res) => {
    const metrics = await register.metrics();
    res.setHeader("Content-Type", register.contentType);
    res.writeHead(200);
    res.end(metrics);
  };

  const healthHandler = (req, res) => {
    res.writeHead(200);
    res.end();
  };

  const defaultHandler = (req, res) => {
    res.writeHead(404);
    res.end();
  };

  const server = http.createServer(requestHandler);
  server.listen(port, host, () => {
    console.log(`Metrics server is running on http://${host}:${port}`);
  });
}

const mHttpRequestCount = new client.Counter({
  name: METRIC_PREFIX + "http_request_total",
  help: "Number of ongoing HTTP requests from crawler",
});

const mBotRequestCount = new client.Counter({
  name: METRIC_PREFIX + "bot_request_total",
  help: "Number of incoming requests handled by bot",
});

const mBotErrorCount = new client.Counter({
  name: METRIC_PREFIX + "bot_error_total",
  help: "Number of errors",
});

const mBotNewClientCount = new client.Counter({
  name: METRIC_PREFIX + "bot_new_client_total",
  help: "Number of new clients",
});

const mBotClients = new client.Gauge({
  name: METRIC_PREFIX + "bot_clients",
  help: "Number of clients",
});

module.exports = {
  initDefaultMetrics,
  mHttpRequestCount,
  mBotRequestCount,
  mBotErrorCount,
  mBotNewClientCount,
  mBotClients,
};
