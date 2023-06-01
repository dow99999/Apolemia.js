const Slave = require("./classes/Slave.js");

const mu = require("./lib/monitorUtils.js")
const cfg = require("./config.json");

s = new Slave(cfg.master_ip, cfg.master_slave_port);

s.connect_monitoring();

(async () => {
  while(true) {
    s.send("monitor", await mu.osInfo());
  }
})()