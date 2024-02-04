const Course = require('./Course')

const courseString = "2022W		CULT	272	CULTURAL STUDIES	Examines contributions of feminist theories and practice to understanding and addressing environmental change. Foregrounds the role of decolonial, anti-racist, disability justice and queer feminist perspectives in environmental justice, policy, art, and activism. Credit will be granted for only one of CULT 272 or GWST 272.	A score of 60% or higher in all of CULT 100, CULT 101.	FCCS	Faculty of Creative & Critical Stds	BFA-O	Bachelor of Fine Arts	MIN	FREN	\"\"	\"\"	Minor in French	Minor in French	3	REGU	01/09/2023	5:00 PM	04/13/2023	6:30 PM	MW"

const courseInfo = courseString.split("\t");    // Splitting the tsv course entry into an array.

//  Extracting course name, number and prereqs.
const facultyCode = courseInfo[2];        
const courseNum = courseInfo[3];       
const courseDesc = courseInfo[5]; 
let preRequisites = courseInfo[6].replace(/(?<=[A-Z]{3,4}) /g, ''); //removing the space between course name and number for all courses. 

//Working examples:

const examples = [

  "A score of 60% or higher in one of COSC111, COSC123.",
  "One of COSC111, COSC123, COSC210.Third-year standing.",
  "Either (a) third-year standing, or (b) a score of 60% or higher one of COSC111 or COSC122 or (c) MATH211.",
  "All of ECON204, ECON205 and either (a) MATH100, (b) MATH116 or (c) two of MATH101, MATH142.and third-year standing.", //[Only for demonstration]
  "Either (a) one of CPSC203, CPSC110, CPEN221 or (b) MATH210 and one of CPSC107, CPSC110.",
  "All of ECON101, ECON102.Or 3 credits of PHIL. Third-year standing.",
  "All of PSYO111, PSYO121.Or all of PSYC101, PSYC102. Or PSYC100.",
  "ECON328.or 3 credits of ECON and 3 credits of upper-level STAT.", //[EXCEPT "upper-level"]
  "Either (a) two of EESC101, EESC111, EESC121 or (b) all of GEOG108, GEOG109.or (c) successful completion of first-year Science." //[EXCEPT (c)]

];

const course = new Course(facultyCode, courseNum, courseDesc, preRequisites);
console.log(course.toString());

// examples.forEach((preRequisite) => {
//   const course = new Course(facultyCode, courseNum, courseDesc, preRequisite);
//   console.log(`Input: ${preRequisite} \nOutput: ${course.prereqs} \n----------------------------`);
// });







