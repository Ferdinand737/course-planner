import { SpecializationType } from "~/interfaces";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import fs from "fs";
import path from "path"; 
import { HelperCourse, HelperRequirement } from './seedHelper';
import { prisma } from "~/db.server";


async function readCoursesCSV(): Promise<HelperCourse[]> {
  const csvPath = path.resolve(__dirname, "../data-aquisition/data/courses.csv");
  return new Promise((resolve, reject) => {
    let operations: any[] = []
    let helperCourses: HelperCourse[] = []
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const operation = async () => {
          const helperCourse = new HelperCourse(row);
          helperCourses.push(helperCourse)

          await prisma.course.create({
            data: {
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
        operations.push(operation())
      })
      .on("end", () => {
        Promise.all(operations).then(() => {
          resolve(helperCourses);
        }).catch(reject);
      })
      .on("error", reject);
  });
}

function parseSpecializationFromFileName(fileName: string) {
  const parts = fileName.split('-');
  const discipline = parts[1];
  let rawType = parts[2].split('.')[0].toUpperCase();
  
  let specializationType: SpecializationType = rawType === "MAJOR" ? SpecializationType.MAJOR : SpecializationType.MINOR;

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

    const { discipline, specializationType } = parseSpecializationFromFileName(fileName);
    const specialization = await prisma.specialization.create({
      data: {
        name: mappings[discipline as keyof typeof mappings],
        discipline,
        specializationType,
      },
    });

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
  
    for (const row of rows) {
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

async function readElectiveTypesCSV() {
  const csvPath = path.resolve(__dirname, "../data-aquisition/data/electiveTypes.csv");

  fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", async (row) => {
        await prisma.course.create({
          data:{
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
            faculty: "OTHER",
            preRequisites: "{}",
            isElectivePlaceholder: true,
          }
        })
      })
}

async function seedCourses() {
  let helperCourses = await readCoursesCSV()

  helperCourses.forEach(async (helperCourse: HelperCourse) => {
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
  })

  await readElectiveTypesCSV();
  
}

async function seed() {

  await prisma.plannedCourse.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.password.deleteMany({});
  await prisma.coursePlan.deleteMany({});
  await prisma.requirement.deleteMany({});
  await prisma.specialization.deleteMany({});
  await prisma.degree.deleteMany({});


  const email = "user@email.com";
  const hashedPassword = await bcrypt.hash("password", 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  await seedCourses();

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
