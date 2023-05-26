const fs = require("fs");
const crypto = require("crypto")

const { WebSocketServer } = require("ws");

const DataObject = require("./DataObject");
const SlaveData = require("./SlaveData");

const lu = require("../lib/logUtils");
const MODULE_NAME = "Master";



class Master {
  constructor(port) {
    this.__wss_slave_monitor = new WebSocketServer({ port: port })

    this.__request_wss = new WebSocketServer({ port: port + 10 })

    this.__requesters = {}
    this.__slaves = {}

    // process.on('SIGINT', async () => {
    //   console.log("Closing Requesters...");

    //   console.log("Closing Slaves...");
    //   for(const [key, value] of Object.entries(this.__slaves)) {
    //     await value.ws.close();
    //   }
      
    //   process.exit();
    // });
  }

  listen_to_requests() {
    this.__request_wss.on('connection', (ws) => {
      let addr = ws._socket.remoteAddress;
      let port = ws._socket.remotePort;
      
      let ws_id = `${addr}:${port}`;
      // Add requester to requesters' register
      if (addr !== undefined && port !== undefined) {
        lu.log(MODULE_NAME, ws_id, ["Requester", "Connect"]);
        this.__requesters[ws_id] = ws;
      }

      // Parse messages from requester
      ws.on('message', (e) => { this._requesterMessageParser(ws_id, e) })

      // Close connection to requester
      ws.on('close', (e) => {
        this.__requesters[ws_id] = undefined;
        lu.log(MODULE_NAME, ws_id, ["Requester", "Disconnect"])
      })

    });
  }

  listen_to_slave_additions() {
    this.__wss_slave_monitor.on('connection', async (ws) => {
      let addr = ws._socket.remoteAddress;
      let port = ws._socket.remotePort;

      let ws_id = `${addr}:${port}`;
      // Add slave to slaves' register
      if (addr !== undefined && port !== undefined) {
        lu.log(MODULE_NAME, ws_id, ["Slave", "Connected"]);
        this.__slaves[ws_id] = new SlaveData(crypto.createHash("md5").update(ws_id).digest("hex"), ws);

        fs.mkdirSync("./slave_dock/" + this.__slaves[ws_id].id);
      }

      // Parse messages from slave
      ws.on('message', (e) => { this._slaveMessageParser(ws_id, e) })
      
      // Close connection to slave
      ws.on('close', (e) => {
        fs.rmdirSync("./slave_dock/" + this.__slaves[ws_id].id);
        this.__slaves[ws_id] = undefined;
        lu.log(MODULE_NAME, ws_id, ["Slave", "Disconnected"]);
      })
    });
  }

  getTargetSlaveID() {
    return Object.entries(this.__slaves)[0][0];
  }

  _slaveMessageParser(ws_id, raw_data) {
    if (raw_data === undefined) return;

    let dataObject = new DataObject().load_socket_data(raw_data);

    lu.log(MODULE_NAME, ws_id, ["Message", dataObject.type]);
    switch (dataObject.type) {
      case "ping":
        this.__slaves[ws_id].ws_monitor.send(new DataObject("pong", null).get_socket_ready_data())
        break;
      case "monitor":
        this.__slaves[ws_id].stats = dataObject.data;
        console.log(this.__slaves[ws_id].stats)
        break;
    }
  }

  _requesterMessageParser(ws_id, raw_data) {
    if (raw_data === undefined) return;

    let dataObject = new DataObject().load_socket_data(raw_data);

    lu.log(MODULE_NAME, ws_id, ["Message", dataObject.type]);
    switch (dataObject.type) {
      case "ping":
        this.__requesters[ws_id].ws.send(new DataObject("pong", null).get_socket_ready_data())
        break;
      case "request":
        this.__slaves[this.getTargetSlaveID()].ws_monitor.send(new DataObject("request", dataObject.data).get_socket_ready_data());
        break;
    }
  }
}

module.exports = Master
