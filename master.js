const Master = require("./classes/Master.js");

let master = new Master(27900);

master.listen_to_slave_additions();
master.listen_to_requests();
