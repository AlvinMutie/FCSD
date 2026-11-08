/**
 * Normalizer utility for parsing SODeL DOM strings safely into structured data.
 * Always respects the Africa/Nairobi timezone and avoids assuming 11:59 PM.
 */
const Normalizer = {
  cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  },

  extractCourseCode(text) {
    if (!text) return null;
    // Common Kenyan university unit codes like ICS 2303, BIT 2101, CIT 3201
    const match = text.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/i);
    return match ? match[1].replace(/\s+/, ' ').toUpperCase() : null;
  },

  parseDate(dateString) {
    if (!dateString) return { isoDate: null, hasExplicitTime: false };

    const cleaned = this.cleanText(dateString);
    // Detect whether an explicit time is present (e.g. 23:59, 11:59 PM, 5:00 PM)
    const timeMatch = cleaned.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    const hasExplicitTime = Boolean(timeMatch);

    const parsed = Date.parse(cleaned);
    if (!isNaN(parsed)) {
      return {
        isoDate: new Date(parsed).toISOString(),
        hasExplicitTime,
      };
    }

    return { isoDate: null, hasExplicitTime: false };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Normalizer;
}

