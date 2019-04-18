
var cmd = require('node-cmd');
var os = require('os');
var log = console.log;
var Promise = require("bluebird");

const cmd_get_async = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });

function cmd_async(command) {
    return cmd_get_async(command);
}

function analyze_ping_result_on_windows(result) {

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

        data.ip = /\[([^\]]+)\]/.exec(infos[1])[1];

        let time_sum = 0;

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

            data.time_min = data.time_min === undefined || data.time_min > time ? time : data.time_min;
            data.time_max = data.time_max === undefined || data.time_max < time ? time : data.time_max;
            data.ttl_min = data.ttl_min === undefined || data.ttl_min > ttl ? ttl : data.ttl_min;
            data.ttl_max = data.ttl_max === undefined || data.ttl_max < ttl ? ttl : data.ttl_max;

            time_sum += time;
            ttl_sum += ttl;
        }

        data.time_avg = time_sum / times;
        data.ttl_avg = ttl_sum / times;
    }

    return data;
}

function analyze_ping_result_on_linux(result) {

    let data = {
        ip: undefined,
        records: [],

        transmit: 0,
        receive: 0,
        loss_rate: 0,

        time_avg: undefined,
        time_max: undefined,
        time_min: undefined,

        ttl_avg: undefined,
        ttl_max: undefined,
        ttl_min: undefined
    }

    log(result)

    let infos = result.split("\n");

    for (let i in infos) {
        log(i, infos[i])
    }

    data.ip = /\(([^\]]+)\)/.exec(infos[1])[1];

    // 记录统计信息开始行数
    let statistic_row = 0;
    for (let i in infos) {
        if (/--- \S+ ping statistics ---/i.exec(infos[i])) {
            statistic_row = parseInt(i);
            break
        }
    }

    // 获取丢包信息
    let tmp = /(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss/i.exec(infos[statistic_row + 1]);
    if (tmp) {
        data.transmit = parseInt(tmp[1]);
        data.receive = parseInt(tmp[2]);
        data.loss_rate = parseInt(tmp[3]);
    }

    // 获取 time 信息
    tmp = /rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/i.exec(infos[statistic_row + 2]);
    if (tmp) {
        data.time_min = parseFloat(tmp[1]);
        data.time_avg = parseFloat(tmp[2]);
        data.time_max = parseFloat(tmp[3]);
    }

    let ttl_sum = 0;
    let times = infos.length - 6;
    for (let i = 0; i < times; ++i) {
        let tmp = /([\d.]+)\D+([\d.]+)\D+$/.exec(infos[i + 1]);
        let ttl = parseInt(tmp[1]);
        let time = parseFloat(tmp[2]);

        data.records.push({
            time: time,
            ttl: ttl
        });

        data.ttl_min = data.ttl_min === undefined || data.ttl_min > ttl ? ttl : data.ttl_min;
        data.ttl_max = data.ttl_max === undefined || data.ttl_max < ttl ? ttl : data.ttl_max;

        ttl_sum += ttl;
    }
    data.ttl_avg = ttl_sum / times;

    return data;
}

async function ping(host) {

    host = host.replace(/http:\/\//i, "").replace(/https:\/\//i, "");

    if (os.type() === "Windows_NT") {
        let result = await cmd_async("ping " + host);
        log(analyze_ping_result_on_windows(result[0]));
    } else if (os.type() === "Linux") {
        let result = await cmd_async("ping -c 4 " + host);
        log(analyze_ping_result_on_linux(result[0]));
    }

    return "";
}

// ping();

ping("www.baidu.com");
