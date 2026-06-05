import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, orderBy, arrayUnion, arrayRemove, 
  getDoc, setDoc 
} from 'firebase/firestore';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import GroupModal from './GroupModal';
import '../../styles/chat.css';

export default function Chat() {
  const { currentUser, userRole } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchChats();
      fetchAllUsers();
    }
  }, [currentUser]);

  async function fetchChats() {
    try {
      const userChatRef = doc(db, 'userChats', currentUser.uid);
      const unsubscribe = onSnapshot(userChatRef, async (docSnap) => {
        if (docSnap.exists()) {
          let userChats = docSnap.data().chats || [];
          
          // Для каждого чата пытаемся получить свежий аватар
          for (let i = 0; i < userChats.length; i++) {
            const chat = userChats[i];
            if (chat.type === 'private' && !chat.avatarUrl) {
              const chatIdParts = chat.chatId.split('_');
              const otherUserId = chatIdParts[0] === currentUser.uid ? chatIdParts[1] : chatIdParts[0];
              
              const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
              const otherUserAvatar = otherUserDoc.data()?.avatarUrl || null;
              
              if (otherUserAvatar) {
                userChats[i].avatarUrl = otherUserAvatar;
                await updateDoc(userChatRef, { chats: userChats });
              }
            }
          }
          
          setChats(userChats);
        } else {
          setChats([]);
        }
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      setLoading(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        avatarUrl: doc.data().avatarUrl || null
      })).filter(u => u.id !== currentUser.uid);
      setUsers(usersData);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  }

  async function startPrivateChat(userId, userEmail) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    const userAvatar = userData?.avatarUrl || null;
    
    const chatId = [currentUser.uid, userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const currentUserAvatar = currentUserDoc.data()?.avatarUrl || null;
    
    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        participants: [currentUser.uid, userId],
        participantNames: [currentUser.email, userEmail],
        participantAvatars: [currentUserAvatar, userAvatar],
        type: 'private',
        createdAt: new Date().toISOString(),
        lastMessage: '',
        lastMessageTime: new Date().toISOString()
      });
    }
    
    await addToUserChats(currentUser.uid, chatId, userEmail, 'private', userAvatar);
    await addToUserChats(userId, chatId, currentUser.email, 'private', currentUserAvatar);
    
    setActiveChat({ 
      id: chatId, 
      type: 'private', 
      participantId: userId, 
      otherUserName: userEmail,
      otherUserAvatar: userAvatar
    });
  }

  async function addToUserChats(userId, chatId, otherUserName, type, otherUserAvatar = null) {
    const userChatRef = doc(db, 'userChats', userId);
    const userChatDoc = await getDoc(userChatRef);
    
    const chatData = {
      chatId: chatId,
      otherUserName: otherUserName,
      type: type,
      lastMessage: '',
      updatedAt: new Date().toISOString()
    };
    
    if (otherUserAvatar) {
      chatData.avatarUrl = otherUserAvatar;
    }
    
    if (userChatDoc.exists()) {
      const existingChats = userChatDoc.data().chats || [];
      const chatExists = existingChats.some(c => c.chatId === chatId);
      
      if (!chatExists) {
        await updateDoc(userChatRef, {
          chats: arrayUnion(chatData)
        });
      }
    } else {
      await setDoc(userChatRef, {
        chats: [chatData]
      });
    }
  }

  async function createGroup(groupName, selectedUsers) {
    const groupId = `group_${Date.now()}`;
    const participants = [currentUser.uid, ...selectedUsers.map(u => u.id)];
    const participantNames = [currentUser.email, ...selectedUsers.map(u => u.email)];
    
    await setDoc(doc(db, 'chats', groupId), {
      participants: participants,
      participantNames: participantNames,
      type: 'group',
      groupName: groupName,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      lastMessage: '',
      lastMessageTime: new Date().toISOString()
    });
    
    for (const userId of participants) {
      await addToUserChats(userId, groupId, groupName, 'group');
    }
    
    alert('Группа успешно создана!');
  }

  async function deleteMessage(messageId, chatId, forEveryone = false) {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    if (forEveryone) {
      const messageDoc = await getDoc(messageRef);
      const messageData = messageDoc.data();
      const messageTime = new Date(messageData.timestamp).getTime();
      const timeDiff = Date.now() - messageTime;
      
      if (timeDiff <= 300000) {
        await deleteDoc(messageRef);
        alert('Сообщение удалено для всех');
      } else {
        alert('Удалить можно только в течение 5 минут');
      }
    } else {
      await updateDoc(messageRef, {
        deletedFor: arrayUnion(currentUser.uid)
      });
    }
  }

  async function clearChat(chatId) {
    if (!chatId) return;
    
    if (!window.confirm('Очистить всю переписку? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      const messagesQuery = query(collection(db, 'chats', chatId, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      let deletedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageDoc.id);
        await deleteDoc(messageRef);
        deletedCount++;
      }
      
      alert(`Очищено ${deletedCount} сообщений`);
    } catch (error) {
      console.error('Ошибка очистки:', error);
      alert('Ошибка при очистке чата: ' + error.message);
    }
  }

  async function reportUser(reportedUserId, reason) {
    try {
      const reportedUserDoc = await getDoc(doc(db, 'users', reportedUserId));
      const reportedUserData = reportedUserDoc.exists() ? reportedUserDoc.data() : {};
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const admins = usersSnapshot.docs.filter(doc => doc.data().role === 'admin');
      
      const reportData = {
        reportedUserId: reportedUserId,
        reportedUserEmail: reportedUserData.email || 'Неизвестно',
        reportedBy: currentUser.uid,
        reportedByEmail: currentUser.email,
        reason: reason,
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: `Пользователь ${currentUser.email} пожаловался на ${reportedUserData.email || reportedUserId} по причине: ${reason}`
      };
      
      const reportRef = await addDoc(collection(db, 'reports'), reportData);
      
      for (const admin of admins) {
        const adminId = admin.id;
        const notificationsRef = doc(db, 'notifications', adminId);
        const notificationsDoc = await getDoc(notificationsRef);
        
        const notification = {
          id: Date.now(),
          type: 'report',
          title: '⚠️ Новая жалоба!',
          message: `Пользователь ${currentUser.email} пожаловался на ${reportedUserData.email || reportedUserId}`,
          reason: reason,
          reportId: reportRef.id,
          createdAt: new Date().toISOString(),
          read: false,
          reportedBy: currentUser.email,
          reportedUser: reportedUserData.email || reportedUserId
        };
        
        if (notificationsDoc.exists()) {
          await updateDoc(notificationsRef, {
            list: arrayUnion(notification)
          });
        } else {
          await setDoc(notificationsRef, {
            list: [notification]
          });
        }
      }
      
      alert('Жалоба отправлена администратору');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при отправке жалобы');
    }
  }

  async function leaveGroup(chatId) {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      participants: arrayRemove(currentUser.uid),
      participantNames: arrayRemove(currentUser.email)
    });
    
    const userChatRef = doc(db, 'userChats', currentUser.uid);
    const userChatDoc = await getDoc(userChatRef);
    
    if (userChatDoc.exists()) {
      const updatedChats = (userChatDoc.data().chats || []).filter(c => c.chatId !== chatId);
      await updateDoc(userChatRef, {
        chats: updatedChats
      });
    }
    
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
    
    alert('Вы вышли из группы');
  }

  return (
    <div className="chat-container-full">
      <ChatSidebar
        chats={chats}
        users={users}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        startPrivateChat={startPrivateChat}
        createGroup={() => setShowGroupModal(true)}
        currentUser={currentUser}
      />
      {activeChat ? (
        <ChatWindow
          activeChat={activeChat}
          currentUser={currentUser}
          deleteMessage={deleteMessage}
          clearChat={clearChat}
          reportUser={reportUser}
          leaveGroup={leaveGroup}
          userRole={userRole}
        />
      ) : (
        <div className="chat-empty">
          <div className="chat-empty-icon">💬</div>
          <h3>Выберите чат</h3>
          <p>Начните общение с кем-нибудь из списка</p>
        </div>
      )}
      
      {showGroupModal && (
        <GroupModal
          users={users}
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={createGroup}
        />
      )}
    </div>
  );
}