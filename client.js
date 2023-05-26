const Slave = require("./classes/Slave.js");

const mu = require("./lib/monitorUtils.js")

s = new Slave("127.0.0.1", 27900);

s.connect_monitoring();

(async () => {
  while(true) {
    s.send("monitor", await mu.info());
  }
})()