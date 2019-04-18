
var cmd = require('node-cmd');
var os = require('os');
var log = console.log;
var Promise = require("bluebird");

const cmd_get_async = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });

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

async function ping(host) {

    host = host.replace(/http:\/\//i, "").replace(/https:\/\//i, "");

    if (os.type() === "Windows_NT") {
        let result = await cmd_async("ping " + host);
        log(analyze_ping_result(result[0], os.type()));
    }

    return "";
}

// ping();

ping("www.baidu.com");
