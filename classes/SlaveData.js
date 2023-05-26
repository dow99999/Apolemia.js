class SlaveData {
  constructor(id, ws_monitor) {
    this.id = id;
    this.ws_monitor = ws_monitor;
    this.stats = null;
  }
}

module.exports = SlaveData;