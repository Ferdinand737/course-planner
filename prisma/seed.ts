import bcrypt from "bcryptjs";
import { prisma } from "~/db.server";
import { Faculty, RequirementType, SpecializationType } from "~/interfaces";
import fs from "fs";
import path from "path"; 
import csv from "csv-parser";

/*
  The code in this file reads the CSV files in the /data folder and seeds the database with the data.
*/

export class HelperRequirement{
  constraintType: RequirementType
  credits: number
  year: number
  programSpecific: boolean
  alternativeQuery: string

  constructor(row:any){
      this.constraintType = RequirementType.AT_LEAST
      this.credits = Number(row["Credits"])
      this.year = Number(row["Year"])
      this.programSpecific = row["ProgramSpecific"] === "1" ? true : false
      this.alternativeQuery = row["Alternatives"]
  }
}


async function readElectiveTypesCSV() {
  const csvPath = path.resolve(__dirname, "../data/electiveTypes.csv");
  // populate the database with special placeholder courses for electives
  fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", async (row) => {
        const course = await prisma.course.findUnique({
          where: {code: row.Code}
        })
        if (!course){
          await prisma.course.create({
            data:{
              year: 0,
              code: row.Code,
              name: row.Name,
              description: row.Description,
              credits: Number(row.Credits),
              isHonours: false,
              durationTerms: 1,
              winterTerm1: true,
              winterTerm2: true,
              summerTerm1: true,
              summerTerm2: true,
              faculty: Faculty.OTHER,
              preRequisites: "{}",
              isElectivePlaceholder: true,
            }
          })
        }else{
          await prisma.course.update({
            where: {code: course.code},
            data:{
              name: row.Name,
              description: row.Description,
              credits: Number(row.Credits),
              isHonours: false,
              durationTerms: 1,
              winterTerm1: true,
              winterTerm2: true,
              summerTerm1: true,
              summerTerm2: true,
              faculty: Faculty.OTHER,
              preRequisites: "{}",
              isElectivePlaceholder: true,
            }
          })
        }
      })
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

  const directoryPath = path.resolve(__dirname, "../data/degrees");
  const fileNames = fs.readdirSync(directoryPath);

  for (const fileName of fileNames) {

    // Create a specialization for each file in ../data/degrees
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

      await prisma.requirement.create({
        data: {
          constraintType: helperRequirement.constraintType,
          credits: helperRequirement.credits,
          year: helperRequirement.year,
          programSpecific: helperRequirement.programSpecific,
          specializationId:specialization.id ,
          alternativeQuery: helperRequirement.alternativeQuery,
        },
      });
    }
  }
}

async function seed() {

  await prisma.plannedCourse.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.password.deleteMany({});
  await prisma.coursePlan.deleteMany({});
  await prisma.degree.deleteMany({});
  await prisma.ingestedFile.deleteMany({});
  await prisma.specialization.deleteMany({});
  await prisma.requirement.deleteMany({});


  const email = "user@email.com";
  const hashedPassword = await bcrypt.hash("password", 10);
  await prisma.user.create({
    data: {
      email,
      isAdmin: true,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  await readElectiveTypesCSV();
  await readSpecializationsCSVs();
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
