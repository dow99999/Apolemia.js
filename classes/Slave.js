const fs = require("fs")


const mu = require("../lib/monitorUtils");
const lu = require("../lib/logUtils");

const AdmZip = require("adm-zip");
const { WebSocket } = require("ws");
const DataObject = require("./DataObject");
const RequestObject = require("./RequestObject");
const JobObject = require("./JobObject");

const MODULE_NAME = "Slave";

class Slave {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.__ws_monitor = null;
    this.__ws_workspaces = null;

    this.__jobs = []

    this.connected = false;
  }

  connect_monitoring() {
    this.__ws_monitor = new WebSocket("ws:" + this.host + ":" + this.port);
    
    this.__ws_monitor.onerror = async () => {
      lu.log(MODULE_NAME, "Can't reach host " + this.host + ":" + this.port);
      await new Promise(r => setTimeout(r, 5000));
      this.connect_monitoring()
    };

    this.__ws_monitor.addEventListener("open", () => {
      lu.log(MODULE_NAME, "Successfully connected to Master@" + this.host + ":" + this.port);
      this.connected = true;
    })

    this.__ws_monitor.addEventListener("message", async (e) => {
      await this._messageParser(e.data);
    })

    this.__ws_monitor.addEventListener("close", async (e) => {
      lu.log(MODULE_NAME, "Closed socket to " + this.host + ":" + this.port + ", trying to reconnect...")
      await new Promise(r => setInterval(r, 5000));
      if(this.connected) {
        this.connected = false;
        this.connect_monitoring();
      }
    })
  }

  async send(type, data) {
    if (this.connected) {
      this.__ws_monitor.send((new DataObject(type, data)).get_socket_ready_data())
    }
  }

  /**
   * 
   * @param {RequestObject} request 
   */
  async startJob(path, request) {
    let job = new JobObject(request.id, request.executor, request.main + " " + request.args);
    job.started = true;
    lu.log(MODULE_NAME, "Started Job " + job.id, ["info"]);
    await job.startJob(path);
    lu.log(MODULE_NAME, "Ended Job " + job.id, ["info"]);
    job.ended = true;

    return job;
  }

  async _messageParser(raw_data) {
    if(raw_data === undefined) return;
    let dataObject = new DataObject().load_socket_data(raw_data);
    let type = dataObject.type;
    let data = dataObject.data;
    
    switch(type) {
      case "pong":
        lu.log(MODULE_NAME, "Received Pong!")
        break;
      case "request":
        lu.log(MODULE_NAME, "Received Request", ["info"]);
        fs.mkdirSync("./workspaces/" + data.id);
        fs.writeFileSync("./workspaces/" + data.id + "/workspace.zip", Buffer.from(data.workspace, "base64"));
        
        let zip = new AdmZip("./workspaces/" + data.id + "/workspace.zip");
        zip.extractAllTo("./workspaces/" + data.id + "/", true);
        fs.rmSync("./workspaces/" + data.id + "/workspace.zip")
        
        let job = await this.startJob("./workspaces/" + data.id, data);
        zip = new AdmZip()
        zip.addLocalFolder("./workspaces/" + data.id);
        zip.writeZip("./workspaces/" + data.id + "/workspace.zip");
        
        job.workspace = fs.readFileSync("./workspaces/" + data.id + "/workspace.zip", { encoding: "base64" });
        
        this.send("job", job);
        
        fs.rmSync("./workspaces/" + data.id, { recursive: true });
    }
  }
}

module.exports = Slave
