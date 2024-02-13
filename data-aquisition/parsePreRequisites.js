const path = require('path');
const OpenAIRequester = require('./OpenAIRequester');
const fs = require('fs');
const csvParser = require('csv-parser');
const { promisify } = require('util');
const { pipeline } = require('stream');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const pipelineAsync = promisify(pipeline);

async function addPreReqs() {
    const requester = new OpenAIRequester();
    const csvPath = path.resolve(__dirname, "data/courses.csv");

    let newRows = [];

    await pipelineAsync(
        fs.createReadStream(csvPath),
        csvParser(),
        async (source) => {
            const promises = [];
            for await (const row of source) {
                const promise = requester.getPreRequisiteJson(row["pre-req_string"]).then(preReqJson => {
                    row["pre_req_json"] = JSON.stringify(preReqJson);
                    return row;
                });
                
                promises.push(promise);
            }
            newRows = await Promise.all(promises);
        }
    );

    const csvWriter = createCsvWriter({
        path: csvPath,
        header: Object.keys(newRows[0]).map(key => ({ id: key, title: key })),
    });

    await csvWriter.writeRecords(newRows);
    console.log("Updated courses CSV written to", csvPath);
}

addPreReqs();
