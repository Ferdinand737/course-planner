const { OpenAI } = require("openai");
require('dotenv').config({path:'../.env'});

class OpenAIRequester {

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization:"org-XRu80OJxG7Dc5Pb73vTkTyRf"
        });
    }
    
    async sendRequestToOpenAI(setup, prompt)  {
        const completion = await this.openai.chat.completions.create({
            messages: [
                { role: "system", content: setup },
                { role: "user", content: prompt },
            ],
            model: "gpt-3.5-turbo-0125",
            temperature: 0.0,
            response_format: { type: "json_object" }
        });
        return completion.choices[0].message.content ?? "";
    }
    
    async manageRequest(setup, prompt, maxAttempts = 100) {
        let attempt = 0;
        let delay = 100000 + Math.random() * 100000; // Increased initial range
        const minBackoffFactor = 2.5; // Minimum backoff factor
        const maxBackoffFactor = 3.5; // Maximum backoff factor
        const maxDelay = 6000000; // Max delay in milliseconds
        
        while (attempt < maxAttempts) {
            try {
                const response = await this.sendRequestToOpenAI(setup, prompt);
                return response; // Success, return the response
            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed`);
                if (attempt >= maxAttempts - 1) throw new Error("Maximum attempts reached, giving up.");
                
                // Proportional jitter: 10% to 20% of the current delay
                const jitter = delay * (0.1 + Math.random() * 0.1);
                const randomizedDelay = delay + jitter;

                console.log("Current delay:", randomizedDelay);
                await this.wait(randomizedDelay);
                
                const backoffFactor = minBackoffFactor + (Math.random() * (maxBackoffFactor - minBackoffFactor));
                
                delay = Math.min(delay * backoffFactor, maxDelay);
                attempt++;
            }
        }
        return "";
    }
    

    wait(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    async getPreRequisiteJson(pre_req_str){
        const interfaceToString = `
        interface PrerequisiteNode {
            type: string;
            subtype: string;
            value: string;
            childNodes: PrerequisiteNode[];
        }`
        const nodeRules = ` 
        - The only allowed node types are "ROOT", "LEAF", "INNER".
        - Each node has an allowed "subtype" field that is based on its "type" field.
        - for "type" "ROOT" and "INNER", "subtype" can be "AND", "OR", "N_OF, N_CREDITS_OF", "GRADE".
        - for "type" "LEAF", "subtype" can be "COURSE", "YEAR", "PROGRAM", "PERMISSION", "CREDITS", "DEPARTMENT", "MAJOR".
        - The subtype is the operation on the child nodes. If the subtype is not a boolean operation like "GRADE", it should be applied to all its child nodes.
        - Do not include 'Reccomened' requirements in the JSON object.
        `

        const exampleInput1 = "All of APSC 169, APSC 177, APSC 179, APSC 254."
        const exampleOutput1 = `
        {
            "type": "ROOT",
            "subtype":"AND",
            "value":"",
            "childNodes": [
                {
                    "type": "LEAF",
                    "subtype":"COURSE",
                    "value": "APSC 169",
                    "childNodes": []
                },
                {
                    "type": "LEAF",
                    "subtype":"COURSE",
                    "value": "APSC 177",
                    "childNodes": []
                },
                {
                    "type": "LEAF",
                    "subtype":"COURSE",
                    "value": "APSC 179",
                    "childNodes": []
                },
                {
                    "type": "LEAF",
                    "subtype":"COURSE",
                    "value": "APSC 254",
                    "childNodes": []
                }
            ]
        }`
        
        const exampleInput2 = "BIOL 200 and one of BIOL 202, STAT 230 and one of PHYS 121, PHYS 122."
        const exampleOutput2 = `
        {
            "type":"ROOT",
            "subtype":"AND",
            "value":"",
            "childNodes":[
                {
                    "type":"LEAF",
                    "subtype":"COURSE",
                    "value":"BIOL 200",
                    "childNodes":[]
                },
                {
                    "type":"INNER",
                    "subtype":"N_OF",
                    "value":1,
                    "childNodes":[
                    {
                        "type":"LEAF",
                        "subtype":"COURSE",
                        "value":"BIOL 202",
                        "childNodes":[]
                    },
                    {
                        "type":"LEAF",
                        "subtype":"COURSE",
                        "value":"STAT 230",
                        "childNodes":[]
                    }
                    ]
                },
                {
                    "type":"INNER",
                    "subtype":"N_OF",
                    "value":1,
                    "childNodes":[
                    {
                        "type":"LEAF",
                        "subtype":"COURSE",
                        "value":"PHYS 121",
                        "childNodes":[]
                    },
                    {
                        "type":"LEAF",
                        "subtype":"COURSE",
                        "value":"PHYS 122",
                        "childNodes":[]
                    }
                    ]
                }
            ]
        }`
        const exampleInput3 = "APSC 176."
        const exampleOutput3 = `
        {
            "type": "LEAF",
            "subtype": "COURSE",
            "value": "APSC 176",
            "childNodes": []     
        }`

        const exampleInput4= "(Third-year standing in any B.Sc. program and permission of the department head.)"
        const exampleOutput4 = `
        {
            "type": "ROOT",
            "subtype": "AND",
            "value": "",
            "childNodes": [
                {
                    "type": "LEAF",
                    "subtype": "Year",
                    "value": "3",
                    "childNodes": []
                },
                {
                    "type": "LEAF",
                    "subtype": "PROGRAM",
                    "value": "B.Sc.",
                    "childNodes": []
                },
                {
                    "type": "LEAF",
                    "subtype": "PERMISSION",
                    "value": "department head",
                    "childNodes": []
                }
            ]
        }`

                                
        const exampleInput5 =`A score of 70% or higher in one of PREC 12, MATH 12, MATH 125, MATH 126.`
        const exampleOutput5 = `
        {
            "type": "ROOT",
            "subtype": "GRADE",
            "value": "70",
            "childNodes": [
                {
                    "type": "INNER",
                    "subtype": "N_OF",
                    "value":"1",
                    "childNodes": [
                        {
                            "type": "LEAF",
                            "subtype": "COURSE",
                            "value": "PREC 12",
                            "childNodes": []
                        },
                        {
                            "type": "LEAF",
                            "subtype": "COURSE",
                            "value": "MATH 12",
                            "childNodes": []
                        },
                        {
                            "type": "LEAF",
                            "subtype": "COURSE",
                            "value": "MATH 125",
                            "childNodes": []
                        },
                        {
                            "type": "LEAF",
                            "subtype": "COURSE",
                            "value": "MATH 126",
                            "childNodes": []
                        }
                    ]
                }
            
            ]
        }`

        const exampleInput6 = `(3 credits of first-year CULT and 3 credits of first-year ENGL.)`
        const exampleOutput6 = `
        {
            "type": "ROOT",
            "subtype": "AND",
            "value": "",
            "childNodes": [
                {
                    "type": "INNER",
                    "subtype": "N_CREDITS_OF",
                    "value":"3",
                    "childNodes": [
                        {
                            "type": "LEAF",
                            "subtype": "DEPARTMENT",
                            "value": "ENGL-1",
                            "childNodes": []
                        }
                    ]
                },
                {
                    "type": "INNER",
                    "subtype": "N_CREDITS_OF",
                    "value":"3",
                    "childNodes": [
                        {
                            "type": "LEAF",
                            "subtype": "DEPARTMENT",
                            "value": "CULT-1",
                            "childNodes": []
                        }
                    ]
                }
            
            ]
                    
        }`

        const setup = 
        `You are an expert data analytics tool. You convert a course pre-requisite string into a valid JSON object of a specific format.

        Format: ${interfaceToString}

        Rules: ${nodeRules}

        Example Input: ${exampleInput1}
        Example Output: ${exampleOutput1}

        Example Input2: ${exampleInput2}
        Example Output2: ${exampleOutput2}

        Example Input3: ${exampleInput3}
        Example Output3: ${exampleOutput3}

        Example Input4: ${exampleInput4}
        Example Output4: ${exampleOutput4}

        Example Input5: ${exampleInput5}
        Example Output5: ${exampleOutput5}

        Example Input6: ${exampleInput6}
        Example Output6: ${exampleOutput6}
        `

        const prompt = `
        The pre-requisite string is: 
        ${pre_req_str}.

        Please convert this string into a valid JSON object. Only output the JSON object. Do not include any other information in the output.
        `

        const output = await this.manageRequest(setup, prompt);

        try{
            return JSON.parse(output);
        }catch(e){
            return JSON.parse("{}");
        }
    }
}
module.exports = OpenAIRequester;