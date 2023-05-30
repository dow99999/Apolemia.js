const fs = require("fs")

const mu = require("../lib/monitorUtils");

const AdmZip = require("adm-zip");
const { WebSocket } = require("ws");
const DataObject = require("./DataObject");
const RequestObject = require("./RequestObject");
const JobObject = require("./JobObject");

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
      console.log("Can't reach host " + this.host + ":" + this.port);
      await new Promise(r => setTimeout(r, 5000));
      this.connect_monitoring()
    };

    this.__ws_monitor.addEventListener("open", () => {
      console.log("Successfully connected to " + this.host + ":" + this.port);
      this.connected = true;
    })

    this.__ws_monitor.addEventListener("message", (e) => {
      this._messageParser(e.data)
    })

    this.__ws_monitor.addEventListener("close", async (e) => {
      console.log("Closed socket to " + this.host + ":" + this.port + ", trying to reconnect...")
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
  startJob(path, request) {
    let job = new JobObject(request.id, request.executor, request.main + " " + request.args);

    job.startJob(path);

    return job;
  }

  _messageParser(raw_data) {
    if(raw_data === undefined) return;
    let dataObject = new DataObject().load_socket_data(raw_data);
    let type = dataObject.type;
    let data = dataObject.data;
    
    switch(type) {
      case "pong":
        console.log("Received Pong!")
        break;
      case "zip":
        console.log("Received compressed file!");
        fs.writeFileSync("received.zip", Buffer.from(data, "base64"));
        break;
      case "request":
        console.log("Received Request!!");
        fs.mkdirSync("./workspaces/" + data.id);
        fs.writeFileSync("./workspaces/" + data.id + "/workspace.zip", Buffer.from(data.workspace, "base64"));
        
        let zip = new AdmZip("./workspaces/" + data.id + "/workspace.zip");
        zip.extractAllTo("./workspaces/" + data.id + "/", true);
        fs.rmSync("./workspaces/" + data.id + "/workspace.zip")
        
        let job = this.startJob("./workspaces/" + data.id, data);

        zip = new AdmZip()
        zip.addLocalFolder("./workspaces/" + data.id);
        zip.writeZip("./workspaces/" + data.id + "/workspace.zip");

        console.log(job.stdout);
        
        job.workspace = fs.readFileSync("./workspaces/" + data.id + "/workspace.zip", { encoding: "base64" });

        this.send("job", job);

        fs.rmSync("./workspaces/" + data.id, { recursive: true });
    }
  }
}

module.exports = Slave
