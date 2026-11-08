/**
 * Extractor for assignment pages (/mod/assign/view.php)
 */
const AssignmentExtractor = {
  extract(document) {
    const headingElem = document.querySelector('.page-header-headings h1, h2, .main-content h2');
    const title = headingElem ? Normalizer.cleanText(headingElem.textContent) : 'SODeL Assignment';

    // Breadcrumb course code detection
    const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="Breadcrumb"]');
    const courseCode = breadcrumb ? Normalizer.extractCourseCode(breadcrumb.textContent) : null;

    // Due date search in submission status table
    let deadlineStr = '';
    const tableRows = document.querySelectorAll('.generaltable tbody tr, .submissionstatustable tr');
    tableRows.forEach((row) => {
      const header = row.querySelector('th, td.c0');
      const value = row.querySelector('td.c1, td:not(.c0)');
      if (header && value) {
        const headerText = Normalizer.cleanText(header.textContent).toLowerCase();
        if (headerText.includes('due date') || headerText.includes('deadline')) {
          deadlineStr = Normalizer.cleanText(value.textContent);
        }
      }
    });

    const { isoDate, hasExplicitTime } = Normalizer.parseDate(deadlineStr);

    return {
      item_type: 'assignment',
      title,
      course_code: courseCode,
      deadline: isoDate,
      has_explicit_time: hasExplicitTime,
      source_url: window.location.href,
      raw_payload: {
        raw_deadline_text: deadlineStr,
      },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssignmentExtractor;
}
