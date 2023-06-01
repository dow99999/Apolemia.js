const Requester = require("./classes/Requester.js");

const cfg = require("./config.json");

if(process.argv.length < 3) {
  console.log("Usage: ")
  console.log("exec <workspace_path> <executor> <main_filename> [<arg1> [<arg2>] ...]")
  process.exit()
}


new Requester(cfg.master_ip, cfg.master_request_port)
  .connect()
  .startJob(process.cwd(), process.argv[2], process.argv[3], process.argv.slice(5));
