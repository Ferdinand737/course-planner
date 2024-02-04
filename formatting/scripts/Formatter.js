class Formatter{

	//MAIN FUNCTION: accepts a string prerequisite, returns formatted string.
  static format(preRequisite, facultyCode = "", courseNum = "", courseDesc = ""){

    const re = Formatter.readRegexes(); 	//an object with regexes as values

		// Format "either" and "or" statements recursively due to the possibility of more patterns within each option, since formatSubstring() only formats one type of statement at a time.
		preRequisite = Formatter.formatEither(preRequisite); 		// ]- these functions recursively call format()
		preRequisite = Formatter.formatOr(preRequisite);				// ]

		// Pre-processing the data to account for inconsistency, by making all "and" type relations the same. 
		preRequisite = preRequisite.replace(re.and, " and ");

		// Splitting by " and " to acquire substrings that can be formatted individually and joined using "&" at the end.
		preRequisite = preRequisite.split(" and ");

		// Ignoring any sentence with "recommended"
		preRequisite = preRequisite.filter((element) => !re.recommended.test(element))

		for (let i = 0; i < preRequisite.length; i++) {
			preRequisite[i] = Formatter.formatSubstring(preRequisite[i])
		}

		preRequisite = preRequisite.join("&");
		
		if(facultyCode)	
			preRequisite = facultyCode + courseNum + "→" + preRequisite;
		
		return preRequisite;
	}

  // Function to check if the course description has an exclusion, and returning .
  static checkExclusions(description){

    const re = Formatter.readRegexes(); 	//an object with regexes as values

    if(description.match(re.exclusions))
      return description.match(re.exclusions)[0];
  
    return null;
  }

  static formatExclusions(rawExclusions, facultyCode, courseNum){

    const re = Formatter.readRegexes(); 	//an object with regexes as values
    
    let formattedExclusions = rawExclusions.match(re.courses);

    formattedExclusions = formattedExclusions.map((element) => {
      return element.replace(/(?<=[A-Z]{3,4}) /g, '');
    })

    formattedExclusions = formattedExclusions.filter((element) => {
      return element !== facultyCode+courseNum;
    })

    return formattedExclusions.join(',');
  }

	// Helper function to format each substring after splitting
	static formatSubstring(preReq){

    const re = Formatter.readRegexes(); 	//an object with regexes as values

		let formattedPreReq = ""; 
		let concatGrade = "";

		// Pre-processing 

		if(preReq == ""){
			return "None"
		}

		if(re.either.test(preReq)){			//pre-processing "either" statement to look like a "one of" statement  
			preReq = preReq.replace(re.either, "One of");
			preReq = preReq.replace(re.eitherLetters, ",");
			preReq = preReq.replace(/ one of/gi, "");
		}

		if(re.grade.test(preReq)){		//checking if there is a % grade requirement
			let requiredGrade = re.grade.exec(preReq)[1];
			concatGrade = "-" + requiredGrade;
		}

		if(re.yearStanding.test(preReq)){		//formatting "__-year standing" 
				
			switch(true){
				case /second/i.test(preReq):
				preReq = preReq.replace(re.yearStanding, "YS-2"); 
				break;
				case /third/i.test(preReq):
				preReq = preReq.replace(re.yearStanding, "YS-3");
				break;
				case /fourth/i.test(preReq):
				preReq = preReq.replace(re.yearStanding, "YS-4"); 
				break;
			}
				
		}
		
		// Formatting by cases

		let courseList = []
		let courseListString;
		let match;

		switch(true){   //Add cases here: 

			case re.oneOf.test(preReq):

				courseListString = re.oneOf.exec(preReq)[0];

				while (match = re.orList.exec(courseListString)) {
					courseList.push(match[1]);
				}
				
				courseList = courseList.map(function(element) {
					return element + concatGrade;
				});

				
				formattedPreReq = "1*(" + courseList.join(",") + ")";
				break;
				
			case re.twoOf.test(preReq):

				courseListString = re.twoOf.exec(preReq)[0];

				while (match = re.orList.exec(courseListString)) {
					courseList.push(match[1]);
				}
				
				courseList = courseList.map(function(element) {
					return element + concatGrade;
				});

				
				formattedPreReq = "2*(" + courseList.join(",") + ")";
				break;
				

			case re.allOf.test(preReq):

				courseList = re.allOf.exec(preReq)[0].split(', ')
				
				courseList = courseList.map(function(element) {
					return element + concatGrade;
				});
			
				formattedPreReq = courseList.join("&");
				break;
				
			case re.singleCourse.test(preReq):
				formattedPreReq = preReq.match(/[^.;]+/) + concatGrade;
				break;

			case re.YS.test(preReq):
				formattedPreReq += preReq
				break;

			case re.creditsOf.test(preReq):
				formattedPreReq += "CR-";
				try{
					const numCredits = preReq.match(re.numCreditsOf)[1];
	
					if (/\d/.test(numCredits))
						formattedPreReq += numCredits + ":";
					else if(/three/i.test(numCredits)) 
						formattedPreReq += "3:";
							
					formattedPreReq += "[" + preReq.match(re.creditsOfCourse)[0] + "]";
					break;
				}catch(e){
					console.log("Error in formatting creditsOf statement: " + preReq);
					formattedPreReq += '?' + preReq
					break;
				}

			default: 
				formattedPreReq += '?' + preReq
		}    

		return formattedPreReq;
	}

	// Helper function to format either statements separately beforehand.
	static formatEither(prereq){

    const re = Formatter.readRegexes(); 	//an object with regexes as values

		if (!re.either.test(prereq))	return(prereq); //return if there is no "either" statement 

		let match, flag;
		let optionsList = [];

		while (match = re.eitherOptions.exec(prereq)) { //matches all options among (a),(b),(c),etc and storing them individually in optionsList.

			optionsList.push(match[1]);

			// Checking if there is "and", "two of", "all of", "score of" in any of the options
			flag = flag || re.twoOf.test(match[1]) || re.and.test(match[1]) || re.allOf.test(match[1]) || re.grade.test(match[1]); 		//Add new cases here
		}

		// Only need to format separately if flag is true, else process as normal.
		if(!flag) return prereq;

		for (let i = 0; i < optionsList.length; i++) {
			optionsList[i] = Formatter.format(optionsList[i])		//recursive call to format each option in the either statement.
		}

		let eitherReplace = "1*(" + optionsList.join(",") + ")";
		prereq = prereq.replace(re.eitherReplace, eitherReplace);	//replacing either statement with formatted string.  
		
		return prereq;
	}

	static formatOr(prereq){

    	const re = Formatter.readRegexes(); 	//an object with regexes as values

		if(!re.or.test(prereq)) return(prereq);			//return if there is no "or" statement 
		
		let optionsList = [];

		prereq = "." + prereq.replace(re.or,"|");		//adding a "." at the start in case the first statement is also or'd. 

		try{
			let	options = prereq.match(re.orSplit)[0];	//matching everything before and after "|"
			optionsList = options.split("|");
			
			for (let i = 0; i < optionsList.length; i++) {
				optionsList[i] = Formatter.format(optionsList[i])		//recursive call to format each option in the "or" statement.
			}
			
			prereq = prereq.replace(re.orSplit,"1*(" + optionsList.join(",") + ")").substring(1);	//replacing prereq with formatted string.  
	
			return prereq;
		}catch(e){
			console.log("Error in formatting or statement: " + prereq);
			return prereq;
		}
	}

	// Reads from regex.ini and returns an object with identifiers as keys and respective regular expressions as values.  
	static readRegexes() {

		const iniParser = require('ini-parser');
		const fileReader = require('fs');

		try {
			const iniData = fileReader.readFileSync('regex.ini', 'utf8');
			const filtered_iniData = Formatter.removeComments(iniData);

			const parsedIni = iniParser.parse(filtered_iniData);

			const patterns = {};

			for (let key in parsedIni.regex) {

				//Code to separate the patterns and the flag
				const regexString = parsedIni.regex[key].substring(1);   //.substring removes the first "/"
				const splitArray = regexString.split("/");               // split by the second "/"; get pattern as the 0th element, flags as the 1st
				const pattern = splitArray[0];
				const flag = splitArray[1]; 

				//Create each regex obj
				const regex = new RegExp(pattern,flag);
				patterns[key] = regex;
			}

			return patterns;
		} catch (error) {
			console.error('Error reading INI file:', error);
			return {};
		}
	}

	// Helper function to remove comments from regex.ini since parser currently does not automatically exclude them. 
	static removeComments(content) {

		// Split the content into lines
		const lines = content.split('\n');

		let filteredLines;

		// Filter out comment lines
		filteredLines = lines.filter(line => !line.trim().startsWith('#'));
		filteredLines = lines.filter(line => !line.trim().startsWith(';'));

		// Join the filtered lines back into a single string
		const filteredContent = filteredLines.join('\n');

		return filteredContent;
	}
}

module.exports = Formatter;