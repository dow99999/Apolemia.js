const fs = require("fs");
const targz = require("targz");

const DataObject = require("./DataObject");
const { WebSocketServer } = require("ws");

class Master {
  constructor (port) {
    this.__wss = new WebSocketServer({port: port})
    
    this.__slaves = {}
  }

  compressAndSend(path, ws) {
    console.log("compressing...")

    targz.compress({
      src: path,
      dest: path + "/_temp.tar.gz"
    }, (err) => {
      console.log(err)
      console.log("sending...")
      let workspace = fs.readFileSync(path + "/_temp.tar.gz", {encoding: "base64"});
      ws.send((new DataObject("tar.gz", workspace)).get_socket_ready_data());
    });
    

  }

  listen() {
    this.__wss.on('connection', (ws) => {
      let addr = ws._socket.remoteAddress;
      let port = ws._socket.remotePort;
      
      let ws_id = `${addr}:${port}`;
      // Add slave to slaves' register
      if(addr !== undefined && port !== undefined) {
        console.log(ws_id + " connected.");
        this.__slaves[ws_id] = ws;
      }
      
      this.compressAndSend("./", this.__slaves[ws_id]);

      // Parse messages from slave
      ws.on('message', (e) => { this._messageParser(ws_id, e) })
      // Parse messages from slave
      ws.on('close', (e) => {
        this.__slaves[ws_id] = undefined;
        console.log(ws_id + " disconnected.")
      })
    });
  }
  
  _messageParser(ws_id, raw_data) {
    if(raw_data === undefined) return;
    
    let dataObject = new DataObject().load_socket_data(raw_data);
    console.log(dataObject)
    
    switch(dataObject.type) {
      case "ping":
        console.log("Received ping from " + ws_id);
        this.__slaves[ws_id].send(new DataObject("pong", null).get_socket_ready_data())
        break;
      }
    }
}

module.exports = Master
