dependencies:
	npm install
	curl --silent -o openapi-generator-cli.jar https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/5.0.0/openapi-generator-cli-5.0.0.jar

convert:
	npm run unzip
	npm run authorization
	npm run apimanager
	npm run exchange
	npm run cleanup
	npm run config

generate:
	mkdir -p gen/{apimanager,authorization,exchange}
	java -jar openapi-generator-cli.jar generate -g go -i oas/apimanager-1.0.15.json -o gen/apimanager -c oas/apimanager-1.0.15-go-config.json
	java -jar openapi-generator-cli.jar generate -g go -i oas/authorization-1.0.23.json -o gen/authorization -c oas/authorization-1.0.23-go-config.json
	java -jar openapi-generator-cli.jar generate -g go -i oas/exchange-2.1.2.json -o gen/exchange -c oas/exchange-2.1.2-go-config.json
