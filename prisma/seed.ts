import { Course, DegreeType, PlannedCourse, PrismaClient, SpecializationType } from "@prisma/client";
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
          alternatives: {
            connect: helperRequirement.alternatives.map(course => ({ id: course.id })),
          },
          specialization: {
            connect: { id: specialization.id },
          },
        },
      });
    }
  }
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

  // const specialization = await prisma.specialization.findFirst({
  //   where: {
  //     discipline: "COSC",
  //     specializationType: SpecializationType.MAJOR,
  //   },
  //   include:{
  //     requirements: {
  //       include: {
  //         alternatives: true
  //       }
  //     }
  //   }
  // })
  
  // const degree = await prisma.degree.create({
  //   data: {
  //     degreeType: DegreeType.BSc,
  //     specializations: {
  //       connect: {
  //        id: specialization?.id,
  //       },
  //     },
  //   },
  // });


  // const coursePlan = await prisma.coursePlan.create({
  //   data: {
  //     title: "Computer Science",
  //     numTerms: 16,
  //     user: {
  //       connect: {
  //         id: user.id,
  //       },
  //     },
  //     degree: {
  //       connect: {
  //         id: degree?.id,
  //       },
  //     },
  //   },
  // });


  // for (const requirement of specialization?.requirements ?? []) {
  //   if (requirement.alternatives.length > 0) {
  //     const numCourses = requirement.credits / 3;
  //     const randomAlternatives = [...requirement.alternatives].sort(() => 0.5 - Math.random()).slice(0, numCourses) as Course[];
  //     await Promise.all(randomAlternatives.map((course) => {
  //       const baseTermNumber = (requirement.year - 1) * 4;
  //       let term;
        
  //       if (course.winterTerm1) {
  //         term = baseTermNumber + 1;
  //       } else if (course.winterTerm2) {
  //         term = baseTermNumber + 2;
  //       } else if (course.summerTerm1) {
  //         term = baseTermNumber + 3;
  //       } else if (course.summerTerm2) {
  //         term = baseTermNumber + 4;
  //       } else {
  //         term = baseTermNumber + 1;
  //       }

  //       return prisma.plannedCourse.create({
  //         data: {
  //           term,
  //           course: {
  //             connect: {
  //               id: course.id
  //             }
  //           },
  //           coursePlan: {
  //             connect: {
  //               id: coursePlan.id
  //             }
  //           }
  //         }
  //       });
  //     }))
  //   }
  // }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
