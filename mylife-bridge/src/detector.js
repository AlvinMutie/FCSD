/**
 * Identifies current SODeL page type based on URL patterns and DOM markers.
 */
const PageDetector = {
  detect(url, document) {
    const href = url || window.location.href;

    if (href.includes('/mod/assign/')) {
      return 'assignment';
    }
    if (href.includes('/mod/quiz/')) {
      return 'assessment';
    }
    if (href.includes('/mod/forum/view.php') || href.includes('/mod/announcements/')) {
      return 'announcement';
    }
    if (href.includes('/course/view.php')) {
      return 'course';
    }
    if (href.includes('/my/') || href.includes('/dashboard')) {
      return 'course_overview';
    }

    return 'unsupported';
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageDetector;
}

