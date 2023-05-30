const Master = require("./classes/Master.js");

const cfg = require("./config.json");

let master = new Master(cfg.master_slave_port, cfg.master_request_port);

master.listen_to_slave_additions();
master.listen_to_requests();
