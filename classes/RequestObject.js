class RequestObject {
  constructor(workspace, executor, main="", args=[]) {
    this.id = (executor + "_" + main + "_" + args.length + "_" + (+(new Date())))
    this.workspace = workspace;
    this.executor = executor;
    this.main = main;
    this.args = args.join(" ");

    this.job = null;
  }
}

module.exports = RequestObject;
