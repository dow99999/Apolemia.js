const fs = require("fs")

const mu = require("../lib/monitorUtils");
const lu = require("../lib/logUtils");

const AdmZip = require("adm-zip");
const { WebSocket } = require("ws");
const DataObject = require("./DataObject");
const RequesterObject = require("../classes/RequestObject.js");

const MODULE_NAME = "Requester"

class Requester {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.__ws_requester = null;

    this.connected = false;
  }

  connect() {
    this.__ws_requester = new WebSocket("ws:" + this.host + ":" + this.port);
    
    this.__ws_requester.onerror = async () => {
      console.log("Can't reach host " + this.host + ":" + this.port);
      await new Promise(r => setTimeout(r, 5000));
      this.connect()
    };

    this.__ws_requester.addEventListener("open", () => {
      console.log("Successfully connected to Master@" + this.host + ":" + this.port);
      this.connected = true;
    })

    this.__ws_requester.addEventListener("message", (e) => {
      this._messageParser(e.data)
    })

    this.__ws_requester.addEventListener("close", async (e) => {
      console.log("Closed socket to " + this.host + ":" + this.port + ", trying to reconnect...")
      await new Promise(r => setInterval(r, 5000));
      if(this.connected) {
        this.connected = false;
        this.connect();
      }
    })

    return this;
  }


  startJob(workspace_path, executor, main="", args=[]) {
    lu.log(MODULE_NAME, "compressing...", ["workspace"])

    const outputFile = workspace_path + "/__temp" + (+(new Date)) + ".zip";
    let zip = new AdmZip();
    zip.addLocalFolder(workspace_path);
    zip.writeZip(outputFile);

    let workspace = fs.readFileSync(outputFile, { encoding: "base64" });
    lu.log(MODULE_NAME, "sending...", ["workspace"])
    this.send("request", new RequesterObject(workspace, executor, main, args));
    fs.rmSync(outputFile)
  }

  async send(type, data) {
    let sent = false;
    do {
      if (this.connected) {
        this.__ws_requester.send((new DataObject(type, data)).get_socket_ready_data());
        sent = true;
      }
      await new Promise(r => setInterval(r, 2000));
    } while(!sent);
  }

  _messageParser(raw_data) {
    if(raw_data === undefined) return;
    let dataObject = new DataObject().load_socket_data(raw_data);
    let type = dataObject.type;
    let data = dataObject.data;
    
    switch(type) {
      case "pong":
        lu.log(MODULE_NAME, "", ["pong"]);
        break;
      case "info":
        lu.log(MODULE_NAME, data, ["info"]);
        break;
      case "job":
        lu.log(MODULE_NAME, "Received Results from Job " + data.id);
        
        
        fs.mkdirSync("./apolemia_responses/" + data.id, { recursive: true });
        fs.writeFileSync("./apolemia_responses/" + data.id + "/workspace.zip", Buffer.from(data.job.workspace, "base64"));
        
        let zip = new AdmZip("./apolemia_responses/" + data.id + "/workspace.zip");
        zip.extractAllTo("./apolemia_responses/" + data.id + "/", true);
        fs.rmSync("./apolemia_responses/" + data.id + "/workspace.zip");
        
        fs.writeFileSync("./apolemia_responses/" + data.id + "/stdout.txt", data.job.stdout);
        lu.log(MODULE_NAME, "Saved Results on " + "./apolemia_responses/" + data.id);
        
        process.exit()
    }
  }
}

module.exports = Requester
