class SyncGridClient {
  constructor(options) {
    if (!options || !options.apiKey) {
      throw new Error('SyncGrid API key is required.');
    }

    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.apiKey = options.apiKey;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'SyncGrid request failed.');
    }

    return data;
  }

  providers() {
    return this.request('/providers');
  }

  createPayment(payload) {
    return this.request('/payments/charges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  verifyPayment(reference, provider) {
    return this.request(
      `/payments/charges/${reference}?provider=${provider}`,
    );
  }

  sendEmail(payload) {
    return this.request('/emails/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getEmailStatus(messageId, provider) {
    return this.request(
      `/emails/messages/${messageId}?provider=${provider}`,
    );
  }

  listWebhooks() {
    return this.request('/webhooks');
  }

  replayWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}/replay`, {
      method: 'POST',
    });
  }

  usageAnalytics() {
    return this.request('/analytics/usage');
  }
}

module.exports = {
  SyncGridClient,
};