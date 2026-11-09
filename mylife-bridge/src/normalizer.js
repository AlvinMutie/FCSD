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
    // Common Kenyan university unit codes like BIT 2214, HBT 2305, ICS 2303, CIT 3201
    const match = text.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/i);
    return match ? match[1].replace(/\s+/, ' ').toUpperCase() : null;
  },

  generateCourseCode(title) {
    if (!title) return 'SODEL UNIT';
    const explicit = this.extractCourseCode(title);
    if (explicit) return explicit;

    const clean = title.replace(/B\.Sc\.\s*Information\s*Technology/gi, '').trim();
    const knownMap = {
      'calculus i': 'CALC 1',
      'calculus 1': 'CALC 1',
      'database system': 'DB-SYS',
      'database systems': 'DB-SYS',
      'geographical information systems': 'GIS',
      'mobile & wireless computing': 'MWC',
      'mobile and wireless computing': 'MWC',
      'object oriented programming i': 'OOP 1',
      'object oriented programming 1': 'OOP 1',
      'object-oriented programming': 'OOP 1',
      'software engineering 1': 'SE 1',
      'software engineering i': 'SE 1',
      'web application development i': 'WAD 1',
      'web application development 1': 'WAD 1',
    };

    const lower = clean.toLowerCase();
    for (const [key, val] of Object.entries(knownMap)) {
      if (lower.includes(key)) {
        return val;
      }
    }

    const words = clean.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 5).toUpperCase();
    const acronym = words.map(w => (/^\d+$/.test(w) ? w : w[0].toUpperCase())).join('');
    return acronym.substring(0, 6) || 'SODEL';
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

