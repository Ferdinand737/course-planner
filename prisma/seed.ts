import bcrypt from "bcryptjs";
import { prisma } from "~/db.server";
import { Faculty } from "~/interfaces";
import fs from "fs";
import path from "path"; 
import csv from "csv-parser";

/*
  The code in this file reads the CSV files in the /data folder and seeds the database with the data.
*/

async function readElectiveTypesCSV() {
  const csvPath = path.resolve(__dirname, "../data/electiveTypes.csv");
  // populate the database with special placeholder courses for electives
  fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", async (row) => {
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
  await prisma.ingestedFile.deleteMany({});


  const email = "user@email.com";
  const hashedPassword = await bcrypt.hash("password", 10);
  const user = await prisma.user.create({
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

}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
