const cp = require("child_process");

class JobObject {
  constructor(id, executor, command) {
    this.id = id
    this.executor = executor;
    this.command = command;
    
    this.started = false;
    this.ended = false;

    this.stdout = ""
  }

  startJob(path) {
    this.started = true;
    console.log("job " + path);
    
    let child = cp.spawnSync(this.executor, this.command.split(" "), { encoding : 'utf8', cwd: path });
    this.stdout = child.stdout;
    
    this.ended = true;
  }
}

module.exports = JobObject;
