const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Entity APIs
  async createEntity(data: any) {
    return this.request('/entity/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEntities() {
    return this.request('/entities');
  }

  async getEntity(id: string) {
    return this.request(`/entity/${id}`);
  }

  // Document APIs
  async uploadDocuments(entityId: string, files: FormData) {
    const url = `${this.baseUrl}/documents/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: files,
    });
    return response.json();
  }

  async getDocuments(entityId: string) {
    return this.request(`/documents?entityId=${entityId}`);
  }

  async classifyDocument(documentId: string, action: string, type?: string) {
    return this.request(`/documents/${documentId}/classify`, {
      method: 'POST',
      body: JSON.stringify({ action, type }),
    });
  }

  // Extraction APIs
  async getExtractionResults(documentId: string) {
    return this.request(`/extraction/results?documentId=${documentId}`);
  }

  async updateExtraction(extractionId: string, data: any) {
    return this.request(`/extraction/${extractionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approveExtraction(extractionId: string) {
    return this.request(`/extraction/${extractionId}/approve`, {
      method: 'POST',
    });
  }

  // Schema APIs
  async getSchema(entityId: string) {
    return this.request(`/schema?entityId=${entityId}`);
  }

  async updateSchema(schemaId: string, data: any) {
    return this.request('/schema/update', {
      method: 'POST',
      body: JSON.stringify({ schemaId, ...data }),
    });
  }

  // Research APIs
  async getResearchInsights(entityId: string) {
    return this.request(`/research/insights?entityId=${entityId}`);
  }

  // Risk APIs
  async getRiskAnalysis(entityId: string) {
    return this.request(`/risk/analysis?entityId=${entityId}`);
  }

  // CAM APIs
  async generateCAM(entityId: string) {
    return this.request('/cam/generate', {
      method: 'POST',
      body: JSON.stringify({ entityId }),
    });
  }

  async getCAM(entityId: string) {
    return this.request(`/cam?entityId=${entityId}`);
  }

  async updateCAMSection(camId: string, sectionId: string, content: string) {
    return this.request(`/cam/${camId}/section/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  // AI Assistant
  async sendMessage(entityId: string, message: string) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ entityId, message }),
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }
}

export const api = new ApiClient(API_BASE_URL);
