const lu = require("../lib/logUtils");

const { WebSocketServer } = require("ws");

const SlaveData = require("./SlaveData");
const JobObject = require("./JobObject");
const DataObject = require("./DataObject");
const RequesterObject = require("./RequestObject");
const Monitor = require("./Monitor");

const cfg = require("../config.json");

const MODULE_NAME = "Master";


class Master {

  /**
   * One of the three Agents, used to orchestrate all Requesters and Slaves
   * 
   * @param {Int} slave_port Port for slaves' connection
   * @param {Int} request_port Port for requesters' connection
   */
  constructor(slave_port, request_port) {
    this.SLAVE_PORT = slave_port;
    this.REQUEST_PORT = request_port;

    this.__monitor = new Monitor(cfg.web_monitor_port, this);

    this.__wss_slave_monitor = new WebSocketServer({
        port: this.SLAVE_PORT,
        maxPayload: 15 * 1024 * 1024 * 1024, // 15GB
      })
    this.__request_wss = new WebSocketServer({
      port: this.REQUEST_PORT,
      maxPayload: 15 * 1024 * 1024 * 1024, // 15GB
    })

    this.__requesters = {}
    this.__slaves = {}

    this.__requests = {
      "queue": [],
      "started": []
    }

    // process.on('SIGINT', async () => {
    //   console.log("Closing Requesters...");

    //   console.log("Closing Slaves...");
    //   for(const [key, value] of Object.entries(this.__slaves)) {
    //     await value.ws.close();
    //   }
      
    //   process.exit();
    // });

    setInterval(() => {
      this.tryStartingJobs();
    }, 1000);

    this.__monitor.startWebServer();
  }

  /**
   * Starts listening to Job requesters
   */
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
      ws.on('message', async (e) => { this._requesterMessageParser(ws_id, e) })

      // Close connection to requester
      ws.on('close', (e) => {
        delete this.__requesters[ws_id];
        lu.log(MODULE_NAME, ws_id, ["Requester", "Disconnect"])
      })

    });

    lu.log(MODULE_NAME, "Listening Requesters on port " + this.REQUEST_PORT);
  }

  /**
   * Starts listening to new Slaves
   */
  listen_to_slave_additions() {
    this.__wss_slave_monitor.on('connection', async (ws) => {
      let addr = ws._socket.remoteAddress;
      let port = ws._socket.remotePort;

      let ws_id = `${addr}:${port}`;
      // Add slave to slaves' register
      if (addr !== undefined && port !== undefined) {
        lu.log(MODULE_NAME, ws_id, ["Slave", "Connected"]);
        this.__slaves[ws_id] = new SlaveData(ws_id, ws);

        // fs.mkdirSync("./slave_dock/" + this.__slaves[ws_id].id);
      }

      // Parse messages from slave
      ws.on('message', async (e) => { this._slaveMessageParser(ws_id, e) })
      
      // Close connection to slave
      ws.on('close', (e) => {
        // fs.rmdirSync("./slave_dock/" + this.__slaves[ws_id].id);
        delete this.__slaves[ws_id];
        lu.log(MODULE_NAME, ws_id, ["Slave", "Disconnected"]);
      })
    });

    lu.log(MODULE_NAME, "Listening Slaves on port " + this.SLAVE_PORT)
  }


  /**
   * Calculates the best target Slave based on CPU usage
   * @returns {String} Slave's ID
   */
  getTargetSlaveID() {
    let min = [null, null];

    for(const [id, slave] of Object.entries(this.__slaves)) {
      if(slave.stats == null) continue;

      if(min[0] == null || (slave.tokens > 0 && min[1] < slave.stats.cpu.usage)) {
        min = [id, slave.stats.cpu.usage]
      }
    }

    return min[0];
  }

  /**
   * Adds a traceable request to the request queue
   * @param {RequesterObject} request 
   */
  queueRequest(requester_id, request) {
    this.__requests.queue.push(new Master.RequestTrace(requester_id, null, request));
  }

  /**
   * Checks all queued requests and tries to assign them to an available Slave
   */
  async tryStartingJobs() {
    let requests = this.__requests.queue;
    for(let i = 0; i < requests.length; i++) {
      let slave_id = this.getTargetSlaveID();
      if(slave_id == null) return;
      
      let slave = this.__slaves[slave_id];
      let requester = this.__requesters[requests[i].requester_id];
      
      // If target slave still has tokens
      if(slave.tokens > 0) {
        slave.tokens--;
        requests[i].request.started = true;
        requests[i].slave_id = slave_id;
        slave.ws_monitor.send(new DataObject("request", requests[i].request).get_socket_ready_data());
        requester.send(new DataObject("info", "Started job with id " + requests[i].request.id).get_socket_ready_data());
        
        delete requests[i].request.workspace;
        // Move to started jobs
        this.__requests.started.push(requests[i]);
        
        // Nullify from queue jobs
        this.__requests.queue[i] = null;
      }
    }

    // Cleanup
    this.__requests.queue = this.__requests.queue.filter(e => e != null);
  }

  /**
   * Ends a Request from a given finalized job
   * @param {JobObject} job a fullfilled job
   */
  prepareEndedJob(job) {
    let requests = this.__requests.started;

    for(let i = 0; i < requests.length; i++) {
      if(requests[i].request.id == job.id) {
        requests[i].request.job = job;
        this.__slaves[requests[i].slave_id].tokens++;
        requests[i].request.end_epoch = +(new Date());
        this.__requesters[requests[i].requester_id].send((new DataObject("job", requests[i].request)).get_socket_ready_data());
        this.__requests.started[i] = null;
      }
    }

    this.__requests.started = this.__requests.started.filter(e => e != null);
  }

  /**
   * Parses a received message from a Slave
   * 
   * @param {String} ws_id The websocket ID
   * @param {String} raw_data A valid JSON String
   */
  _slaveMessageParser(ws_id, raw_data) {
    if (raw_data === undefined) return;

    let dataObject = new DataObject().load_socket_data(raw_data);

    // lu.log(MODULE_NAME, ws_id, ["Message", dataObject.type]);
    switch (dataObject.type) {
      case "ping":
        this.__slaves[ws_id].ws_monitor.send(new DataObject("pong", null).get_socket_ready_data())
        break;
      case "monitor":
        this.__slaves[ws_id].stats = dataObject.data;
        if(this.__slaves[ws_id].tokens == -1) {
          this.__slaves[ws_id].tokens = dataObject.data.cpu.threads.length;
        }
        // console.log(this.__slaves[ws_id].stats)
        break;
      case "job":
        lu.log(MODULE_NAME, dataObject.data.id, ["Ended Job"]);
        this.prepareEndedJob(dataObject.data);
        break;
    }
  }

  /**
   * Parses a received message from a Requester
   * 
   * @param {String} ws_id The websocket ID
   * @param {String} raw_data A valid JSON String
   */
  _requesterMessageParser(ws_id, raw_data) {
    if (raw_data === undefined) return;

    let dataObject = new DataObject().load_socket_data(raw_data);

    lu.log(MODULE_NAME, ws_id, ["Message", dataObject.type]);
    switch (dataObject.type) {
      case "ping":
        this.__requesters[ws_id].ws.send(new DataObject("pong", null).get_socket_ready_data());
        break;
      case "request":
        this.queueRequest(ws_id, dataObject.data);
        break;
    }
  }
}

Master.RequestTrace = class {
  /**
   * JavaBean used to trace a Request
   * @param {String} requester_id 
   * @param {String} slave_id 
   * @param {RequesterObject} request 
   */
  constructor(requester_id, slave_id, request) {
    this.requester_id = requester_id;
    this.slave_id = slave_id;
    this.request = request;
  }
}


module.exports = Master
