import React, { useState } from 'react';

export default function GroupModal({ users, onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      alert('Введите название группы');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Выберите хотя бы одного участника');
      return;
    }
    onCreateGroup(groupName, selectedUsers);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Создать группу</h3>
        <input
          type="text"
          placeholder="Название группы"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="modal-input"
        />
        <div className="users-list-modal">
          <h4>Выберите участников:</h4>
          {users.map(user => (
            <label key={user.id} className="user-checkbox">
              <input
                type="checkbox"
                checked={!!selectedUsers.find(u => u.id === user.id)}
                onChange={() => toggleUser(user)}
              />
              {user.email}
            </label>
          ))}
        </div>
        <div className="modal-buttons">
          <button onClick={handleCreate} className="create-btn">Создать</button>
          <button onClick={onClose} className="cancel-btn">Отмена</button>
        </div>
      </div>
    </div>
  );
}