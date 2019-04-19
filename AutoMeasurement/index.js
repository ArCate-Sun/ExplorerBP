'use strict';

const Lighthouse = require("./utils/lighthouse");
const Logger = require("./utils/logger");
const Ping = require("./utils/ping");
const fs = require("fs");

const lighthouseOptions = {
	chromeFlags: ['--no-sandbox'],
	onlyCategories: ['performance']
};

const lighthouseConfig = {
	extends: 'lighthouse:default',
	settings: {
		maxWaitForLoad: 10 * 1000,
		throttlingMethod: "provided",
		onlyAudits: [
			'first-meaningful-paint',
		],
	}
};

const task = {
	rewrite: false,
	times: 0,
	websites: [],
	out: "./result.json"
}

/**
 * 加载 task 配置文件
 * @param {string} filePath 
 */
function loadTask(filePath) {

	const jTask = fs.readFileSync(filePath);
	const tmpTask = JSON.parse(jTask);
	if (tmpTask.rewrite) {
		task.rewrite = tmpTask.rewrite;
	}
	if (tmpTask.times) {
		task.times = tmpTask.times;
	}
	if (tmpTask.websites && tmpTask.websites.length > 0) {
		task.websites = tmpTask.websites;
	}
	if (tmpTask.out) {
		task.out = tmpTask.out;
	}
}

async function main(from) {

	loadTask("./config.json");

	let logger = undefined;
	if (task.rewrite) {
		logger = new Logger(task.out, Logger.REWRITE_MODE);
	} else {
		logger = new Logger(task.out, Logger.APPEND_MODE);
	}

	let lh = new Lighthouse(lighthouseOptions, lighthouseConfig);
	let ping = new Ping();

	try {
		await lh.launchChrome();
	} catch (error) {
		console.error("打开 Chrome 失败.");
		return;
	}

	let start = from === undefined;
	for (let i = 0; i < task.websites.length; ++i) {

		let item = task.websites[i];

		if (!start && from !== item.id && from !== item.url) {
			continue;
		}

		start = true;

		for (var t = 0; t < task.times; ++t) {

			// get host
			let host = item.url.replace(/http:\/\//i, "").replace(/https:\/\//i, "");
			host.substr(0, host.indexOf('/'));

			try {
				// ping
				let pr = await ping.ping(host);

				// lighthouse
				let lhr = await lh.runLighthouse(item.url);
				let firstMeaningfulPaintTime = lhr['audits']['first-meaningful-paint']['rawValue'];

				// log
				let msg = `${item.id}\t${host}\t${firstMeaningfulPaintTime}\t${pr.ip}\t${pr.time_avg}\t${pr.ttl_avg}`;
				console.log(msg);
				logger.log(msg);
			} catch (error) {
				console.error(error);
			}
		}
	}

	try {
		lh.closeChrome();
	} catch (error) {
		return;
	}
}

main();
