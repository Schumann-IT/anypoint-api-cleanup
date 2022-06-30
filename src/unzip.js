var AdmZip = require("adm-zip");

const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

async function main() {
    const files = await fsPromises.readdir(path.join(__dirname, ".."))
    const zipFiles = files.filter(file => {
        return path.extname(file).toLowerCase() === ".zip";
    });
    zipFiles.forEach(function(v) {
        const zip = new AdmZip(v);
        const dir = /(.+)-raml/.exec(v)
        zip.extractAllTo(path.join(__dirname, "..", "raml", dir[1]),true);
    })
}

main()
