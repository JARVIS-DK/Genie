// Example usage of the API service
import { apiService } from '@/services/api';

// Example 1: Send a simple text message
export const sendSimpleMessage = async () => {
  try {
    const response = await apiService.sendMessage("Hello, how are you?");
    console.log('API Response:', response);
    
    // Extract the actual message content
    const messageContent = apiService.extractMessage(response);
    console.log('Extracted message:', messageContent);
    
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

// Example 2: Send a message with file attachments
export const sendMessageWithFiles = async () => {
  // Create file attachments (in real usage, these would come from file input)
  const fileAttachments = [
    {
      name: "example.csv",
      path: "https://example.com/file.csv",
      type: "text/csv",
      size: 1024,
      id: "file-1"
    }
  ];

  try {
    const response = await apiService.sendMessage(
      "Please analyze this CSV file",
      fileAttachments
    );
    console.log('API Response with files:', response);
    
    // Extract the actual message content
    const messageContent = apiService.extractMessage(response);
    console.log('Extracted message:', messageContent);
    
    return response;
  } catch (error) {
    console.error('Error sending message with files:', error);
  }
};

// Example 3: Get current conversation ID
export const getCurrentConversationId = () => {
  const conversationId = apiService.getConversationId();
  console.log('Current conversation ID:', conversationId);
  return conversationId;
};

// Example 4: Set a new conversation ID
export const setNewConversationId = () => {
  const newId = `conv-${Date.now()}`;
  apiService.setConversationId(newId);
  console.log('New conversation ID set:', newId);
  return newId;
};

// Example 5: Create file attachment from File object
export const createFileAttachment = (file: File) => {
  const attachment = apiService.createFileAttachment(file);
  console.log('Created file attachment:', attachment);
  return attachment;
};
