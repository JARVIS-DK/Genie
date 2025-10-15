// import React from 'react';
// import { Plus } from 'lucide-react';
// import { SidebarProps } from '../types';

// export const Sidebar: React.FC<SidebarProps> = ({ chats, onNewChat }) => {
//   return (
//     <div className="w-64 bg-gray-100 h-screen flex flex-col border-r border-gray-300">
//       <div className="p-4 border-b border-gray-300">
//         <div className="flex items-center gap-2 mb-4">
//           <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
//             <span className="text-white font-bold">SA</span>
//           </div>
//           <span className="font-semibold">Super Agent</span>
//         </div>
//         <button
//           onClick={onNewChat}
//           className="w-full bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
//         >
//           <Plus size={18} />
//           <span>New Chat</span>
//         </button>
//       </div>

//       <div className="flex-1 overflow-y-auto p-2">
//         <div className="text-xs text-gray-500 px-3 py-2 font-semibold">Last 7 days</div>
//         {chats.map((chat) => (
//           <div
//             key={chat.id}
//             className="px-3 py-2 hover:bg-gray-200 rounded-lg cursor-pointer text-sm text-gray-700 truncate transition-colors"
//           >
//             {chat.title}
//           </div>
//         ))}
//       </div>

//       <div className="p-4 border-t border-gray-300">
//         <div className="flex items-center gap-2 text-sm text-gray-600">
//           <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
//           <span>Saravanamuthu S</span>
//         </div>
//       </div>
//     </div>
//   );
// };
import React, { useState } from 'react';
import { Plus, Menu } from 'lucide-react';
import { SidebarProps } from '../types';

export const Sidebar: React.FC<SidebarProps> = ({ chats, onNewChat, user, onChatSelect }) => {
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div
      className={`h-screen bg-gray-100 border-r border-gray-300 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-300 flex flex-col">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">{user ? getInitials(user.name) : 'SA'}</span>
              </div>
              <span className="font-semibold">{user ? user.name : 'Super Agent'}</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {!collapsed && (
          <button
            onClick={onNewChat}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mt-2"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Chat list */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 px-3 py-2 font-semibold">Chats</div>
          {chats.length === 0 && (
            <div className="px-3 py-2 text-gray-400 text-sm">No chats yet</div>
          )}
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className="px-3 py-2 hover:bg-gray-200 rounded-lg cursor-pointer text-sm text-gray-700 truncate transition-colors"
            >
              {chat.title}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-300">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span>{user ? getInitials(user.name) : 'SS'}</span>
            </div>
            <span>{user ? user.name : 'Saravanamuthu S'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
