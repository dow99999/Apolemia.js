class RequestObject {
  constructor(workspace, executor, main="", args=[]) {
    this.workspace = workspace;
    this.executor = executor;
    this.main = main;
    this.args = args.join(" ");
  }
}

module.exports = RequestObject;
