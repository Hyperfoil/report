# Hyperfoil reports
Generate html reports from the Hyperfoil output all.json file. The report is a self contained html file with embedded javascript, css, and run data. 
Reports can easily grow to several MB.
**NOTE** The reports do not embed the patternfly4 fonts. This results in several 404's when opening a report and is being discussed

```
TODO make the report.sh usable to import json
```

## Building
```
npm install
npm build
```
## Usage
There are 3 supported use cases
Shell script
build/report.sh accepts a json input and generates a standalone html document with the json and javascript embedded inside. 
The report can be opened in a browser without internet access or a local webserver.
`cat all.json | ./build/report.sh`

`./build/report.sh /tmp/all.json`

Hosted html with embedded javascript
The report.sh script creates a standalone html page with embedded json and javascript but the template html page can also load json
via the data query parameter. Copy the build/index.embedded.html as index.html into the webserver folder with any json files and open 
a browser to index.html?data=http://hostname/all.json

Hosted html with separate assets
Hosting `build/index.html` along with the `build/static` folder (and all contents) supports the same `?data` query parameter 



## Developing
The project is based on `create-react-app` and uses `npm` for package management. 
This means you need to download node and add it to the path
Run `npm install` from the base directory for first time setup. 
Use `npm start` to launch the react hot reload server which will open localhost:3000 in your browser.
The default index.html does not have embedded data. You can either add an all.json to the public folder and add `?data=http://localhost:3000/all.json`
to the url or embed json data by replacing [/**DATAKEY**/] with the json data.
