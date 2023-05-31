const cp = require("child_process");

class JobObject {
  constructor(id, executor, command) {
    this.id = id;
    this.executor = executor;
    this.command = command;
    
    this.started = false;
    this.ended = false;

    this.stdout = "";

    this.workspace = null;
  }

  async startJob(path) {
    this.started = true;
    
    let child = cp.spawn(this.executor, this.command.split(" "), { encoding : 'utf8', cwd: path });

    await new Promise(resolve => {
      child.stdout.setEncoding('utf8');
      child.stdout.on("data", (data) => {
        this.stdout += data.toString();
      })

      child.on("close", resolve)
    })

    this.ended = true;
  }
}

module.exports = JobObject;
