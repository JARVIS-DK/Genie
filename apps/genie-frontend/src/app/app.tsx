// import React, { useState } from 'react';
// import { Search, Plus, Menu, Sparkles, Globe, ChevronRight } from 'lucide-react';
// import { Sidebar } from '../components/Sidebar';
// import { UseCaseButton } from '../components/UseCaseButton';
// import { OptionsModal } from '../components/OptionsModal';
// import { Chat, Message } from '../types';

// export function App() {
//   const [showModal, setShowModal] = useState(false);
//   const [selectedMode, setSelectedMode] = useState<string | null>(null);
//   const [inputValue, setInputValue] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);

//   const sampleChats: Chat[] = [
//     { id: '1', title: 'Analyse this pdf' },
//     { id: '2', title: 'create a facebook post a...' },
//     { id: '3', title: 'tell me a long story' },
//     { id: '4', title: 'Help me design my marke...' },
//     { id: '5', title: 'Help me prepare for a sal...' },
//     { id: '6', title: 'create a facebook post a...' },
//     { id: '7', title: 'Create a car image' },
//     { id: '8', title: 'create a flow chart to m...' },
//   ];

//   const useCases = [
//     "Help me design my marketing campaign because I'm not getting enough reach",
//     "I'm launching a new product next month, help me create a go-to-market strategy.",
//     "Help me prepare for a sales demo — what should I say and show?",
//     "How do I improve my closing rate in discovery calls?",
//     "I have a list of clients I haven't contacted in months — how do I re-engage them?",
//     "Help me analyze this list of campaign metrics and find what's not working.",
//   ];

//   const handleNewChat = () => {
//     setMessages([]);
//     setSelectedMode(null);
//   };

//   const handleModeSelect = (mode: string) => {
//     setSelectedMode(mode);
//     setShowModal(false);
//   };

//   const handleSendMessage = () => {
//     if (inputValue.trim()) {
//       setMessages([
//         ...messages,
//         { id: Date.now().toString(), type: 'user', content: inputValue },
//       ]);
//       setInputValue('');
      
//       setTimeout(() => {
//         setMessages((prev) => [
//           ...prev,
//           {
//             id: (Date.now() + 1).toString(),
//             type: 'assistant',
//             content: `I'll help you with that using ${selectedMode || 'standard mode'}. Let me analyze your request...`,
//           },
//         ]);
//       }, 1000);
//     }
//   };

//   const handleUseCaseClick = (useCase: string) => {
//     setInputValue(useCase);
//   };

//   return (
//     <div className="flex h-screen bg-gray-50">
//       <Sidebar chats={sampleChats} onNewChat={handleNewChat} />

//       <div className="flex-1 flex flex-col">
//         <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span className="text-gray-600">Super Agent</span>
//           </div>
//           <div className="flex items-center gap-3">
//             <button className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
//               $ 14.01
//             </button>
//             <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
//               Add Credits
//             </button>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto px-6 py-8">
//           {messages.length === 0 ? (
//             <div className="max-w-3xl mx-auto">
//               <h1 className="text-4xl font-bold text-gray-800 mb-2">
//                 Hey Saravanamuthu S,
//               </h1>
//               <p className="text-2xl text-gray-500 mb-8">What can I do for you?</p>

//               <div className="flex gap-3 mb-8">
//                 <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
//                   <Globe size={16} />
//                   Browser Use
//                 </button>
//                 <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
//                   <Sparkles size={16} />
//                   Use cases
//                 </button>
//               </div>

//               <div className="grid gap-3">
//                 {useCases.map((useCase, index) => (
//                   <UseCaseButton
//                     key={index}
//                     text={useCase}
//                     onClick={() => handleUseCaseClick(useCase)}
//                   />
//                 ))}
//               </div>
//             </div>
//           ) : (
//             <div className="max-w-3xl mx-auto space-y-4">
//               {messages.map((message) => (
//                 <div
//                   key={message.id}
//                   className={`p-4 rounded-lg ${
//                     message.type === 'user'
//                       ? 'bg-blue-100 ml-auto max-w-2xl'
//                       : 'bg-white border border-gray-200'
//                   }`}
//                 >
//                   <p className="text-gray-800">{message.content}</p>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         <div className="bg-white border-t border-gray-200 p-4">
//           <div className="max-w-3xl mx-auto">
//             {selectedMode && (
//               <div className="mb-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs inline-block">
//                 Mode: {selectedMode === 'deep-research' ? 'Deep Research' : 'Browser Use'}
//               </div>
//             )}
//             <div className="flex gap-2 items-end">
//               <div className="flex-1 bg-gray-100 rounded-xl p-3 flex items-center gap-2">
//                 <button
//                   onClick={() => setShowModal(true)}
//                   className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
//                 >
//                   <Plus size={20} className="text-gray-600" />
//                 </button>
//                 <input
//                   type="text"
//                   value={inputValue}
//                   onChange={(e) => setInputValue(e.target.value)}
//                   onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
//                   placeholder="I need you to help me with cold calling this list of numbers"
//                   className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
//                 />
//                 <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
//                   <Menu size={20} className="text-gray-600" />
//                 </button>
//               </div>
//               <button
//                 onClick={handleSendMessage}
//                 className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
//               >
//                 <ChevronRight size={20} />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showModal && (
//         <OptionsModal onClose={() => setShowModal(false)} onSelect={handleModeSelect} />
//       )}
//     </div>
//   );
// }

// export default App;

import React, { useState } from 'react';
import { Plus, Menu, Sparkles, Globe, ChevronRight } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { UseCaseButton } from '../components/UseCaseButton';
import { OptionsModal } from '../components/OptionsModal';
import { Chat, Message } from '../types';
// import { getAIResponse } from '../utils/openai'; // Uncomment when integrating AI

export function App() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loginInput, setLoginInput] = useState('');

  // Updated use cases
  const useCases = [
    "Help me design a professional Excel sheet for financial analysis",
    "Create a Google Slides presentation for my upcoming product pitch",
    "Draft a well-structured Google Docs report for team performance",
  ];

  const handleNewChat = () => {
    setMessages([]);
    setSelectedMode(null);
    setCurrentChatId(null);
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    setShowModal(false);
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    const chatMessages = chatId === currentChatId ? messages : [];
    setMessages(chatMessages);
  };

  const handleUseCaseClick = (useCase: string) => {
    setInputValue(useCase);
  };

  const handleLogin = () => {
    if (loginInput.trim()) {
      setUser({ name: loginInput.trim() });
      setLoginInput('');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Create new chat if none exists
    if (!currentChatId) {
      const newChat: Chat = { id: Date.now().toString(), title: inputValue };
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Add a loading assistant message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Generating response...',
    };
    setMessages((prev) => [...prev, loadingMessage]);

    // AI integration placeholder
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: `This is a sample AI response for: "${userMessage.content}".`,
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id ? { ...msg, content: aiMessage.content } : msg
        )
      );
    }, 1500);

    /*
    // Uncomment below when using OpenAI API
    try {
      const aiResponse = await getAIResponse(userMessage.content);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessage.id ? { ...msg, content: aiResponse } : msg
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessage.id ? { ...msg, content: 'Error: Failed to get AI response.' } : msg
        )
      );
    }
    */
  };

  // Login screen
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col gap-4 w-96">
          <h1 className="text-2xl font-bold text-gray-800">Login</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="p-2 border border-gray-300 rounded-lg outline-none"
          />
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        chats={chats}
        onNewChat={handleNewChat}
        user={user}
        onChatSelect={handleChatSelect}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Super Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
              $ 14.01
            </button>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
              Add Credits
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Hey {user.name},
              </h1>
              <p className="text-2xl text-gray-500 mb-8">What can I do for you?</p>

              <div className="flex gap-3 mb-8">
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                  <Globe size={16} />
                  Browser Use
                </button>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                  <Sparkles size={16} />
                  Use cases
                </button>
              </div>

              <div className="grid gap-3">
                {useCases.map((useCase, index) => (
                  <UseCaseButton
                    key={index}
                    text={useCase}
                    onClick={() => handleUseCaseClick(useCase)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-100 ml-auto max-w-2xl'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className="text-gray-800">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            {selectedMode && (
              <div className="mb-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs inline-block">
                Mode: {selectedMode === 'deep-research' ? 'Deep Research' : 'Browser Use'}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1 bg-gray-100 rounded-2xl p-4 flex items-center gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Plus size={24} className="text-gray-600" />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message here..."
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-lg py-3"
                />
                <button className="p-3 hover:bg-gray-200 rounded-lg transition-colors">
                  <Menu size={24} className="text-gray-600" />
                </button>
              </div>
              <button
                onClick={handleSendMessage}
                className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <OptionsModal onClose={() => setShowModal(false)} onSelect={handleModeSelect} />
      )}
    </div>
  );
}

export default App;
