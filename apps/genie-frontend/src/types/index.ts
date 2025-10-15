export interface Chat {
  id: string;
  title: string;
  date?: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

export interface SidebarProps {
  chats: Chat[];
  onNewChat: () => void;
}

export interface UseCaseButtonProps {
  text: string;
  onClick: () => void;
}

export interface OptionsModalProps {
  onClose: () => void;
  onSelect: (option: string) => void;
}