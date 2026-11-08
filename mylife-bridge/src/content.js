/**
 * Content script for MyLife Bridge.
 * Listens for messages from the popup to detect or scan the page.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DETECT_PAGE') {
    const pageType = PageDetector.detect(window.location.href, document);
    sendResponse({ pageType, url: window.location.href });
    return true;
  }

  if (request.action === 'SCAN_PAGE') {
    const pageType = PageDetector.detect(window.location.href, document);
    let extractedData = null;

    if (pageType === 'course') {
      extractedData = CourseExtractor.extract(document);
    } else if (pageType === 'assignment') {
      extractedData = AssignmentExtractor.extract(document);
    } else if (pageType === 'assessment') {
      extractedData = AssessmentExtractor.extract(document);
    } else if (pageType === 'announcement') {
      extractedData = AnnouncementExtractor.extract(document);
    }

    sendResponse({
      success: Boolean(extractedData),
      pageType,
      data: extractedData,
    });
    return true;
  }
});
