from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException  
import time
import pandas as pd

approx_num_courses = {"UBC, UBCO": 9657, "UBCO": 1773, "UBC": 7884}


def save(df):
    df['winter_term_1'] = df['winter_term_1'].astype(bool)
    df['winter_term_2'] = df['winter_term_2'].astype(bool)
    df['summer_term_1'] = df['summer_term_1'].astype(bool)
    df['summer_term_2'] = df['summer_term_2'].astype(bool)

    df = df.groupby(['course_code']).agg({
        'campus': 'first',
        'year': 'first',
        'name': 'first',
        'description': 'first',
        'credits': 'first',
        'is_honours': 'first',
        'restrictions': 'first',
        'equivalent_string': 'first',
        'co-req_string': 'first',
        'pre-req_string': 'first',
        'courses_in_equivalent_string': 'first',
        'courses_in_co-req_string': 'first',
        'courses_in_pre-req_string': 'first',
        'winter_term_1': 'any',
        'winter_term_2': 'any',
        'summer_term_1': 'any',
        'summer_term_2': 'any',
        'duration_terms': 'first',
        'pre_req_json': 'first'
    }).reset_index()

    df.to_csv("data/courses.csv")


def scrape_classes():

    df = pd.DataFrame(            
        columns=[
            'campus',
            'year',
            'course_code',
            'name',
            'description',
            'credits',
            'is_honours',
            'restrictions',
            'equivalent_string',
            'co-req_string',
            'pre-req_string',
            'courses_in_equivalent_string',
            'courses_in_co-req_string',
            'courses_in_pre-req_string',
            'winter_term_1',
            'winter_term_2',
            'summer_term_1', 
            'summer_term_2', 
            'duration_terms',
            'pre_req_json' 
        ]
    )
    
    browser = webdriver.Chrome()
    browser.get("https://courses.students.ubc.ca/cs/courseschedule")# Must be on UBC network to access this link or login with to UBC account
    print("You have 60 seconds to login to your UBC account if you are not on UBC network")
    time.sleep(60) # this is here so that you can login to your UBC account if you are not on UBC network
    print("Scraping...")

    # campuses = ["UBC"] # Just UBC Vancouver
    campuses = ["UBCO"] # Just UBC Okanagan
    # campuses = ["UBC", "UBCO"] # Both UBC Vancouver and UBC Okanagan

    chosen_campus = ", ".join(campuses)

    i = 0
    try:
        for campus in campuses:      
            browser.find_element(By.XPATH,"//button[contains(text(),'Session')]").click()
            time.sleep(1)
            elem_sessions = browser.find_elements(By.XPATH,"//ul[@class='dropdown-menu']//descendant::a[contains(@title,'20')]")

            string_sessions = list()
            for elem_session in elem_sessions:
                string_sessions.append(elem_session.text)

            for string_session in string_sessions:
                season = string_session.split(" ")[1][0]
                year = string_session.split(" ")[0]
                browser.get(f"https://courses.students.ubc.ca/cs/courseschedule?tname=subj-all-departments&sessyr={year}&sesscd={season}&campuscd={campus}&pname=subjarea")
                
                try:
                    elem_depts = browser.find_elements(By.XPATH,"//tr[contains(@class,'section')]")        
                except NoSuchElementException:
                    continue
                
                string_depts = list()
                for elem_dept in elem_depts:
                    string_depts.append(elem_dept.text)

                for string_dept in string_depts:             
                    if '*' in string_dept:
                        continue
                    dept_code = string_dept.split(" ")[0]
                    browser.get(f"https://courses.students.ubc.ca/cs/courseschedule?tname=subj-department&sessyr={year}&sesscd={season}&campuscd={campus}&dept={dept_code}&pname=subjarea")
                    elem_courses = browser.find_elements(By.XPATH,"//tr[contains(@class,'section')]")

                    string_courses = list()
                    for elem_course in elem_courses:
                        string_courses.append(elem_course.text)


                    for string_course in string_courses:
                        course_num = string_course.split(" ")[1]
                        url = f"https://courses.students.ubc.ca/cs/courseschedule?sesscd={season}&campuscd={campus}&pname=subjarea&tname=subj-course&course={course_num}&sessyr={year}&dept={dept_code}"
                        browser.get(url)

                        name = browser.find_element(By.XPATH,"//h4").text

                        isHonours = "Honours Thesis" in name

                        desc = browser.find_element(By.XPATH,"//div[@role = 'main']/descendant::p[1]").text

                        credits = browser.find_element(By.XPATH,"//p[contains(text(),'Credits:')]").text.split('Credits:')[1].strip()
                    
                        pre_req_str = ""
                        courses_in_pre_req = []
                        try:   
                            pre_req_str = browser.find_element(By.XPATH,"//p[contains(text(),'Pre-reqs:')]").text.split('Pre-reqs:')[1].strip()
                            elem_pre_reqs = browser.find_elements(By.XPATH,"//p[contains(text(),'Pre-reqs:')]//descendant::a")
                            for elem_pre_req in elem_pre_reqs:
                                courses_in_pre_req.append(elem_pre_req.text)
                        except:
                            pass

                        co_req_str = ""
                        courses_in_co_req = []
                        try:
                            co_req_str = browser.find_element(By.XPATH,"//p[contains(text(),'Co-reqs:')]").text.split('Co-reqs:')[1].strip()
                            elem_co_reqs = browser.find_elements(By.XPATH,"//p[contains(text(),'Co-reqs:')]//descendant::a")
                            for elem_co_req in elem_co_reqs:
                                courses_in_co_req.append(elem_co_req.text)
                        except:
                            pass

                        equivalent_str = ""
                        courses_in_equivalent = []
                        try:
                            equivalent_str = browser.find_element(By.XPATH,"//p[contains(text(),'Equivalents:')]").text.split('Equivalents:')[1].strip()
                            elem_equivalents = browser.find_elements(By.XPATH,"//p[contains(text(),'Equivalents:')]//descendant::a")
                            for elem_equivalent in elem_equivalents:
                                courses_in_equivalent.append(elem_equivalent.text)
                        except:
                            pass
                        

                        restrictions = ""
                        try:
                            restrictions = browser.find_element(By.XPATH,"//li[contains(text(),'restricted')]").text
                        except:
                            pass
                        
                        durationTerms = 1
                        if season == "W":
                            summerTerm1 = False
                            summerTerm2 = False
                            
                            try:
                                terms = browser.find_elements(By.XPATH,f"//a[contains(text(), '{dept_code} {course_num}')]/ancestor::tr/td[4]")

                                terms = [term.text for term in terms]

                                winterTerm1 = '1' in terms or '1-2' in terms
                                winterTerm2 = '2' in terms or '1-2' in terms

                                if '1-2' in terms:
                                    durationTerms = 2

                            except:
                                winterTerm1 = False
                                winterTerm2 = False


                        if season == "S":
                            winterTerm1 = False
                            winterTerm2 = False

                            try:
                                terms = browser.find_elements(By.XPATH,f"//a[contains(text(), '{dept_code} {course_num}')]/ancestor::tr/td[4]")

                                terms = [term.text for term in terms]

                                summerTerm1 = '1' in terms or '1-2' in terms
                                summerTerm2 = '2' in terms or '1-2' in terms

                                if '1-2' in terms:
                                    durationTerms = 2
                            except:
                                summerTerm1 = False
                                summerTerm2 = False



                        course_code = f"{dept_code} {course_num}"
                        df.loc[len(df.index)]=[campus, 
                                               year, 
                                               course_code, 
                                               name, 
                                               desc,
                                               credits,
                                               isHonours, 
                                               restrictions,
                                               equivalent_str,
                                               co_req_str, 
                                               pre_req_str,
                                               ",".join(courses_in_equivalent),
                                               ",".join(courses_in_co_req),
                                               ",".join(courses_in_pre_req),
                                               winterTerm1, 
                                               winterTerm2, 
                                               summerTerm1, 
                                               summerTerm2, 
                                               durationTerms,
                                               "\{\}"#placeholder
                                               ]

                        print(f"Progress: {round((i/approx_num_courses[chosen_campus])*100, 2)}%", end='\r')
                        i +=1

    except Exception as e:
        # Save the progress if something breaks
        print(e)
        save(df)
        return

            
    save(df)


scrape_classes()

