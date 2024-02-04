from lib2to3.pgen2 import driver
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException  
import time
import pandas as pd
from selenium.webdriver.common.action_chains import ActionChains

def scrape_classes():

    df = pd.DataFrame(columns=['Campus','Year','Season','Department','Course code','Name','Description', 'Credits','Co-reqs-string','Restrictions','Pre-req string','winterTerm1','winterTerm2','summerTerm1','summerTerm2','durationTerms','URL'])

    browser = webdriver.Chrome()
    browser.get("https://courses.students.ubc.ca/cs/courseschedule")# Must be on UBC network to access this link or login with to UBC account
    time.sleep(60) # uncomment this line if you are not on UBC network and need to login to UBC account
   
    browser.find_element(By.XPATH,"//button[contains(text(),'Campus')]").click()
    time.sleep(1)
    elem_campuses = browser.find_elements(By.XPATH,"//ul[@class='dropdown-menu']//descendant::a[contains(@title,'UBC')]")
    i = 0
    string_campuses = list()
    for elem_campus in elem_campuses:
        string_campuses.append(elem_campus.get_attribute("title"))

    for string_campus in string_campuses:      
        browser.find_element(By.XPATH,"//button[contains(text(),'Session')]").click()
        time.sleep(1)
        elem_sessions = browser.find_elements(By.XPATH,"//ul[@class='dropdown-menu']//descendant::a[contains(@title,'20')]")

        string_sessions = list()
        for elem_session in elem_sessions:
            string_sessions.append(elem_session.text)

        for string_session in string_sessions:
            season = string_session.split(" ")[1][0]
            year = string_session.split(" ")[0]
            browser.get(f"https://courses.students.ubc.ca/cs/courseschedule?tname=subj-all-departments&sessyr={year}&sesscd={season}&campuscd={string_campus}&pname=subjarea")
            
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
                browser.get(f"https://courses.students.ubc.ca/cs/courseschedule?tname=subj-department&sessyr={year}&sesscd={season}&campuscd={string_campus}&dept={dept_code}&pname=subjarea")
                elem_courses = browser.find_elements(By.XPATH,"//tr[contains(@class,'section')]")

                string_courses = list()
                for elem_course in elem_courses:
                    string_courses.append(elem_course.text)


                for string_course in string_courses:
                    course_num = string_course.split(" ")[1]
                    url = f"https://courses.students.ubc.ca/cs/courseschedule?sesscd={season}&campuscd={string_campus}&pname=subjarea&tname=subj-course&course={course_num}&sessyr={year}&dept={dept_code}"
                    browser.get(url)

                   
                    pre_req_str = ""
                    try:   
                        pre_req_str = browser.find_element(By.XPATH,"//p[contains(text(),'Pre-reqs:')]").text
                    except:
                       pass

                    co_req_str = ""
                    try:
                        co_req_str = browser.find_elements(By.XPATH,"//p[contains(text(),'Co-reqs:')]").text
                    except:
                       pass
                    
                    name = browser.find_element(By.XPATH,"//h4").text
                    desc = browser.find_element(By.XPATH,"//div[@role = 'main']/descendant::p[1]").text
                    credits = browser.find_element(By.XPATH,"//p[contains(text(),'Credits:')]").text.split(':')[1]

                    restrictions = ""
                    try:
                        restrictions = browser.find_element(By.XPATH,"//li[contains(text(),'restricted to students')]").text
                    except:
                       pass
                    
                    durationTerms = 1
                    if season == "W":
                        summerTerm1 = False
                        summerTerm2 = False
                        
                        try:
                            terms = browser.find_elements(By.XPATH,"//a[contains(text(), 'Section Comments')]/ancestor::tr/td[3]")

                            terms = [term.get_attribute('textContent') for term in terms]

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
                            terms = browser.find_elements(By.XPATH,"//a[contains(text(), 'Section Comments')]/ancestor::tr/td[3]")

                            terms = [term.get_attribute('textContent') for term in terms]

                            summerTerm1 = '1' in terms or '1-2' in terms
                            summerTerm2 = '2' in terms or '1-2' in terms

                            if '1-2' in terms:
                                durationTerms = 2
                        except:
                            summerTerm1 = False
                            summerTerm2 = False

            
                    df.loc[len(df.index)]=[string_campus, year, season, dept_code, course_num, name, desc, credits, co_req_str, restrictions, pre_req_str, winterTerm1, winterTerm2, summerTerm1, summerTerm2, durationTerms, url]
                    print(f"Progress: {round((i/9657)*100, 2)}%", end='\r')
                    i +=1
                    
    df.to_csv("courses.csv")

scrape_classes()

