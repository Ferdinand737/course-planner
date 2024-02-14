import { DegreeType, PrismaClient, SpecializationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import fs from "fs";
import path from "path"; 
import { HelperCourse, HelperRequirement } from './seedHelper';

const prisma = new PrismaClient();

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
  const directoryPath = path.resolve(__dirname, "../data-aquisition/data/degrees");
  const fileNames = fs.readdirSync(directoryPath);

  for (const fileName of fileNames) {
    const { discipline, specializationType } = parseSpecializationFromFileName(fileName);
    const specialization = await prisma.specialization.create({
      data: {
        discipline,
        specializationType,
      },
    });

    fs.createReadStream(`${directoryPath}/${fileName}`)
      .pipe(csv())
      .on('data', async (row) => {
        const helperRequirement = new HelperRequirement(row);
        await helperRequirement.populateAlternatives();

        await prisma.requirement.create({
          data: {
            constraintType: helperRequirement.constraintType,
            credits: helperRequirement.credits,
            year: helperRequirement.year,
            programSpecific: helperRequirement.programSpecific,
            alternatives: {
              connect: helperRequirement.alternatives.map(course => ({ id: course.id })),
            },
            specialization:{
              connect: {
                id: specialization.id
              }
            }
          },
        });
      })
      .on('end', () => {
        console.log(`Processed ${fileName}`);
      });
  }
}

async function seed() {

  await prisma.plannedCourse.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.password.deleteMany({});
  await prisma.coursePlan.deleteMany({});
  await prisma.requirement.deleteMany({});
  await prisma.specialization.deleteMany({});


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

  await readSpecializationsCSVs();

  const specialization = await prisma.specialization.findFirst({
    where: {
      discipline: "COSC",
      specializationType: SpecializationType.MAJOR,
    },
  })
  
  const degree = await prisma.degree.create({
    data: {
      degreeType: DegreeType.BSc,
      specializations: {
        connect: {
         id: specialization?.id,
        },
      },
    },
  });

  const sampleCourses = await prisma.course.findMany({
    where: {
        code: {
            contains: "COSC",
        },
    },
    take: 30,
  });

  const coursePlan = await prisma.coursePlan.create({
    data: {
      title: "Computer Science",
      user: {
        connect: {
          id: user.id,
        },
      },
      degree: {
        connect: {
          id: degree?.id,
        },
      },
    },
  });

  const plannedCourses = await Promise.all(sampleCourses.map((course, index) => {
    let term = 1


    if ( course.code.includes("C 1")){
      term = Math.floor(Math.random()*4)+1
    } else if ( course.code.includes("C 2")){
      term = Math.floor(Math.random()*4)+5
    } else if ( course.code.includes("C 3")){
      term = Math.floor(Math.random()*4)+9
    }else if ( course.code.includes("C 4")){
      term = Math.floor(Math.random()*4)+13
    }else if ( course.code.includes("C 5")){
      term = Math.floor(Math.random()*4)+13
    }

    return prisma.plannedCourse.create({
      data: {
        term,
        course: {
          connect: {
            id: course.id
          }
        },
        coursePlan: {
          connect: {
            id: coursePlan.id
          }
        }
      }
    });
  }));
  
  await prisma.coursePlan.update({
    where: { id: coursePlan.id },
    data: {
      numTerms: 16,
      plannedCourses: {
        connect: plannedCourses.map(plannedCourse => ({ id: plannedCourse.id })),
      },
    },
  });
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
