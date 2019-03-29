const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

const measurement_config = {
  config_json: "./config.json",
}

const opts = {
  // chromeFlags: ['--show-paint-rects']
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
    fs.unlink(measurement_config.output_path,function(error){
      if(error){
          console.error(error);
      }
    });
  }
}

async function doIt() {

  init();

  urls = measurement_config.urls;
  for (var idx in urls) {
    for (var t = 0; t < measurement_config.time; t++) {
      const item = urls[idx];
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