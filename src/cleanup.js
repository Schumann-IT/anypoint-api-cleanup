const fs = require('fs')
const path = require('path')

const wap = require('webapi-parser')
const fsPromises = fs.promises

const getVersion = function(file) {
    const e = /.+-(\d+\.\d+\.\d+).+/.exec(file)
    return e[1]
}

const getName = function(file) {
    const e = /(.+)-\d+\.\d+\.\d+.+/.exec(file)
    return e[1]
}

const getServer = function (servers, version) {
    let url = new URL(servers[0].url)
    url.host = `eu1.${url.host}`
    let path = url.pathname.split("/")
    if (path.length > 0 && path[path.length -1] === "%7Bversion%7D") {
        path.pop()
        path.push(version)
    }
    url.pathname = path.join("/")

    return url.toString()
}

async function main() {
    const oasDir = path.join(__dirname, "..", "oas")
    const files = await fsPromises.readdir(oasDir)
    const oasFiles = files.filter(file => {
        return path.extname(file).toLowerCase() === ".json";
    });


    for (const file of oasFiles) {
        const model = await wap.WebApiParser.oas30.parse(`file://${oasDir}/${file}`)

        // create new api
        const api = new wap.model.domain.WebApi()
        api.withName(`${getName(file)} API`)
        api.withVersion(getVersion(file))
        api.withServer(getServer(model.encodes.servers, model.encodes.version))

        const targetEndPoints = []
        for (const ep of model.encodes.endPoints) {
            // consider endpoints only if they consist of operations
            if (ep.operations.length > 0) {
                // create new endpoint
                const targetEndPoint = new wap.model.domain.EndPoint()
                    .withPath(ep.path.toString())
                    .withDescription(ep.description.toString())

                if (ep.parameters.length > 0) {
                    targetEndPoint.withParameters(ep.parameters)
                }
                for (const p of targetEndPoint.parameters) {
                    if (p.binding.toString() === "path") {
                        p.withRequired(true)
                    }
                }
                const targetOperations = []
                for (const o of ep.operations) {
                    // create new operation
                    const targetOperation = new wap.model.domain.Operation()
                        .withMethod(o.method.toString())

                    //
                    // special case for /v2/oauth2/token
                    //
                    if (targetEndPoint.path.toString() === "/v2/oauth2/token" && targetOperation.method.toString() === "post") {
                        const pl = new wap.model.domain.Payload().withMediaType("application/json")
                            .withSchema(new wap.model.domain.AnyShape())
                        const targetRequest = new wap.model.domain.Request()
                            .withPayloads([pl])
                        targetOperation.withRequest(targetRequest)

                        const targetErrorResponse = new wap.model.domain.Response()
                            .withName("401")
                            .withStatusCode("401")
                            .withDescription("Access token is missing or invalid")
                        const targetSuccessResponse = new wap.model.domain.Response()
                            .withName("200")
                            .withStatusCode("200")
                            .withDescription("success")
                            .withPayloads([pl])

                        targetOperation.withResponses([targetSuccessResponse, targetErrorResponse])
                    } else {
                        // handle requests
                        if (o.requests.length > 0) {
                            for (const r of o.requests) {
                                // create new request
                                const targetRequest = wap.model.domain.Request()
                                    // copy query parameters
                                    .withQueryParameters(r.queryParameters)

                                // fix uri parameters: must set required = true
                                if (r.uriParameters.length > 0) {
                                    const targetUriParmeters = []
                                    for (const p of r.uriParameters) {
                                        p.withRequired(true)
                                        targetUriParmeters.push(p)
                                    }
                                    targetRequest.withUriParameters(targetUriParmeters)
                                }

                                // fix request body:
                                //   - add application/json payloads with empty schema (generates interface{} in go)
                                if (r.payloads.length > 0) {
                                    const targetPayloads = []
                                    for (const p of r.payloads) {
                                        switch (p.mediaType.toString()) {
                                            case "application/json":
                                                const pl = new wap.model.domain.Payload().withMediaType(p.mediaType.toString())
                                                pl.withSchema(new wap.model.domain.AnyShape())
                                                targetPayloads.push(pl)
                                                break;
                                            case "text/html":
                                            case "text/markdown":
                                                p.withScalarSchema().withDataType("http://www.w3.org/2001/XMLSchema#string")
                                                targetPayloads.push(p)
                                                break;
                                        }
                                    }
                                    if (targetPayloads.length > 0) {
                                        targetRequest.withPayloads(targetPayloads)
                                    }
                                }

                                targetOperation.withRequest(targetRequest)
                            }
                        }

                        // handle responses
                        // fix responses:
                        //   - add application/json payloads with empty schema (generates interface{} in go)
                        if (o.responses.length > 0) {
                            const targetResponses = []
                            for (const r of o.responses) {
                                const targetPayloads = []
                                for (const p of r.payloads) {
                                    switch (p.mediaType.toString()) {
                                        case "application/json":
                                            const pl = new wap.model.domain.Payload().withMediaType(p.mediaType.toString())
                                            pl.withSchema(new wap.model.domain.AnyShape())
                                            targetPayloads.push(pl)
                                            break;
                                        case "text/html":
                                        case "text/markdown":
                                            targetPayloads.push(p)
                                            break;
                                    }
                                }

                                let descr = r.description.toString()
                                if (descr === "") {
                                    descr = "missing"
                                }
                                const resp = new wap.model.domain.Response()
                                    .withName(r.name.toString())
                                    .withDescription(descr)
                                    .withStatusCode(r.statusCode.toString())

                                if (targetPayloads.length > 0) {
                                    resp.withPayloads(targetPayloads)
                                }
                                targetResponses.push(resp)

                            }

                            targetOperation.withResponses(targetResponses)
                        }
                    }

                    targetOperations.push(targetOperation)
                }

                targetEndPoint.withOperations(targetOperations)

                if (targetEndPoint.operations.length > 0) {
                    targetEndPoints.push(targetEndPoint)
                }
            }
        }
        api.withEndPoints(targetEndPoints)

        await wap.WebApiParser.oas30.generateFile(new wap.webapi.WebApiDocument().withEncodes(api), `file://${oasDir}/${file}`)
    }
}

main()
