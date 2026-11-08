/**
 * Extractor for course view pages (/course/view.php)
 */
const CourseExtractor = {
  extract(document) {
    const pageTitleElem = document.querySelector('.page-header-headings h1, h1.coursename, .course-title, header h1');
    const fullTitle = pageTitleElem ? Normalizer.cleanText(pageTitleElem.textContent) : 'SODeL Course';

    const courseCode = Normalizer.extractCourseCode(fullTitle) || 'SODEL UNIT';

    // Collect topic/section headings
    const sections = [];
    document.querySelectorAll('.sectionname, .course-section-header, .section .content h3').forEach((sec) => {
      const text = Normalizer.cleanText(sec.textContent);
      if (text && !sections.includes(text)) {
        sections.push(text);
      }
    });

    return {
      item_type: 'course',
      title: fullTitle,
      course_code: courseCode,
      sections,
      source_url: window.location.href,
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CourseExtractor;
}

