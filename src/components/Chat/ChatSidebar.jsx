import React, { useState } from 'react';

export default function ChatSidebar({ 
  chats, users, activeChat, setActiveChat, 
  startPrivateChat, createGroup 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChats = chats.filter(chat => {
    if (chat.type === 'group') {
      return chat.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return chat.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  const handleChatClick = (chat) => {
    setActiveChat({
      id: chat.chatId,
      type: chat.type,
      otherUserName: chat.otherUserName,
      otherUserAvatar: chat.avatarUrl,
      participantId: chat.type === 'private' ? chat.otherUserName : null
    });
  };

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3>Чаты</h3>
        <div className="chat-tabs">
          <button 
            className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            💬 Чаты ({chats.length})
          </button>
          <button 
            className={`chat-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Пользователи ({users.length})
          </button>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder="🔍 Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="create-group-btn" onClick={createGroup}>
          ➕ Создать группу
        </button>
      </div>
      
      <div className="chat-list">
        {activeTab === 'chats' ? (
          filteredChats.length === 0 ? (
            <div className="no-chats">Нет чатов</div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.chatId}
                className={`chat-item ${activeChat?.id === chat.chatId ? 'active' : ''}`}
                onClick={() => handleChatClick(chat)}
              >
                <div className="chat-avatar">
                  {chat.avatarUrl ? (
                    <img 
                      src={chat.avatarUrl} 
                      alt="avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    chat.type === 'group' ? '👥' : '👤'
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{chat.otherUserName}</div>
                  <div className="chat-last-message">{chat.lastMessage || 'Новое сообщение'}</div>
                </div>
              </div>
            ))
          )
        ) : (
          filteredUsers.length === 0 ? (
            <div className="no-chats">Пользователи не найдены</div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user.id}
                className="user-item"
                onClick={() => startPrivateChat(user.id, user.email)}
              >
                <div className="user-avatar-chat">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt="avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    user.email?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="user-info-chat">
                  <div className="user-name">{user.email}</div>
                  <div className="user-status">Написать сообщение</div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}