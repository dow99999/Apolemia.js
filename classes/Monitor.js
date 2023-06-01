const lu = require("../lib/logUtils");

const Master = require("./Master");

const express = require("express");
const fs = require("fs")


const MODULE_NAME = "WebApp Monitor";



class Monitor {
  /**
   * 
   * @param {Int} port 
   * @param {Master} master 
   */
  constructor(port, master) {
    this.__master = master;
    this.PORT = port;
    this.APP = express();
  }

  startWebServer() {
    this.APP.get("/", (req, res) => {
      res.sendFile(__dirname + "/webApp/monitorization.html");
    })
    
    this.APP.get("/res", (req, res) => {
      let filename = req.query.file;
      let path = __dirname + "/webApp/res/" + filename;
      
      if(filename != null && fs.existsSync(path)) {
        res.sendFile(path);
      } else {
        res.send("File Not Found!");
      }
    })

    this.APP.get("/js", (req, res) => {
      res.sendFile(__dirname + "/webApp/js/main.js");
    })

    this.APP.get("/css", (req, res) => {
      res.sendFile(__dirname + "/webApp/css/main.css");
    })

    this.APP.post("/slaves", (req, res) => {
      let slave_stats = {};
      
      for(const [key, value] of Object.entries(this.__master.__slaves)) {
        if(value != null && value.stats != null && value.tokens != null) {
          slave_stats[key] = value.stats;
          slave_stats[key]["tokens"] = value.tokens;
        }
      }

      res.send(slave_stats);
    })

    this.APP.post("/jobs", (req, res) => {
      let queue = this.__master.__requests.queue.map((v) => {
        return {
          requester: v.requester_id,
          shard: v.slave_id,
          id: v.request.id,
          executor: v.request.executor
        }
      });
      let started = this.__master.__requests.started.map((v) => {
        return {
          requester: v.requester_id,
          shard: v.slave_id,
          id: v.request.id,
          executor: v.request.executor
        }
      });

      res.send({
        "queue": queue,
        "started": started
      });
    })

    this.APP.listen(this.PORT, () => {
      lu.log(MODULE_NAME, "Started Monitoring. Access on http://127.0.0.1:" + this.PORT);
    })
  }
}

module.exports = Monitor;