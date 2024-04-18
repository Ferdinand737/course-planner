import path from "path"; 
import fs from "fs";
import csv from "csv-parser";
import Papa from 'papaparse';
import { prisma } from "~/db.server";
import { HelperCourse, HelperRequirement } from "./adminHelper.server";
import OpenAIRequester from "./adminOpenAiManager.server";
import { Faculty, SpecializationType } from "~/interfaces";


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
            const isValid = await validateCSVColumns(filePath, ',',csvColNames);
            if (!isValid) {
                throw new Error('Invalid Columns in CSV file');
            }
            ingestPath = filePath

        } else if (fileType === '.tsv'){
            const isValid = await validateCSVColumns(filePath, '\t',tsvColNames);
            if (!isValid) {
              throw new Error('Invalid Columns in CSV file');
            }
            ingestPath = path.resolve(__dirname, `../public/uploaded-files/${fileNameWithoutExt}.csv`)
            processCsv(filePath, '\t')
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
        }
    

    let allCourses = await prisma.course.findMany();
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
        name: path.basename(filePath),
        filePath: ingestPath,
        ingested: false
      }
    })
    newCourses.push(...helperCoursesToProcess);
  }
    return newCourses
}

export async function ingest(paths: string[], apiKey: string){
    for (const filePath of paths){
       
        // get all courses from db

        // list of courses from csv

        // Use map instead of filter to keep the courses that meet the condition

        const openAIRequester = new OpenAIRequester(apiKey, helperCoursesToProcess.length);
        
        // Wrap the OpenAI request in a Promise to ensure it's await-able
        for (const helperCourse of helperCoursesToProcess) {
          if (helperCourse) {
            helperCourse.pre_req_json = await openAIRequester.getPreRequisiteJson(helperCourse.pre_req_str);

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


        helperCoursesToProcess.forEach(async (helperCourse: HelperCourse|null) => {
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


        await readSpecializationsCSVs();  

        
        await prisma.ingestedFile.create({
          data:{
            name: path.basename(filePath),
            filePath: ingestPath,
            ingested: fales
          }
        })
    }

}

function parseSpecializationFromFileName(fileName: string) {
  const parts = fileName.split('-');
  const discipline = parts[1];
  let rawType = parts[2].split('.')[0].toUpperCase();

  let specializationType: SpecializationType = SpecializationType.MAJOR;

  if (rawType === "MINOR"){
    specializationType = SpecializationType.MINOR;
  }

  if (rawType === "HONOURS"){
    specializationType = SpecializationType.HONOURS;
  }
  

  return { discipline, specializationType };
}

async function readSpecializationsCSVs() {

  const mappings = {
    "COSC": "Computer Science",
    "ANTH": "Anthropology",
    "BIOL": "Biology",
    "CHEM": "Chemistry",
    "DATA": "Data Science",
    "ECON": "Economics",
    "EESC": "Earth and Environmental Science",
    "GEOG": "Geography",
    "GISC": "Geographic Information Science",
    "MATH": "Mathematics",
    "PHYS": "Physics",
    "PSYO": "Psychology",
    "STAT": "Statistics",
  }

  const directoryPath = path.resolve(__dirname, "../data-aquisition/data/degrees");
  const fileNames = fs.readdirSync(directoryPath);

  for (const fileName of fileNames) {

    // Create a specialization for each file in ../data-aquisition/data/degrees
    const { discipline, specializationType } = parseSpecializationFromFileName(fileName);

    const hons = specializationType === SpecializationType.HONOURS ? " (Honours)" : "";

    const name = mappings[discipline as keyof typeof mappings] + hons

    let specialization = await prisma.specialization.findFirst({
      where: {
        name: {equals: name},
        specializationType: {equals: specializationType},
        discipline: {equals: discipline}
      }
    });

    if (!specialization){
      specialization = await prisma.specialization.create({
        data: {
          name: name,
          discipline,
          specializationType,
        },
      });
    }

    const rows:any = [];
    await new Promise<void>((resolve) => {
      fs.createReadStream(`${directoryPath}/${fileName}`)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          console.log(`Finished reading ${fileName}`);
          resolve();
        });
    });

    await prisma.requirement.deleteMany({where: {specializationId: specialization.id}});
  
    for (const row of rows) {
      // Each row in each degree file is a requirement for a specialization
      const helperRequirement = new HelperRequirement(row);
      await helperRequirement.populateAlternatives();

      await prisma.requirement.create({
        data: {
          constraintType: helperRequirement.constraintType,
          credits: helperRequirement.credits,
          year: helperRequirement.year,
          programSpecific: helperRequirement.programSpecific,
          electiveCourseId: helperRequirement.electiveCourse?.id,
          specializationId:specialization.id ,
          alternatives: {
            connect: helperRequirement.alternatives.map(course => ({ id: course.id })),
          },
        },
      });
    }
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

function readCsv(filePath: string, delimiter: string): Promise<Papa.ParseResult<any>> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true, // Set to true if the CSV file has a header row
        delimiter: delimiter, // Set the delimiter used in the file
        complete: resolve,
        error: reject,
      });
    });
}

async function processCsv(filePath: string, delimiter: string) {
    try {
        const parseResult = await readCsv(filePath, delimiter);

        const result = parseResult.data.reduce((acc, course) => {
            const key = `${course['Course Code']}|${course['Course Number']}`;
            const year = parseInt(course['Course Start Term'].replace(/\D/g, ''));
            
            if (!acc.has(key) || acc.get(key) < year) {
              acc.set(key, year);
            }
            
            return acc;
        }, new Map());

        let addedKeys = new Set();
        const rowsDropped = parseResult.data.filter(thisCourse => {
          const key = `${thisCourse['Course Code']}|${thisCourse['Course Number']}`;
          
          if (!addedKeys.has(key) && result.get(key) === parseInt(thisCourse['Course Start Term'].replace(/\D/g, ''))) {
            addedKeys.add(key);
            return true;
          }
          
          return false;
        });
          const finalData = rowsDropped.map(row => {
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
            const pre_req_json = '{}'

            
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
          });
          
        return finalData;
    } catch (error) {
      console.log(error)
    }
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
            console.log(`Missing expected columns: ${missingColumns.join(', ')}`);
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