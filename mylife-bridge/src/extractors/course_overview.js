/**
 * Extractor for SODeL Dashboard / Enrolled Courses Overview (/my/ or /dashboard)
 * Extracts all enrolled units from the user's Moodle course overview deck.
 */
const CourseOverviewExtractor = {
  extract(document) {
    const courses = [];
    const seenUrls = new Set();
    const seenTitles = new Set();

    // Selectors covering Moodle 3.x and 4.x dashboard course cards and lists
    const cardSelectors = [
      '.dashboard-card',
      '[data-region="card-item"]',
      '.course-info-container',
      '[data-region="course-content"]',
      '.coursebox',
      '.course-listitem',
      '.card.dashboard-card-deck',
      '.card'
    ];

    const cards = document.querySelectorAll(cardSelectors.join(', '));

    cards.forEach((card) => {
      // Find course link element
      const linkElem = card.querySelector('a.coursename, a[href*="/course/view.php"]');
      if (!linkElem) return;

      const href = linkElem.href || '';
      if (!href || seenUrls.has(href)) return;

      // Check title attribute, aria-label, inner text, or multiline span
      let rawTitle = (
        linkElem.getAttribute('title') ||
        linkElem.querySelector('.multiline')?.getAttribute('title') ||
        card.querySelector('.coursename .multiline')?.textContent ||
        card.querySelector('.coursename')?.textContent ||
        linkElem.getAttribute('aria-label') ||
        linkElem.textContent ||
        ''
      );

      // Clean up common Moodle prefixes and ellipsis truncation markers
      rawTitle = Normalizer.cleanText(rawTitle)
        .replace(/^Course name:\s*/i, '')
        .replace(/^Course:\s*/i, '')
        .replace(/^Select course:\s*/i, '')
        .replace(/\s*\.{3,}$/, '')
        .replace(/\s*…$/, '')
        .trim();

      // Avoid matching empty or non-course links (e.g. pagination or general categories)
      if (!rawTitle || rawTitle.length < 3 || seenTitles.has(rawTitle.toLowerCase())) return;

      const code = Normalizer.generateCourseCode(rawTitle);

      // Check progress percentage if present
      let progress = 0;
      const progressElem = card.querySelector('.progress-bar, [data-region="progress-bar"]');
      if (progressElem && progressElem.style && progressElem.style.width) {
        progress = parseInt(progressElem.style.width, 10) || 0;
      }

      seenUrls.add(href);
      seenTitles.add(rawTitle.toLowerCase());

      courses.push({
        title: rawTitle,
        course_code: code,
        source_url: href,
        progress: progress,
      });
    });

    // Fallback: If container selectors didn't match, query all course links on page
    if (courses.length === 0) {
      document.querySelectorAll('a[href*="/course/view.php?id="]').forEach((a) => {
        const href = a.href;
        if (seenUrls.has(href)) return;

        let rawTitle = (
          a.getAttribute('title') ||
          a.getAttribute('aria-label') ||
          a.querySelector('.multiline')?.textContent ||
          a.textContent ||
          ''
        );

        rawTitle = Normalizer.cleanText(rawTitle)
          .replace(/^Course name:\s*/i, '')
          .replace(/^Course:\s*/i, '')
          .replace(/^Select course:\s*/i, '')
          .replace(/\s*\.{3,}$/, '')
          .replace(/\s*…$/, '')
          .trim();

        if (!rawTitle || rawTitle.length < 3 || seenTitles.has(rawTitle.toLowerCase())) return;

        const code = Normalizer.generateCourseCode(rawTitle);
        seenUrls.add(href);
        seenTitles.add(rawTitle.toLowerCase());

        courses.push({
          title: rawTitle,
          course_code: code,
          source_url: href,
          progress: 0,
        });
      });
    }

    if (courses.length === 0) {
      return null;
    }

    return {
      item_type: 'course_overview',
      title: `SODeL Dashboard (${courses.length} Enrolled Units)`,
      courses: courses,
      source_url: window.location.href,
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CourseOverviewExtractor;
}
