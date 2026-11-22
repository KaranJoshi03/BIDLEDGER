const API_BASE = "/api";

export const api = {
  // RFQs
  async listRfqs(status = "") {
    const url = status && status !== "all" ? `${API_BASE}/rfqs?status=${status}` : `${API_BASE}/rfqs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch RFQs");
    return res.json();
  },

  async getRfq(id) {
    const res = await fetch(`${API_BASE}/rfqs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch RFQ details");
    return res.json();
  },

  async createRfq(rfqData) {
    const res = await fetch(`${API_BASE}/rfqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rfqData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create RFQ");
    }
    return res.json();
  },

  // Bids
  async submitBid(rfqId, bidData) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bidData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit quote");
    }
    return res.json();
  },

  // Suppliers
  async listSuppliers() {
    const res = await fetch(`${API_BASE}/suppliers`);
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    return res.json();
  },

  // Analytics & Graph
  async getRfqAnalytics(rfqId) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/analytics`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },

  // Test Simulation
  async simulateAction(rfqId, action, extra = {}) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Simulation action failed");
    }
    return res.json();
  },
};
