const fs = require("fs")

const { WebSocket } = require("ws");
const DataObject = require("./DataObject");

class Slave {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.__socket = null;

    this.connected = false;
  }

  connect() {
    this.__socket = new WebSocket("ws:" + this.host + ":" + this.port);
    
    this.__socket.onerror = async () => {
      console.log("Can't reach host " + this.host + ":" + this.port);
      await new Promise(r => setTimeout(r, 5000));
      this.connect()
    };

    this.__socket.addEventListener("open", () => {
      console.log("Successfully connected to " + this.host + ":" + this.port);
      this.connected = true;
    })

    this.__socket.addEventListener("message", (e) => {
      this._messageParser(e.data)
    })

    this.__socket.addEventListener("close", async (e) => {
      console.log("Closed socket to " + this.host + ":" + this.port + ", trying to reconnect...")
      await new Promise(r => setInterval(r, 5000));
      if(this.connected) {
        this.connected = false;
        this.connect();
      }
    })
  }

  async send(type, data) {
    if (this.connected) {
      this.__socket.send((new DataObject(type, data)).get_socket_ready_data())
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
      case "tar.gz":
        console.log("Received compressed file!");
        fs.writeFileSync("received.tar.gz", Buffer.from(data, "base64"));
    }
  }
}

module.exports = Slave
