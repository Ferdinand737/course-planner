import { Course, Faculty, RequirementType } from "~/interfaces";
import { prisma } from "~/db.server";
import { Prisma } from "@prisma/client";

export class HelperCourse{
    year: number;
    code: string;
    name: string;
    description: string;
    credits: number;
    isHonours: boolean;
    durationTerms: number;
    winterTerm1: boolean;
    winterTerm2: boolean;
    summerTerm1: boolean;
    summerTerm2: boolean;
    faculty: Faculty;
    equ_str: string;
    co_req_str: string;
    pre_req_str: string;
    equ_arr: string[];
    co_req_arr: string[];
    pre_req_arr: string[];
    pre_req_json: JSON;


    constructor(row:any){
        // These lists need to be updated for accuracy
        // We need a third list called 'OTHER' for courses that are not in either of these lists
        // Some of the items in arts belong in 'OTHER'
        const science = [
            "APSC",
            "ASTR",
            "BIOC",
            "BIOL",
            "CHEM",
            "COSC",
            "DATA",
            "EESC",
            "ENGR",
            "GISC",
            "HES",
            "HINT",
            "MANF",
            "MATH",
            "PHYS",
            "PSYO",
            "STAT",
        ]

        const arts = [
            "ANTH",
            "ARTH",
            "CCS",
            "CHIN",
            "CORH",
            "CRWR",
            "CULT",
            "CUST",
            "DICE",
            "DIHU",
            "EADM",
            "EAP",
            "ECED",
            "ECON",
            "EDLL",
            "EDST",
            "EDUC",
            "ENGL",
            "EPSE",
            "ETEC",
            "FILM",
            "FREN",
            "GEOG",
            "GERM",
            "GWST",
            "HEAL",
            "HIST",
            "INDG",
            "INLG",
            "JPST",
            "KORN",
            "LATN",
            "LLED",
            "MDST",
            "MGMT",
            "NLEK",
            "NRSG",
            "NSYL",
            "PHIL",
            "POLI",
            "SECH",
            "SOCI",
            "SOCW",
            "SPAN",
            "STMC",
            "SUST",
            "THTR",
            "VISA",
            "WRLD",
        ]

        // The code below parses the contents of courses.csv
        this.year = Number(row["year"])
        this.code = row["course_code"]
        this.name = row["name"].replace(this.code, "").trim()
        this.description = row["description"]
        this.credits = Number(row["credits"])
        this.isHonours = row["is_honours"] === "True" ? true : false
        this.durationTerms = Number(row["duration_terms"])
        this.winterTerm1 = row["winter_term_1"].toLowerCase() === "true" ? true : false
        this.winterTerm2 = row["winter_term_2"].toLowerCase() === "true" ? true : false
        this.summerTerm1 = row["summer_term_1"].toLowerCase() === "true" ? true : false
        this.summerTerm2 = row["summer_term_2"].toLowerCase() === "true" ? true : false


        const foundFaculty = row["course_code"].split(" ")[0]

        this.faculty = science.includes(foundFaculty) ? Faculty.SCI : arts.includes(foundFaculty) ? Faculty.ART : Faculty.OTHER

        this.equ_str = row["equivalent_string"] ?? ""
        this.co_req_str = row["co-req_string"] ?? ""
        this.pre_req_str = row["pre-req_string"] ?? ""

        this.equ_arr = row["courses_in_equivalent_string"]?.split(",")
        this.co_req_arr = row["courses_in_co-req_string"]?.split(",")
        this.pre_req_arr = row["courses_in_pre-req_string"]?.split(",")

        try{
            this.pre_req_json = JSON.parse(row["pre_req_json"])
        }catch(e){
            this.pre_req_json = JSON.parse("{}")
        }
    }
}


export class HelperRequirement{
    constraintType: RequirementType
    credits: number
    year: number
    programSpecific: boolean
    alternativeString: string
    alternatives: Course[]
    electiveCourse: Course | null


    constructor(row:any){
        this.constraintType = RequirementType.AT_LEAST
        this.credits = Number(row["Credits"])
        this.year = Number(row["Year"])
        this.programSpecific = row["ProgramSpecific"] === "1" ? true : false

        this.alternativeString = row["Alternatives"]

        this.alternatives = []
        this.electiveCourse = null
    }

    // This function read the alternative string and populates the alternatives and electiveCourse fields
    async populateAlternatives() {
        // this.alternativeString is the 'Alternatives' column in the csv


        let alternativeCourses:Course[] = [];

    
        if (!this.alternativeString.includes("ELEC")) {// Indicates either a single course or a list of courses. eg: "PHYS111;PHYS112"

            const alternatives = this.alternativeString.split(";");
            for (const alternative of alternatives) {

                // Add a space to alternative course because that is how they are saved in the database
                const courseCodeWithSpace = alternative.replace(/([A-Za-z])(\d)/g, '$1 $2');

                // Find the course in the database based on the course code
                const course = await prisma.course.findUnique({
                    where: { code: courseCodeWithSpace }
                });

                if (course) {
                    // If the course is found, add it to the list of alternative courses
                    alternativeCourses.push(course);
                }
            }
            // alternativeCourses will be the list of courses in he 'Alternatives' column in the csv file seperated by ;
            this.alternatives = alternativeCourses;

            // Only happens when there is more than one option in the alternatives
            if (this.alternatives.length > 1){
                // This finds the special elective placeholder course
                this.electiveCourse = await prisma.course.findUnique({
                    where: { code: "CHOICE" }
                })
            }

        } else {
            // Finds the special placholder course that matches the elective type eg: 'ELEC_UL_COSC'
            this.electiveCourse = await prisma.course.findUnique({
                where: { code: this.alternativeString.trim() }
            })
            // this converts the string into an array of queries eg: ['UL', 'COSC']
            const queries = this.alternativeString.split("_").filter(q => q !== "" && q !== "ELEC").map(q => q.trim());

            // This gets all the courses in the database 
            let alternativeCourses = await prisma.course.findMany();
            for (const q of queries) {
                let queryResults:Course[] = [];

                // Run a query based on the query string
                if (q === "UL") {
                    queryResults = await this.findUpperLevelCourses();
                } else if (q === "SCI") {
                    queryResults = await this.findScienceCourses();
                } else if (q === "NONSCI") {
                    queryResults = await this.findArtsCourses();
                } else if (q.length === 4) {
                    queryResults = await this.findDiciplineCourses(q);
                } else if (q.length === 1 && /^\d$/.test(q)) {
                    queryResults = await this.findYearCourses(Number(q));
                } else {
                    console.log("Unknown query:" + q);
                }
                
                // Only add the courses to the alternatives that are in the query results
                alternativeCourses = alternativeCourses.filter(course => {
                    return queryResults.some(queryCourse => {
                        return queryCourse.code === course.code;
                    });
                });
            }
            this.alternatives = alternativeCourses;
        }
    }

    async findUpperLevelCourses(): Promise<Course[]> {
        const query = Prisma.sql`
        SELECT * FROM \`Course\`
        WHERE \`code\` REGEXP ' [3-5]'
        `;
        const courses = await prisma.$queryRaw<Course[]>(query);
        return courses;
    }
    
    async findYearCourses(year: number): Promise<Course[]> {
        const stryear = ' ' + String(year)
        const query = Prisma.sql`
            SELECT * FROM \`Course\`
            WHERE \`code\` REGEXP ${stryear}
        `;
        const courses = await prisma.$queryRaw<Course[]>(query);
        return courses;
    }

    async findScienceCourses(){
        return await prisma.course.findMany({
            where: { faculty: Faculty.SCI }
        });
    }

    async findArtsCourses(){
        return await prisma.course.findMany({
            where: { faculty: Faculty.ART }
        });
    }

    async findDiciplineCourses(discipline:string){
        return await prisma.course.findMany({
            where: { code: { startsWith: discipline } }
        });
    }
}