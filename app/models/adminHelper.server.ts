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
    pre_req_json: JSON | null;


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
            this.pre_req_json = null
        }
    }
}

