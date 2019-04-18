const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const cmd = require('node-cmd');
const os = require('os');
const Promise = require("bluebird");

function cmd_async(command) {
  return cmd_get_async(command);
}

function analyze_ping_result(result, os_type) {

  let data = {
    ip: undefined,
    records: [],

    time_avg: undefined,
    time_max: undefined,
    time_min: undefined,

    ttl_avg: undefined,
    ttl_max: undefined,
    ttl_min: undefined
  }

  if (os_type === "Windows_NT") {
    let infos = result.split("\r\n");

    let ip = /\[([^\]]+)\]/.exec(infos[1])[1];

    let records = []

    let time_avg = undefined;
    let time_max = undefined;
    let time_min = undefined;
    let time_sum = 0;

    let ttl_avg = undefined;
    let ttl_max = undefined;
    let ttl_min = undefined;
    let ttl_sum = 0;

    let times = infos.length - 8;
    for (let i = 0; i < times; ++i) {
      let tmp = /([\d.]+)\D+([\d.]+)$/.exec(infos[i + 2]);
      let time = parseFloat(tmp[1]);
      let ttl = parseInt(tmp[2]);

      data.records.push({
        time: time,
        ttl: ttl
      });

      time_min = time_max === undefined || time_min > time ? time : time_min;
      time_max = time_max === undefined || time_max < time ? time : time_max;
      ttl_min = ttl_min === undefined || ttl_min > ttl ? ttl : ttl_min;
      ttl_max = ttl_max === undefined || ttl_max < ttl ? ttl : ttl_max;

      time_sum += time;
      ttl_sum += ttl;
    }

    time_avg = time_sum / times;
    ttl_avg = ttl_sum / times;

    data.ip = ip;
    data.time_avg = time_avg;
    data.time_min = time_min;
    data.time_max = time_max;
    data.ttl_avg = ttl_avg;
    data.ttl_max = ttl_max;
    data.ttl_min = ttl_min;
  }

  return data;
}

const cmd_get_async = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });

const measurement_config = {
  config_json: "./config.json",
}

const opts = {
  chromeFlags: ['--no-sandbox']
};
const flags = {
  onlyCategories: ['performance']
};
const config = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForLoad: 100 * 1000,
    throttlingMethod: "provided",
    onlyAudits: [
      'first-meaningful-paint',
    ],
  },
}

function launchChromeAndRunLighthouse(url, opts, config = null) {
  return chromeLauncher.launch({ chromeFlags: opts.chromeFlags }).then(chrome => {
    opts.port = chrome.port;
    return lighthouse(url, opts, config).then(results => {
      // use results.lhr for the JS-consumeable output
      // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
      // use results.report for the HTML/JSON/CSV output as a string
      // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
      return chrome.kill().then(() => results.lhr)
    });
  });
}

// 文件追加
function append_to_file(file, content) {
  // appendFile，如果文件不存在，会自动创建新文件
  // 如果用writeFile，那么会删除旧文件，直接写新文件
  fs.appendFile(file, content, function (err) {
    if (err) {
      console.error("Error to append: ", file, content)
      console.error(err);
    }
  });
}

// const log = console.log;
const log = function (msg) {
  append_to_file(measurement_config.output_path, msg);
};

function init() {
  const config_json = fs.readFileSync(measurement_config.config_json);
  const config = JSON.parse(config_json);

  measurement_config.urls = config.urls;
  measurement_config.rewrite = config.rewrite || true;
  measurement_config.time = config.time || 1;
  measurement_config.output_path = config.output_path || "./data/result.json";

  if (measurement_config.rewrite) {
    fs.unlink(measurement_config.output_path, function (error) {
      if (error) {
        console.error(error);
      }
    });
  }
}

async function ping(host) {

  host = host.replace(/http:\/\//i, "").replace(/https:\/\//i, "");

  if (os.type() === "Windows_NT") {
    try {
      let result = await cmd_async("ping " + host);
      result = analyze_ping_result(result[0], os.type());
      return result.ip + "\t" + result.time_avg + "\t" + result.ttl_avg;
    } catch (err) {
      console.log(err);
      return "";
    }
    
  }

  return "";
}

async function doIt() {

  init();

  urls = measurement_config.urls;
  for (var idx in urls) {
    for (var t = 0; t < measurement_config.time; t++) {
      const item = urls[idx];

      let host = item.url.replace(/http:\/\//i, "").replace(/https:\/\//i, "");
      let result = await cmd_async("ping " + host);
      result = analyze_ping_result(result[0], os.type());
      log(result.ip + "\t" + result.time_avg + "\t" + result.ttl_avg + "\r\n");

      await launchChromeAndRunLighthouse(item.url, opts, config).then(results => {
        time = JSON.stringify(results['audits']['first-meaningful-paint']['rawValue']);
        msg = item.title + "\t" + item.url + "\t" + time + "\r\n";
        log(msg);
      });
    }
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection:', reason)
})

doIt();

let a = 100;
console.log(a);
