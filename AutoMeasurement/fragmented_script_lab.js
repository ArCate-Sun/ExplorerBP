const fs = require('fs');

const log = console.log;
const err = console.error;

/**
 * 为 config.json 中网站信息增加下标
 * @param {*} src config.json 原文件路径
 * @param {*} dest config.json 目标文件路径
 */
function add_index_to_config(src, dest) {

    let config_str;
    try {
        config_str = fs.readFileSync(src);
    } catch (error) {
        err("打开文件", src, "失败！")
        err(error);
        return;
    }

    let config = JSON.parse(config_str);
    
    let websites = config.urls;

    for (let i = 0; i < websites.length; i++) {
        websites[i].id = i;
    }

    config = {
        output_path: config.output_path,
        rewrite: config.rewrite,
        time: config.time,
        websites: websites
    }
    config_str = JSON.stringify(config);
    
    try {
        fs.writeFileSync(dest, config_str);
    } catch (error) {
        err("写入文件", dest, "失败!")
        err(error);
        return;
    }

    log("add_index_to_config 操作成功！")
}

function main() {
    add_index_to_config("config.json", "new_config.json");
}

main();