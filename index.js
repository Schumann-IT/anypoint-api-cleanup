const fs = require('fs')
const path = require('path')
const wap = require('webapi-parser').WebApiParser

const getRamlParser = function (v) {
    switch (v) {
        case "0.8":
            return wap.raml08
        case "1.0":
            return wap.raml10
        default:
            console.error(`error: RAML parser version ${v} not found`)
            process.exit(1)
    }
}

const getOasFile = function(file, version) {
    if (path.isAbsolute(file)) {
        return file
    }

    const oasDir = path.join(__dirname, "oas")
    if (!fs.existsSync(oasDir)) {
        fs.mkdirSync(oasDir)
    }

    return path.join(oasDir, `${file}-${version}.json`)
}

const getRamlFile = function(file) {
    if (path.isAbsolute(file)) {
        return file
    }

    return path.join(__dirname, file)
}

const getVersion = function(file) {
    const e = /.+-(\d+\.\d+\.\d+)-raml/.exec(file)
    return e[1]
}

async function main() {
    const args = process.argv.slice(2)

    const parser = getRamlParser(args[0])

    const ramlFile = getRamlFile(args[1])
    const model = await parser.parse(`file://${ramlFile}`)

    const oasFile = getOasFile(args[2], getVersion(ramlFile))
    await wap.oas30.generateFile(model, `file://${oasFile}`)
}

main()
