const Requester = require("./classes/Requester.js");

const cfg = require("./config.json");

new Requester(cfg.master_ip, cfg.master_request_port)
  .connect()
  .startJob("./test/", "node", "main.js", ["1", "2"]);
