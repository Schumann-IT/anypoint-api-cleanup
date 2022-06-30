const path = require('path')
const fs = require('fs');
const fsPromises = fs.promises;
const cfg = require("../go-config.json")

const getVersion = function(file) {
    const e = /.+-(\d+\.\d+\.\d+).+/.exec(file)
    return e[1]
}

const getName = function(file) {
    const e = /(.+)-\d+\.\d+\.\d+.+/.exec(file)
    return e[1]
}

async function main() {
    const oasDir = path.join(__dirname, "..", "oas")

    const files = await fsPromises.readdir(oasDir)
    const oasFiles = files.filter(file => {
        return path.extname(file).toLowerCase() === ".json";
    });

    for (const file of oasFiles) {
        cfg["packageName"] = getName(file)
        cfg["packageVersion"] = getVersion(file)
        await fsPromises.writeFile(path.join(oasDir, `${cfg["packageName"]}-${cfg["packageVersion"]}-go-config.json`), JSON.stringify(cfg, null, 2))
    }
}

main()
