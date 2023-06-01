const Requester = require("./classes/Requester.js");

const cfg = require("./config.json");

if(process.argv.length < 4) {
  console.log("ERROR: Not Enough Parameters")
  console.log("Usage: ")
  console.log("exec <executor> <main_filename> [<arg1> [<arg2>] ...]")
  process.exit()
}


new Requester(cfg.master_ip, cfg.master_request_port)
  .connect()
  .startJob(process.cwd(), process.argv[2], process.argv[3], process.argv.slice(5));
