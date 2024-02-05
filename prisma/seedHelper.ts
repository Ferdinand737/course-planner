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