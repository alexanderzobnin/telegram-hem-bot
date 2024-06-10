const http = require("http");
const client = require("prom-client");

const METRIC_PREFIX = "hembot_";

const host = "localhost";
const port = 8080;

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

  const defaultHandler = (req, res) => {
    res.writeHead(404);
    res.end();
  };

  const server = http.createServer(requestHandler);
  server.listen(port, host);
}

const mHttpRequestCount = new client.Counter({
  name: METRIC_PREFIX + "http_request_count",
  help: "Number of ongoing HTTP requests from crawler",
});

module.exports = {
  initDefaultMetrics,
  mHttpRequestCount,
};
