let currentExtractedData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('pairing-token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const scanBtn = document.getElementById('scan-btn');
  const sendBtn = document.getElementById('send-btn');
  const pageTypeLabel = document.getElementById('page-type-label');
  const previewCard = document.getElementById('preview-card');
  const previewTitle = document.getElementById('preview-title');
  const previewDetails = document.getElementById('preview-details');
  const feedback = document.getElementById('feedback');

  // Load existing pairing token if present
  const savedToken = await ApiClient.getPairingToken();
  if (savedToken) {
    tokenInput.value = savedToken;
    document.getElementById('pairing-section').style.display = 'none';
  }

  saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (token) {
      await ApiClient.setPairingToken(token);
      document.getElementById('pairing-section').style.display = 'none';
      feedback.style.color = '#34d399';
      feedback.textContent = 'Token saved successfully.';
    }
  });

  // Query active tab to detect page type
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].id) return;
    const url = tabs[0].url || '';

    if (!url.includes('sodel3v2.jkuat.ac.ke')) {
      pageTypeLabel.textContent = 'Not on JKUAT SODeL';
      pageTypeLabel.style.color = '#f87171';
      scanBtn.disabled = true;
      scanBtn.style.opacity = '0.5';
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'DETECT_PAGE' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        pageTypeLabel.textContent = 'SODeL Page (Refresh tab if unresponsive)';
        return;
      }
      const labels = {
        course: 'Unit / Course Page',
        assignment: 'Assignment Page',
        assessment: 'Quiz / Assessment Page',
        announcement: 'Course Announcement',
        course_overview: 'My Courses Overview',
        unsupported: 'Unsupported SODeL Page',
      };
      pageTypeLabel.textContent = labels[response.pageType] || response.pageType;
    });
  });

  // Handle Scan Page click
  scanBtn.addEventListener('click', () => {
    feedback.textContent = 'Extracting academic elements...';
    feedback.style.color = '#94a3b8';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_PAGE' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          feedback.style.color = '#f87171';
          feedback.textContent = 'Failed to extract from page. Ensure you are on a supported SODeL page.';
          return;
        }

        currentExtractedData = response.data;
        feedback.textContent = '';
        previewCard.style.display = 'block';
        previewTitle.textContent = currentExtractedData.title;

        let detailsHtml = `<strong>Type:</strong> ${currentExtractedData.item_type.toUpperCase()}<br>`;
        if (currentExtractedData.course_code) {
          detailsHtml += `<strong>Course:</strong> ${currentExtractedData.course_code}<br>`;
        }
        if (currentExtractedData.deadline) {
          detailsHtml += `<strong>Deadline:</strong> ${new Date(currentExtractedData.deadline).toLocaleString()}<br>`;
          detailsHtml += `<strong>Explicit Time:</strong> ${currentExtractedData.has_explicit_time ? 'Yes' : 'No (Date only)'}<br>`;
        }
        if (currentExtractedData.sections) {
          detailsHtml += `<strong>Sections Found:</strong> ${currentExtractedData.sections.length}<br>`;
        }
        previewDetails.innerHTML = detailsHtml;
      });
    });
  });

  // Handle Send to MyLife OS
  sendBtn.addEventListener('click', async () => {
    if (!currentExtractedData) return;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      await ApiClient.sendScan(currentExtractedData);
      feedback.style.color = '#34d399';
      feedback.textContent = 'Sent! Check Pending Imports in MyLife OS to review & approve.';
      previewCard.style.display = 'none';
      currentExtractedData = null;
    } catch (err) {
      feedback.style.color = '#f87171';
      feedback.textContent = err.message;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send to MyLife OS Staging';
    }
  });
});
