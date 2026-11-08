/**
 * Extractor for course announcements
 */
const AnnouncementExtractor = {
  extract(document) {
    const headingElem = document.querySelector('.page-header-headings h1, .subject');
    const title = headingElem ? Normalizer.cleanText(headingElem.textContent) : 'SODeL Announcement';

    const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="Breadcrumb"]');
    const courseCode = breadcrumb ? Normalizer.extractCourseCode(breadcrumb.textContent) : null;

    const messageElem = document.querySelector('.posting, .message');
    const content = messageElem ? Normalizer.cleanText(messageElem.textContent) : '';

    return {
      item_type: 'announcement',
      title,
      course_code: courseCode,
      source_url: window.location.href,
      raw_payload: {
        summary: content.slice(0, 300),
      },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnnouncementExtractor;
}

