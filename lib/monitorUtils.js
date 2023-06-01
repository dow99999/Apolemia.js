const os = require("os");

/**
 * based on https://gist.github.com/bag-man/5570809
 * @returns 
 */
async function cpuUsage(interval) {
  function cpuAverage() {

    //Initialise sum of idle and time of cores and fetch CPU info
    var totalIdle = 0, totalTick = 0;
    var cpus = os.cpus();

    //Loop through CPU cores
    for (var i = 0, len = cpus.length; i < len; i++) {

      //Select CPU core
      var cpu = cpus[i];

      //Total up the time in the cores tick
      for (type in cpu.times) {
        totalTick += cpu.times[type];
      }

      //Total up the idle time of the core
      totalIdle += cpu.times.idle;
    }

    //Return the average Idle and Tick times
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
  }

  //Grab first CPU Measure
  var startMeasure = cpuAverage();

  await new Promise(r => setTimeout(r, interval));

  //Grab second Measure
  var endMeasure = cpuAverage();

  //Calculate the difference in idle and total time between the measures
  var idleDifference = endMeasure.idle - startMeasure.idle;
  var totalDifference = endMeasure.total - startMeasure.total;

  //Calculate the average percentage CPU usage
  var percentageCPU = 100 - (100 * idleDifference / totalDifference);

  //Output result to console
  return percentageCPU;
}

exports.osInfo = async () => {
  return {
    cpu: {
      usage: await cpuUsage(1000),
      threads: os.cpus()
    },
    ram: {
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      usedmem: os.totalmem() - os.freemem()
    }
  }
}