const Slave = require("./classes/Slave.js");

s = new Slave("localhost", 27927);

s.connect();

(async () => {
  while(true) {
    s.send("ping", null);
    await new Promise(r => setTimeout(r, 1000));
  }
})()