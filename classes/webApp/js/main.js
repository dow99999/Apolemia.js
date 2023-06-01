let g_nodes = {};
let g_qjobs = {};
let g_sjobs = {};

let used_interval = null;

let showing = "main";

async function fetchPost(url) {
  let data = await fetch(url, {
    method: "POST",
  });

  return await data.json();
}


async function getSlaves() {
  return await fetchPost("/slaves");
}

async function getJobs() {
  return await fetchPost("/jobs");
}

function getJobHtmlItem(job) {
  let card = document.createElement("div");

  card.innerHTML = `
  <div>
    <div id=${job.id}-id>Job ID: <span>${job.id}</span></div>
  </div>
  <div>
    <div id=${job.id}-req>Requester ID: <span>${job.requester}</span></div>
    <div id=${job.id}-sha>Assigned Slave: <span>${job.shard_id}</span></div>
    <div id=${job.id}-exec>Executor: <span>${job.executor}</span></div>
  </div>
  `;
  
  card.classList.add("job-card");

  return card;
}

function getNodeMonitorHtmlItem(slave_id, slave_stats) {
  let card = document.createElement("div");

  card.innerHTML = `
  <div>
    <div id=${slave_id}-id>Slave ID: <span>${slave_id}</span></div>
  </div>
  <div>
    <div id=${slave_id}-cpu></div>
    <div id=${slave_id}-ram></div>
    <div id=${slave_id}-shards></div>
    <div id=${slave_id}-threads></div>
    <div id=${slave_id}-tokens></div>
  </div>
  `;
  
  card.classList.add("slave-card");

  return card;
}

/**
 * 
 * @param {Element} card 
 */
function updateNodeCard(card, slave_stats) {
  let cpu = slave_stats.cpu != null ? slave_stats.cpu.usage.toFixed(2) : "-";
  let ram = slave_stats.ram != null ? (100 * slave_stats.ram.usedmem / slave_stats.ram.totalmem).toFixed(2) : "-";
  let shards = slave_stats != null ? Object.entries(slave_stats.shards).length : "-";
  let tokens = 0;

  for(const [key, value] of Object.entries(slave_stats.shards)) {
    tokens += value.tokens;
  }


  card.children[1].children[0].innerHTML = "CPU: <span>" + cpu + " %</span>";
  card.children[1].children[1].innerHTML = "RAM: <span>" + ram + " %</span>";
  card.children[1].children[2].innerHTML = "Shards: <span>" + shards + "</span>";
  card.children[1].children[3].innerHTML = "Slave Physical Threads: <span>" + slave_stats.cpu.threads.length + "</span>";
  card.children[1].children[4].innerHTML = "Available Tokens: <span>" + tokens + "</span>";
}

async function loadSlavesData() {
  let slaves = await getSlaves();
  let timestamp = +(new Date());

  for(const [key, value] of Object.entries(slaves)) {
    let node_ip = key.split(":");
    let node_port = node_ip.splice(-1);
    node_ip = node_ip.join(":");


    if(g_nodes[node_ip] == null) {
      g_nodes[node_ip] = {
        cpu: null,
        ram: null,
        shards: {},
        card: null
      };
      g_nodes[node_ip].card = getNodeMonitorHtmlItem(node_ip, g_nodes[node_ip]);
      if(showing == "slaves") {
        document.getElementById("data").appendChild(g_nodes[node_ip].card);
      }
    }
    
    g_nodes[node_ip].cpu = value.cpu;
    g_nodes[node_ip].ram = value.ram;
    g_nodes[node_ip].shards[node_port] = { 
      "update": timestamp,
      "tokens": value.tokens
    };

    updateNodeCard(g_nodes[node_ip].card, g_nodes[node_ip]);
  }

  // Cleanup
  for(const [s_key, s_value] of Object.entries(g_nodes)) {
    for(const [key, value] of Object.entries(s_value.shards)) {
      if(value.update != timestamp) {
        delete s_value.shards[key];
      }
    }
    if(Object.entries(s_value.shards).length == 0) {
      if(showing == "slaves") {
        document.getElementById("data").removeChild(g_nodes[s_key].card);
      }
        delete g_nodes[s_key];
    }
  }

  
  if(showing == "main") {
    let cpu_avg = 0;
    let tot_ram = 0;
    let ava_ram = 0;

    for(const [s_key, s_value] of Object.entries(g_nodes)) {
      cpu_avg += s_value.cpu.usage;
      tot_ram += s_value.ram.totalmem;
      ava_ram += s_value.ram.freemem;
    }

    cpu_avg /= Math.max(Object.entries(g_nodes).length, 1);

    document.getElementById("n-nodes").innerText = Object.entries(g_nodes).length;
    document.getElementById("avg-cpu").innerText = cpu_avg.toFixed(2) + " %";
    document.getElementById("tot-ram").innerText = (tot_ram/1000000).toFixed(2) + " MB";
    document.getElementById("ava-ram").innerText = (ava_ram/1000000).toFixed(2) + " MB";
  }
}


async function loadJobsData() {
  let jobs = await getJobs();
  let timestamp = +(new Date());
  
  for(let i = 0; i < jobs.queue.length; i++) {
    if(g_qjobs[jobs.queue[i].id] == null) {

      jobs.queue[i].card = getJobHtmlItem(jobs.queue[i]);
      if(showing == "jobs") {
        document.getElementById("b-queue").appendChild(jobs.queue[i].card);
      }
      g_qjobs[jobs.queue[i].id] = jobs.queue[i];
    }
    jobs.queue[i].update = timestamp;
  }

  for(let i = 0; i < jobs.started.length; i++) {
    if(g_sjobs[jobs.started[i].id] == null) {

      jobs.started[i].card = getJobHtmlItem(jobs.started[i]);
      if(showing == "jobs") {
        document.getElementById("b-started").appendChild(jobs.started[i].card);
      }
      g_sjobs[jobs.started[i].id] = jobs.started[i];
    }
    jobs.started[i].update = timestamp;
  }

  for(const [key, value] of Object.entries(g_qjobs)) {
    if(value.update != timestamp) {
      delete g_qjobs[key];
    }
  }

  for(const [key, value] of Object.entries(g_sjobs)) {
    if(value.update != timestamp) {
      delete g_sjobs[key];
    }
  }
}


window.onload = async () => {
  setInterval(async () => {
    await loadJobsData();
  }, 100);

  setInterval(async () => {
    await loadSlavesData();
  }, 1000);

  document.getElementById("sla-btn").addEventListener("click", () => {
    showing = "slaves";
    let container = document.getElementById("data");
    container.innerHTML = "";
    for(const [s_key, s_value] of Object.entries(g_nodes)) {
      container.appendChild(s_value.card);
    }
  });
  
  document.getElementById("job-btn").addEventListener("click", () => {
    showing = "jobs";
    let container = document.getElementById("data");
    container.innerHTML = `
      <div id=b-queue></div>
      <div id=b-started></div>
    `;

    for(const [key, value] of Object.entries(g_qjobs)) {
      container.children[0].appendChild(value.card);
    }
    
    for(const [key, value] of Object.entries(g_sjobs)) {
      container.children[1].appendChild(value.card);
    }
  });

  loadSlavesData();
  loadJobsData();
}