const fs = require('fs');
const formatter = require('./Formatter');
const e = require('express');

class Course {
  constructor(facultyCode, courseNumber, desc, prereqs) {
    this.facultyCode = facultyCode;
    this.courseNumber = courseNumber;
    this.desc = desc;
    this.rawPrereqs = prereqs;
    this.prereqs = prereqs ? formatter.format(prereqs) : "None";
    this.rawExclusions = desc ? formatter.checkExclusions(desc): null;
    this.exclusions = this.rawExclusions ? formatter.formatExclusions(this.rawExclusions, this.facultyCode, this.courseNumber): "None";
  }

  toString() {
    return `Course: ${this.facultyCode}${this.courseNumber}\nDescription: ${this.desc}\nPrerequisites: ${this.prereqs}\nRaw Prereqs: ${this.rawPrereqs}\nExclusions: ${this.exclusions}\nRaw Exclusions: ${this.rawExclusions}`;   //\tExclusions: ${this.exclusions.join(', ')
  }

  addToTSV(filename) {
    const csvRow = [this.facultyCode, this.courseNumber, this.desc, this.prereqs, this.raw_Prereqs].join(','); 
    fs.appendFile(filename, csvRow + '\n', (err) => {
      if (err) {
        console.error('Error writing to CSV file:', err);
      } 
    });
  }
}

module.exports = Course;