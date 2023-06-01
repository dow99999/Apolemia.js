class SlaveData {
  constructor(id, ws_monitor) {
    this.id = id;
    this.ws_monitor = ws_monitor;
    this.stats = null;

    this.tokens = -1;
  }
}

module.exports = SlaveData;