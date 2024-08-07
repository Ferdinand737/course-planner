import path from "path"; 
import fs from "fs";
import csv from "csv-parser";
import Papa from 'papaparse';
import { prisma } from "~/db.server";
import { HelperCourse } from "./adminHelper.server";
import OpenAIRequester from "./adminOpenAiManager.server";
import { Transform, finished, pipeline } from "stream";
import { promisify } from "util";

export async function getIngestedFiles(){
  const allCourses = await prisma.course.findMany();

  const currentIngestedFiles = await prisma.ingestedFile.findMany();

  for (const file of currentIngestedFiles){
    const filePath = file.filePath;
    const helperCourses = await readCoursesCSV(filePath);
    const helperCoursesToProcess = helperCourses.map((helperCourse: HelperCourse) => {
      const course = allCourses.find((c) => c.code === helperCourse.code);
      if (!course || helperCourse.year > course.year) {
        return helperCourse;
      } else {
        return undefined;
      }
    }).filter(Boolean);
    await prisma.ingestedFile.update({
      where: {id: file.id},
      data: {
        numNewCourses: helperCoursesToProcess.length
      }
    })
  }
  return await prisma.ingestedFile.findMany();
}

export async function uploadCourseCSV(paths: string[]){
    const csvColNames =   ['course_code', 'campus', 'year', 'name', 'description', 'credits', 'is_honours', 'restrictions', 'equivalent_string', 'co-req_string', 'pre-req_string', 'courses_in_equivalent_string', 'courses_in_co-req_string', 'courses_in_pre-req_string', 'winter_term_1', 'winter_term_2', 'summer_term_1', 'summer_term_2', 'duration_terms', 'pre_req_json']
    const tsvColNames =  ['Course Start Term', 'Course End Term', 'Course Code', 'Course Number', 'Course Name', 'Course Title', 'Course Description', 'Prerequisite', 'Corequisite', 'Course Faculty Code', 'Faculty Name', 'Degree Code', 'Degree Name', 'Spec Primary Progrm Type', 'Spec Primary Subject Area', 'Spec Secondary Program Type', 'Spec Secondary Subject Area', 'Spec Crendtial', 'Spec Transcript', 'Course Credit', 'Course Section Type', 'Course Start Date', 'Course Start Time', 'Course End Date', 'Course End Time', 'Couse Day Schedule']

    const newCourses: (HelperCourse|undefined)[] = []

    for (const filePath of paths){
        // figure out the type csv or tsv based on col names
        const fileType = path.extname(filePath).toLowerCase()
        const fileNameWithoutExt = path.basename(filePath).replace(fileType, '');

        let ingestPath = ''

        if (fileType === '.csv'){
            await validateCSVColumns(filePath, ',',csvColNames);

            ingestPath = filePath

        } else if (fileType === '.tsv'){
            await validateCSVColumns(filePath, '\t',tsvColNames);
        
            ingestPath = path.resolve(__dirname, `../public/uploaded-files/${fileNameWithoutExt}.csv`)
            await processCsv(filePath, '\t')
                .then(transformedData => {
                    writeCsv(transformedData, ingestPath);
                    console.log('CSV file was processed and saved successfully.');

                    // Delete the original TSV file
                    fs.unlink(filePath, (err) => {
                      if (err) {
                          console.error(`An error occurred while deleting the file: ${err}`);
                      } else {
                          console.log('Original TSV file was deleted successfully.');
                      }
                  });
                })
                .catch(error => {
                    throw new Error('An error occurred while processing the TSV file');
                });
        }else{
            throw new Error('Invalid file type. Files must be either .csv or .tsv');
        }
    

    const allCourses = await prisma.course.findMany();
    const helperCourses = await readCoursesCSV(ingestPath);
    const helperCoursesToProcess = helperCourses.map((helperCourse: HelperCourse) => {
        const course = allCourses.find((c) => c.code === helperCourse.code);
        if (!course || helperCourse.year > course.year) {
          return helperCourse;
        } else {
          return undefined; // or any falsy value
        }
    }).filter(Boolean); // remove the null values

    await prisma.ingestedFile.create({
      data:{
        name: path.basename(ingestPath),
        filePath: ingestPath,
        ingested: false,
        numNewCourses: helperCoursesToProcess.length
      }
    })
    newCourses.push(...helperCoursesToProcess);
  }
    return newCourses
}

export async function ingest(apiKey: string){
  
    const openAIRequester = new OpenAIRequester(apiKey);

    const filesToIngest = await prisma.ingestedFile.findMany({where: {ingested: false}});

    const allCourses = await prisma.course.findMany();
    
    for (const file of filesToIngest){
      const helperCourses = await readCoursesCSV(file.filePath);
      const helperCoursesToProcess = helperCourses.map((helperCourse: HelperCourse) => {
          const course = allCourses.find((c) => c.code === helperCourse.code);
          if (!course || helperCourse.year > course.year) {
            return helperCourse;
          } else {
            return undefined;
          }
      }).filter(Boolean);

      for (const helperCourse of helperCoursesToProcess) {
        if (helperCourse) {

          if (!helperCourse.pre_req_json){
            helperCourse.pre_req_json = await openAIRequester.getPreRequisiteJson(helperCourse.pre_req_str);
          }


          const course = allCourses.find(c => c.code === helperCourse.code);
          if (!course || helperCourse.year > course.year){
              if (!course){
                await prisma.course.create({
                    data: {
                      year: helperCourse.year,
                      code: helperCourse.code,
                      name: helperCourse.name,
                      description: helperCourse.description,
                      credits: helperCourse.credits,
                      isHonours: helperCourse.isHonours,
                      durationTerms: helperCourse.durationTerms,
                      winterTerm1: helperCourse.winterTerm1,
                      winterTerm2: helperCourse.winterTerm2,
                      summerTerm1: helperCourse.summerTerm1,
                      summerTerm2: helperCourse.summerTerm2,
                      faculty: helperCourse.faculty,
                      preRequisites: helperCourse.pre_req_json as any,//pre_req_json as any,
                      preRequisiteString: helperCourse.pre_req_str,
                    },
                });
              } else if (helperCourse.year > course.year){
                await prisma.course.update({
                  where: {id: course.id},
                  data: {
                    year: helperCourse.year,
                    code: helperCourse.code,
                    name: helperCourse.name,
                    description: helperCourse.description,
                    credits: helperCourse.credits,
                    isHonours: helperCourse.isHonours,
                    durationTerms: helperCourse.durationTerms,
                    winterTerm1: helperCourse.winterTerm1,
                    winterTerm2: helperCourse.winterTerm2,
                    summerTerm1: helperCourse.summerTerm1,
                    summerTerm2: helperCourse.summerTerm2,
                    faculty: helperCourse.faculty,
                    preRequisites: helperCourse.pre_req_json as any,
                    preRequisiteString: helperCourse.pre_req_str,
                  },
                });
              }
          }
        }
      }

      helperCoursesToProcess.forEach(async (helperCourse: HelperCourse|undefined) => {
        if(helperCourse){
          const course = await prisma.course.findFirst({where: {code: { equals: helperCourse.code }}});
          const equivalentCourses = await prisma.course.findMany({where: {code: {in: helperCourse.equ_arr}}});
          const coReqCourses = await prisma.course.findMany({where: {code: {in: helperCourse.co_req_arr}}});
          
          await prisma.course.update({
            where: { id: course?.id },
            data: {
              equivalentCourses: {
                connect: equivalentCourses.map(course => ({ id: course.id }))
              },
              coRequisiteCourses: {
                connect: coReqCourses.map(course => ({ id: course.id }))
              }
            }
          });
        }
      })

      await prisma.ingestedFile.update({
        where: {id: file.id},
        data: {
          ingested: true
        }
      })
    }
}



async function readCoursesCSV(csvPath: string): Promise<HelperCourse[]> {
  return new Promise((resolve, reject) => {
    let operations: any[] = []
    let helperCourses: HelperCourse[] = []
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const operation = async () => {
          const helperCourse = new HelperCourse(row);
          helperCourses.push(helperCourse)
        }
        operations.push(operation())
      })
      .on("end", async () => {
        Promise.all(operations).then(() => {
          resolve(helperCourses);
        }).catch(reject);

      })
      .on("error", reject);
  });
}

function processRow(row: any) {
  const course_code = row['Course Code'] + " " + row['Course Number'];
  const campus = "UBCO";
  const year = parseInt(row['Course Start Term'].replace(/\D/g, ''));
  const name =  row['Course Title'];
  const description = row['Course Description'];
  const creditsList = row['Course Credit'].split(',');
  const credits =  creditsList.length == 1 ? parseInt(creditsList[0]) : 3;
  const is_honours = row['Course Title'].includes('Honours');
  const restrictions = ''
  const equivalent_string = ''
  const co_req_string = row['Corequisite'];
  const pre_req_string = row['Prerequisite'];
  const courses_in_equivalent_string:string[] = []
  const courses_in_co_req_array = co_req_string.match(/[A-Z]{4} \d{3}/g) || [];
  const courses_in_pre_req_array = pre_req_string.match(/[A-Z]{4} \d{3}/g) || [];
  const courses_in_co_req_string = courses_in_co_req_array.join(',');
  const courses_in_pre_req_string = courses_in_pre_req_array.join(',');
  const winter_term_1 = true
  const winter_term_2 = true
  const summer_term_1 = true
  const summer_term_2 = true
  const duration_terms = 1
  const pre_req_json = ''

  
  return {
    course_code,
    campus,
    year,
    name,
    description,
    credits,
    is_honours,
    restrictions,
    equivalent_string,
    co_req_string,
    pre_req_string,
    courses_in_equivalent_string,
    courses_in_co_req_string,
    courses_in_pre_req_string,
    winter_term_1,
    winter_term_2,
    summer_term_1,
    summer_term_2,
    duration_terms,
    pre_req_json
  };
}

const pipelineAsync = promisify(pipeline);

async function processCsv(filePath: string, delimiter: string) {
  let latestCourseInstances = new Map();
  const addedKeys = new Set();
  const finalRows: any[] = [];

  const findLatestYearStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const key = `${chunk['Course Code']}|${chunk['Course Number']}`;
      const year = parseInt(chunk['Course Start Term'].replace(/\D/g, ''), 10);

      if (!latestCourseInstances.has(key) || latestCourseInstances.get(key) < year) {
        latestCourseInstances.set(key, year);
      }
      callback();
    },
  });

  // First pass
  await pipelineAsync(
    fs.createReadStream(filePath),
    csv({ separator: delimiter }),
    findLatestYearStream
  );

  // Reinitialize read stream for the second pass
  const readStream2 = fs.createReadStream(filePath);
  const csvStream = csv({ separator: delimiter });

  // Second pass
  await pipelineAsync(
    readStream2,
    csvStream,
    new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const key = `${chunk['Course Code']}|${chunk['Course Number']}`;
        const year = parseInt(chunk['Course Start Term'].replace(/\D/g, ''), 10);
        
        if (latestCourseInstances.get(key) === year && !addedKeys.has(key)) {
          finalRows.push(processRow(chunk)); 
          addedKeys.add(key);
        }
        
        callback();
      },
    })
  );

  return finalRows;
}
  


async function writeCsv(data: object[], outputFilePath: string) {
    const d3 = await import('d3-dsv');
    const csvString = d3.csvFormat(data);
    fs.writeFileSync(outputFilePath, csvString);
}


function validateCSVColumns(filePath: string, separator: string, expectedColumnNames: string[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let columnNames: string[] = [];
      const stream = fs.createReadStream(filePath)
        .pipe(csv({ separator }))
        .on('headers', (headers) => {
          columnNames = headers;
          // Since only headers are needed, destroy the stream
          stream.destroy();
        })
        .on('close', () => { 
          // Check if any expected columns are missing
          const missingColumns = expectedColumnNames.filter(colName => !columnNames.includes(colName));
          if (missingColumns.length > 0) {
            reject(new Error(`Missing expected columns: ${missingColumns.join(', ')}`));
          } else {
            console.log('CSV/TSV is valid');
            resolve(true);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }