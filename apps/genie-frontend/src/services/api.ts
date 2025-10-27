export interface FileAttachment {
  name: string;
  path: string;
  type: string;
  size: number;
  id: string;
}

interface ApiRequest {
  query: string;
  conversation_id: string;
  files?: FileAttachment[];
}

interface ApiResponse {
  meta: {
    status: boolean;
    message: string;
  };
  data: {
    completed_at: string;
    execution_time: number;
    navigations: {
      agent_mcp_navigations: any;
    };
    query: string;
    response: {
      agent_executed_results: Array<{
        agent_id: number;
        agent_name: string;
        agent_status: boolean;
        agent_type: string;
        completed_at: string;
        navigations: {
          mcp_navigation: any;
        };
        query: string;
        response_error: any;
        response_message: string[];
        started_at: string;
        token_usage: {
          flow_usage: any;
          mcp_usage: {
            mcp_token_usage: any;
            mcp_tool_calls_token_usage: any;
          };
        };
      }>;
      combination_type: string;
      combined: boolean;
      llm_final_response: string;
      logs: any;
      token_usage: {
        agents_token_usage: Array<{
          agent_id: number;
          agent_name: string;
          agent_type: string;
          token_usage: {
            flow_usage: any;
            mcp_usage: {
              mcp_token_usage: any;
              mcp_tool_calls_token_usage: any;
            };
          };
        }>;
        combination: {
          input_tokens: number;
          model: string;
          output_tokens: number;
          provider: string;
          provider_code: string;
          total_tokens: number;
        };
        decomposition: {
          input_tokens: number;
          model: string;
          output_tokens: number;
          provider: string;
          provider_code: string;
          total_tokens: number;
        };
        file_analysis: Array<{
          input_tokens: number;
          model: string;
          output_tokens: number;
          provider: string;
          provider_code: string;
          total_tokens: number;
        }>;
      };
    };
    started_at: string;
  };
}

const API_BASE_URL = 'http://74.225.222.68:3001/api/v1/vanij/man_playground/hucsfklguqbv';
const FILE_UPLOAD_URL = 'https://vanijapp.GenIE.ai/api/v1/vanij/gateway/file_manager/internal/upload';
const VANIJ_TOKEN = 'kBCdgWQRFJQfcrjfVbYKtGofCiCAGpfYmQWiIwWMrlYuGKUocYXLQFPFzCdiRGWHbMqbsZeqqOXdXqRWZkbcRmFgHThyVvTlydVbuvRkyVfoiWUxIuhsdYbYEEcifcPf';

export class ApiService {
  private conversationId: string;

  constructor() {
    // Generate a unique conversation ID or use existing one
    this.conversationId = this.generateConversationId();
  }

  private generateConversationId(): string {
    // Generate a UUID-like string for conversation ID
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendMessage(query: string, files?: FileAttachment[]): Promise<ApiResponse> {
    const requestBody: ApiRequest = {
      query,
      conversation_id: this.conversationId,
      files: files || []
    };

    // Debug: Log the files being sent
    if (files && files.length > 0) {
      console.log('Sending files to API:', files.map(f => ({
        name: f.name,
        path: f.path,
        type: f.type,
        size: f.size
      })));
    }

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Vanij-Token': VANIJ_TOKEN
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  getConversationId(): string {
    return this.conversationId;
  }

  setConversationId(id: string): void {
    this.conversationId = id;
  }

  // Upload file to server and get URL
  async uploadFile(file: File): Promise<{ url: string; size: number; provider: string }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(FILE_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.meta?.status && data.data?.url) {
        return {
          url: data.data.url,
          size: data.data.size,
          provider: data.data.provider
        };
      } else {
        throw new Error('Invalid response format from file upload');
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  // Helper method to create file attachment from File object
  createFileAttachment(file: File): FileAttachment {
    return {
      name: file.name,
      path: URL.createObjectURL(file), // For local files, create object URL
      type: file.type,
      size: file.size,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Helper method to create file attachment from uploaded file
  createUploadedFileAttachment(file: File, uploadResult: { url: string; size: number; provider: string }): FileAttachment {
    return {
      name: file.name,
      path: uploadResult.url, // Use the uploaded file URL
      type: file.type,
      size: uploadResult.size,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Helper method to extract the actual message from API response
  extractMessage(response: ApiResponse): string {
    // Try to get the final LLM response first
    if (response.data?.response?.llm_final_response) {
      return response.data.response.llm_final_response;
    }
    
    // Fallback to first agent response message
    if (response.data?.response?.agent_executed_results?.[0]?.response_message?.[0]) {
      return response.data.response.agent_executed_results[0].response_message[0];
    }
    
    // Fallback message
    return "I received your message but couldn't process it properly.";
  }
}

// Export a singleton instance
export const apiService = new ApiService();
