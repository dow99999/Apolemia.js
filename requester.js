const Requester = require("./classes/Requester.js");

s = new Requester("127.0.0.1", 27910);
s.connect();

s.startJob("./", "node", "client.js");
