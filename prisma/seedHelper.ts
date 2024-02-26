import { Course, Faculty, Prisma, RequirementType } from "@prisma/client";
import { prisma } from "~/db.server";

export class HelperCourse{
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
        this.code = row["course_code"]
        this.name = row["name"]
        this.description = row["description"]
        this.credits = Number(row["credits"])
        this.isHonours = row["is_honours"] === "True" ? true : false
        this.durationTerms = Number(row["duration_terms"])
        this.winterTerm1 = row["winter_term_1"] === "True" ? true : false
        this.winterTerm2 = row["winter_term_2"] === "True" ? true : false
        this.summerTerm1 = row["summer_term_1"] === "True" ? true : false
        this.summerTerm2 = row["summer_term_2"] === "True" ? true : false

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
    electiveType: Course | null


    constructor(row:any){
        this.constraintType = RequirementType.AT_LEAST
        this.credits = Number(row["Credits"])
        this.year = Number(row["Year"])
        this.programSpecific = row["ProgramSpecific"] === "1" ? true : false

        this.alternativeString = row["Alternatives"]

        this.alternatives = []
        this.electiveType = null
    }

    async populateAlternatives() {
        let alternativeCourses:Course[] = [];
    
        if (!this.alternativeString.includes("ELEC")) {
            const alternatives = this.alternativeString.split(";");
            for (const alternative of alternatives) {
                const courseCodeWithSpace = alternative.replace(/([A-Za-z])(\d)/g, '$1 $2');
                const course = await prisma.course.findUnique({
                    where: { code: courseCodeWithSpace }
                });
                if (course) {
                    alternativeCourses.push(course);
                }
            }
            this.alternatives = alternativeCourses;
            this.electiveType = await prisma.course.findUnique({
                where: { code: "CHOICE" }
            })
        } else {
            this.electiveType = await prisma.course.findUnique({
                where: { code: this.alternativeString.trim() }
            })
            const queries = this.alternativeString.split("_").filter(q => q !== "" && q !== "ELEC").map(q => q.trim());
            let alternativeCourses = await prisma.course.findMany();
            for (const q of queries) {
                let queryResults:Course[] = [];
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
    
                alternativeCourses = alternativeCourses.filter(course => {
                    return queryResults.some(queryCourse => {
                        return queryCourse.code === course.code;
                    });
                });
            }
            this.alternatives = alternativeCourses;
        }
    }

    async findUpperLevelCourses():Promise<Course[]>{
        const query = Prisma.sql`
            SELECT * FROM "Course"
            WHERE "code" ~ '^[A-Z]{4}\\s[34]'
        `;
        const courses = await prisma.$queryRaw<Course[]>(query);
        return courses;
    }

    async findYearCourses(year:number):Promise<Course[]>{
        const query = Prisma.sql`
            SELECT * FROM "Course"
            WHERE "code" ~ '^[A-Z]{4}\\s${year}'
        `;
        const courses = await prisma.$queryRaw<Course[]>(query);
        return courses
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