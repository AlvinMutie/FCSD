/**
 * Client for communicating with the local MyLife OS backend.
 */
const ApiClient = {
  baseUrl: 'http://127.0.0.1:5000/api/integrations/sodel',

  async getPairingToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pairing_token'], (result) => {
        resolve(result.pairing_token || null);
      });
    });
  },

  async setPairingToken(token) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ pairing_token: token }, () => {
        resolve();
      });
    });
  },

  async sendScan(payload) {
    const token = await this.getPairingToken();
    if (!token) {
      throw new Error('Extension is not paired. Please enter your pairing token from MyLife OS.');
    }

    const response = await fetch(`${this.baseUrl}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pairing-Token': token,
      },
      body: JSON.stringify({
        ...payload,
        pairing_token: token,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send scan to MyLife OS');
    }
    return data;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
