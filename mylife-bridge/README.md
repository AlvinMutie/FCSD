# MyLife Bridge — JKUAT SODeL Chrome Extension (Manifest V3)

A lightweight, assisted, read-only browser extension that connects your authenticated JKUAT SODeL portal session (`https://sodel3v2.jkuat.ac.ke`) to **MyLife OS**.

---

## 1. Security & Privacy Guarantees
- **No Password Collection**: Never prompts for, reads, or stores your university password.
- **No Session Cookie Harvesting**: Operates strictly via read-only DOM extraction on the active tab upon user click.
- **Pairing Token Isolation**: Communicates with the local MyLife OS server via a dedicated, revocable cryptographic token (`mlb_...`).
- **Zero Auto-Imports**: Extracted items are staged into `Pending Imports` and will never modify official academic records without your explicit approval.
- **Timezone Awareness**: All dates adhere to `Africa/Nairobi`. Missing times remain date-only rather than assuming 11:59 PM.

---

## 2. Installation (Developer Mode in Chrome / Brave / Edge)
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top right).
3. Click **Load unpacked**.
4. Select the `mylife-os/mylife-bridge` directory.
5. Pin the extension to your toolbar.

---

## 3. How to Pair & Use
1. In MyLife OS, navigate to **Integrations** and click **Generate Pairing Token**.
2. Click the MyLife Bridge icon in your browser and paste your pairing token.
3. Log in to JKUAT SODeL normally (`https://sodel3v2.jkuat.ac.ke`).
4. Navigate to any course, assignment, or quiz page.
5. Click the MyLife Bridge icon $\rightarrow$ **Scan Current Page**.
6. Review the extracted preview $\rightarrow$ Click **Send to MyLife OS Staging**.
7. In MyLife OS, go to **Integrations &gt; Pending Imports** to review, edit, or approve the record.
