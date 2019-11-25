'use strict';

/**
 * Gets a query parameter by name from a URL string
 *
 * @param name name of the query param
 * @param url URL string
 * @returns {string|null} resulting param value
 */
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Finds all the course ids from the a links on the class list
 *
 * @returns {string[]} array of course id strings
 */
function getCourseIds() {
    const course_ids = [];
    const course_ul = document.querySelector("ul.portletList-img.courseListing.coursefakeclass");
    const course_lis = course_ul.children;
    for (let i = 0; i < course_lis.length; i++) {
        const elems = course_lis[i].children;
        for (let j = 0; j < elems.length; j++) {
            if (elems[j].tagName === "A") {
                const href = elems[j].href;
                const course_id = getParameterByName("id", href);
                if (course_id !== "") {
                    course_ids.push(course_id);
                }
            }
        }
    }
    return course_ids;
}


/**
 * Get HTML asynchronously
 * @param  {String}   url      The URL to get HTML from
 * @param  {Function} callback A callback funtion. Pass in "response" variable to use returned HTML.
 */
function getHTML(url, callback) {
    if (!window.XMLHttpRequest) return;

    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
        if (callback && typeof (callback) === 'function') {
            callback(this.responseXML);
        }
    };

    xhr.open('GET', url);
    xhr.responseType = 'document';
    xhr.send();
}


/**
 * Gets the grade by scraping the HTML of the My Grades page for a class.
 * Then sets the grade in the course list
 *
 * @param subdomain blackboard.com subdomain
 * @param course_id blackboard.com course id
 * @param course_index index of the course on the classes list page
 */
function displayCourseGrade(subdomain, course_id, course_index) {
    const url = `/webapps/bb-mygrades-BBLEARN/myGrades?course_id=${course_id}&stream_name=mygrades&is_stream=true`;
    getHTML(url, function(response) {
        let grade_received = "0%";
        const grade_divs = response.querySelectorAll("div.sortable_item_row.calculatedRow.row.expanded");

        for (let i = 0; i < grade_divs.length; i++) {
            const div_children = grade_divs[i].children;
            for (let j = 0; j < div_children.length; j++) {
                const classes = div_children[j].className;
                if (classes === "cell gradable") {
                    if ( !div_children[j].innerHTML.includes("Course Grade<div class=\"eval-links horizontal\">")) {
                        break;
                    }
                }
                if (classes === "cell grade") {
                    grade_received = div_children[j].children[0].innerHTML;
                    break;
                }
            }
        }

        const course_lis = document.querySelector("ul.portletList-img.courseListing.coursefakeclass").children;
        const elems = course_lis[course_index].children;
        for (let j = 0; j < elems.length; j++) {
            if (elems[j].tagName === "A") {
                elems[j].innerHTML = elems[j].innerHTML + ` (${grade_received})`
            }
        }
    });
}

/**
 * Inserts the percentage grade for a course after the description on the course's link
 * on the class list page of blackboard.com UI
 *
 * @param subdomain string - Subdomain of our blackboard.com instance
 * @param course_ids []string - course ids in blackboard.com
 */
function displayGradesOnClassList(subdomain, course_ids) {
    for (let i = 0; i < course_ids.length; i++) {
        displayCourseGrade(subdomain, course_ids[i], i);
    }
}

/**
 * Uses XHRs to grab all the overall class grades and display them
 * on the main classes page
 */
async function showGradesOnClassesPage() {
    const subdomain = window.location.host;
    // gather course ids
    const course_ids = getCourseIds();
    displayGradesOnClassList(subdomain, course_ids);
}

/**
 * Shows all numeric grades on the My Grades page as percentages while
 * retaining the fractions as well
 */
function showGradesAsPercentages(doc) {
    const grade_divs = doc.querySelectorAll(".cell.grade");
    for (let i = 1; i < grade_divs.length; i++) {
        const target_elements = grade_divs[i].children;

        let grade_received_index = -1;
        let grade_received = 0;

        let max_possible_grade_index = -1;
        let max_possible_grade = 0;

        for (let j = 0; j < target_elements.length; j++) {
            const classes = target_elements[j].className;
            switch (classes) {
                case "pointsPossible clearfloats":
                    max_possible_grade = target_elements[j].innerHTML.slice(1);
                    max_possible_grade_index = j;
                    break;
                case "grade":
                    grade_received = target_elements[j].innerHTML;
                    grade_received_index = j;
                    break;
            }
        }

        if (isNaN(grade_received)) {
            continue;
        }

        if (grade_received_index >= 0 && max_possible_grade_index >= 0) {
            const grade = grade_received / max_possible_grade * 100;
            const display_grade = grade.toFixed(2);
            target_elements[grade_received_index].innerHTML = display_grade + "%";
            target_elements[max_possible_grade_index].innerHTML = grade_received + "/" + max_possible_grade;
        }
    }
}

/**
 * Determines the URI and either shows grades on class list
 * or converts fraction grades to percentages
 */
function onInit() {
    const classes_page = "/tabs/tabAction";
    const grades_page = "myGrades?course_id=";
    const current_url = window.location.href;

    if (current_url.includes(classes_page)) {
        setTimeout(showGradesOnClassesPage, 500);
    } else if (current_url.includes(grades_page)){
        showGradesAsPercentages(document);
    }
}

onInit();