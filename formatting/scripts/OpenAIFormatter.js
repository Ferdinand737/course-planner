const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();

const configuration = new Configuration({
  	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Function to convert prerequisites in natural language to a standard format using GPT-4
async function formatPrerequisites(query) {
    
  	// Prompt containing formatting rules for prerequisites
	const prompt = `You are an expert data scientist. You are responsible for converting course prerequisites from natural language into a standard format that follows certain rules. Prerequisites can include courses, year-standing requirements, grade requirements, etc. A year standing requirement should be formatted to “YS-“ followed by the year, for instance a fourth-year standing requirement would be “YS-4” additionally this can also include natural language, Example: successful completion of 3rd year would be equivalent to a fourth year standing. Grade requirements for courses should be appended to the course. For example a grade requirement of 60% or above in COSC123 will be represented as COSC123-60.
	The rules for how prerequisites may be related are as follows:
	1)    One of: if prerequisites are defined in a "one of" relationship then the formatted string should be a list of the prerequisites separated by a comma, enclosed in parentheses and outside the parentheses, there should be a “1*”. For example: “one of COSC123 or COSC121” would be formatted as “1*[COSC123,COSC121]”.
	2)    Two of: if prerequisites are defined in a "two of" relationship then the formatted string should be a list of the prerequisites separated by a comma, enclosed in parentheses and outside the parentheses, there should be a “2*”. For example: “two of COSC123, COSC121 or COSC222” would be formatted as "2*[COSC123,COSC121,COSC222]”.
	3)    And relationships: if the prerequisites have an “and” relationship such as “all of” or “and” then they should be separated by “&”. For example: “A score of 60% or higher in all of COSC121, COSC111” would be formatted as COSC121-60&COSC111-60. Another example could be “one of COSC121 or COSC111. Third-year standing” would be formatted as “1*[COSC121,COSC111]&YS-3”. 
	4)    Or relationships: any prerequisites written in an “either” statement or separated by an “or” otherwise should also be formatted like a “one of” relationship. For example: “Either (a) third-year standing, or (b) a score of 60% or higher one of COSC111 or COSC122 or (c) MATH211.” will be formatted to “1*[YS-3,1*[COSC111-60,COSC122-60],MATH211]”. YOUR RESPONSE SHOULD ALWAYS BE IN JSON FORMAT WITH THE FOLLOWING ATTRIBUTE "formatted_prerequisite": the formatted prerequisite created by following the rules mentioned above. The prerequisite to be formatted is: `;

  	try {
		const response = await openai.createCompletion({
			model: 'gpt-3.5-turbo',
			messages: [
				{"role": "system", "content": prompt},
				{"role": "user", "content": query},
			],
			temperature: 0.0,
			max_tokens: 3000
		});
		return response.data.choices[0].text;

  } catch (error) {
		console.error('Error:', error.message);
		return 'Failed to format prerequisites. Please try again later.';
  }
}

async function format(originalPrereq) {
	const formattedPrereq = await formatPrerequisites(originalPrereq);
	console.log(formattedPrereq)
}

const prereq = 'All of PSYO111, PSYO121.Or all of PSYC101, PSYC102. Or PSYC100.';
format(prereq);
