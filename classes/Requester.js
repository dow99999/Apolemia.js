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
      console.log("Successfully connected to " + this.host + ":" + this.port);
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
  }


  startJob(workspace_path, executor, main="", args=[]) {
    lu.log(MODULE_NAME, "compressing...", ["zip"])

    const outputFile = workspace_path + "__temp.zip";
    let zip = new AdmZip();
    zip.addLocalFolder(workspace_path);
    zip.writeZip(outputFile);

    lu.log(MODULE_NAME, "sending...", ["zip"])
    let workspace = fs.readFileSync(workspace_path + "/__temp.zip", { encoding: "base64" });
    this.send("request", new RequesterObject(workspace, executor, main, args));
    fs.rmSync(workspace_path + "/__temp.zip")
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
        console.log("Received Pong!")
        break;
      case "zip":
        console.log("Received compressed file!");
        fs.writeFileSync("received.zip", Buffer.from(data, "base64"));
    }
  }
}

module.exports = Requester
