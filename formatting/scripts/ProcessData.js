const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const Course = require('./Course')


const tsvPath = path.resolve(__dirname, '../DATA/raw/20230516 - data extract.tsv');

let courses = [];
fs.createReadStream(tsvPath).pipe(csv({
    separator: '\t'
  })).on('data', (row) => {


    const preReq = row['Prerequisite'] && row['Prerequisite'].replace(/(?<=[A-Z]{3,4}) /g, '');
    const courseCode = row['Course Code']
    const courseNumber = row['Course Number']
    const description = row['Course Description']

    const course = new Course(courseCode, courseNumber, description, preReq);
    courses.push(course);
}).on('end', () => {
    courses.forEach((course) => {
        course.addToTSV(path.resolve(__dirname, '../DATA/processed/courses.csv'));
    });
});
