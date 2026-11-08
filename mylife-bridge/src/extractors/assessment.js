/**
 * Extractor for quizzes & assessments (/mod/quiz/view.php)
 */
const AssessmentExtractor = {
  extract(document) {
    const headingElem = document.querySelector('.page-header-headings h1, h2');
    const title = headingElem ? Normalizer.cleanText(headingElem.textContent) : 'SODeL Quiz / CAT';

    const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="Breadcrumb"]');
    const courseCode = breadcrumb ? Normalizer.extractCourseCode(breadcrumb.textContent) : null;

    // Check for quiz close date
    let closeDateStr = '';
    const infoText = document.querySelector('.quizinfo, .box.py-3.quizinfo');
    if (infoText) {
      const match = infoText.textContent.match(/quiz will close (?:at|on)\s+([^.]+)/i);
      if (match) {
        closeDateStr = match[1];
      }
    }

    const { isoDate, hasExplicitTime } = Normalizer.parseDate(closeDateStr);

    return {
      item_type: 'assessment',
      title,
      course_code: courseCode,
      deadline: isoDate,
      has_explicit_time: hasExplicitTime,
      source_url: window.location.href,
      raw_payload: {
        raw_close_date_text: closeDateStr,
      },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssessmentExtractor;
}
