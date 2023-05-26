const osu = require("node-os-utils");

exports.info = async () => {
  let monitor_object = {
    cpu: await osu.cpu.usage(1000),
    ram: await osu.mem.info()
  }
  return monitor_object;
}