class DataObject {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }

  load_socket_data(raw_data) {
    let data_object = JSON.parse(raw_data);
    
    this.type = data_object.type;
    this.data = data_object.data;

    return this;
  }

  get_socket_ready_data() {
    return JSON.stringify({ "type": this.type, "data": this.data })
  }
}

module.exports = DataObject;