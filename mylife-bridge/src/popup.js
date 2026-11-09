let currentExtractedData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('pairing-token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const toggleTokenBtn = document.getElementById('toggle-token-btn');
  const closeTokenBtn = document.getElementById('close-token-btn');
  const tokenStatusPill = document.getElementById('token-status-pill');
  const pairingSection = document.getElementById('pairing-section');
  const scanBtn = document.getElementById('scan-btn');
  const sendBtn = document.getElementById('send-btn');
  const pageTypeLabel = document.getElementById('page-type-label');
  const previewCard = document.getElementById('preview-card');
  const previewTitle = document.getElementById('preview-title');
  const previewDetails = document.getElementById('preview-details');
  const feedback = document.getElementById('feedback');

  const updateTokenDisplay = async () => {
    const savedToken = await ApiClient.getPairingToken();
    if (savedToken) {
      tokenInput.value = savedToken;
      if (tokenStatusPill) {
        tokenStatusPill.textContent = 'Paired';
        tokenStatusPill.style.color = '#34d399';
      }
    } else {
      if (tokenStatusPill) {
        tokenStatusPill.textContent = 'Missing';
        tokenStatusPill.style.color = '#f87171';
      }
    }
  };

  await updateTokenDisplay();

  if (toggleTokenBtn) {
    toggleTokenBtn.addEventListener('click', () => {
      const isVisible = pairingSection.style.display !== 'none';
      pairingSection.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) tokenInput.focus();
    });
  }

  if (closeTokenBtn) {
    closeTokenBtn.addEventListener('click', () => {
      pairingSection.style.display = 'none';
    });
  }

  saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (token) {
      await ApiClient.setPairingToken(token);
      pairingSection.style.display = 'none';
      await updateTokenDisplay();
      feedback.style.color = '#34d399';
      feedback.textContent = 'Token updated successfully.';
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
        if (chrome.runtime.lastError) {
          feedback.style.color = '#f87171';
          feedback.textContent = 'Please refresh the SODeL tab (F5) once so the extension can connect.';
          return;
        }

        if (!response || !response.success) {
          feedback.style.color = '#f87171';
          feedback.textContent = 'Could not find any courses or elements to scan. Make sure your course cards are visible on screen, or refresh the page.';
          return;
        }

        currentExtractedData = response.data;
        feedback.textContent = '';
        previewCard.style.display = 'block';
        previewTitle.textContent = currentExtractedData.title;

        let detailsHtml = '';
        if (currentExtractedData.item_type === 'course_overview') {
          const list = currentExtractedData.courses || [];
          detailsHtml = `<div style="margin-bottom: 6px;"><strong>Found ${list.length} Enrolled Units:</strong></div>`;
          detailsHtml += `<div style="max-height: 140px; overflow-y: auto; padding-right: 4px; border: 1px solid #334155; border-radius: 6px; padding: 6px; background: #0b1120;">`;
          list.forEach((c, idx) => {
            detailsHtml += `<div style="font-size: 11px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #1e293b;">
              <span style="color: #38bdf8; font-weight: 600;">${c.course_code}</span>: ${c.title}
            </div>`;
          });
          detailsHtml += `</div>`;
          sendBtn.textContent = `Stage ${list.length} Units in MyLife OS`;
        } else {
          detailsHtml = `<strong>Type:</strong> ${currentExtractedData.item_type.toUpperCase()}<br>`;
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
          sendBtn.textContent = 'Send to MyLife OS Staging';
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

