const fs = require("fs")

const mu = require("../lib/monitorUtils");

const AdmZip = require("adm-zip");
const { WebSocket } = require("ws");
const DataObject = require("./DataObject");

class Slave {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.__ws_monitor = null;
    this.__ws_workspaces = null;

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
        fs.writeFileSync("workspace.zip", Buffer.from(data.workspace, "base64"));
    }
  }
}

module.exports = Slave
