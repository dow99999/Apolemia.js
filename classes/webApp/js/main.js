let used_interval = null;

async function fetchPost(url) {
  let data = await fetch(url, {
    method: "POST",
  });

  return await data.json();
}


async function getSlaves() {
  return await fetchPost("/slaves");
}

function getSlaveMonitorHtmlItem(slave_id, slave_stats) {
  let card = document.createElement("div");
  card.innerText = slave_id + ": " + slave_stats.cpu + " | " + slave_stats.ram.usedMemPercentage + " | " + slave_stats.tokens;
  card.classList.add("slave-card");

  return card;
}

async function loadSlavesData() {
  let box = document.getElementById("data");
  box.innerHTML = "";

  let slaves_data = await getSlaves();

  let nodes = {};

  for(const [key, value] of Object.entries(slaves_data)) {
    // let node = key.split(":");
    // node.splice(-1);
    // node.join(":");
    // console.log(node);

    // if(nodes[node] == null) {
    //   nodes[node] = {
    //     "cpu": value.stats.cpu,
    //     "total_ram": value.stats.ram.totalMemMb,
    //     "free_ram": value.stats.ram.freeMemMb,
    //     "used_ram": value.stats.ram.usedMemMb,
    //     "shards": 1
    //   }
    // }

    // nodes[node]
    box.appendChild(getSlaveMonitorHtmlItem(key, value));
  }
  
}

async function loadData(target) {
  if(used_interval != null) {
    clearInterval(used_interval);
  }
  target();

  used_interval = setInterval(() => {
    target()
  }, 1000);
}

async function loadClusterStats() {
  loadSlavesData();
}

window.onload = async () => {
  document.getElementById("sla-btn").addEventListener("click", () => loadData(loadSlavesData));


}