class RequestObject {
  constructor(workspace, executor, main="", args=[]) {
    let now = +(new Date())
    this.id = require('crypto').createHash('md5').update((executor + "_" + main + "_" + args.length + "_" + now)).digest("hex")
    this.workspace = workspace;
    this.executor = executor;
    this.main = main;
    this.args = args.join(" ");

    this.start_epoch = now;
    this.end_epoch = null;

    this.job = null;
  }
}

module.exports = RequestObject;
