import { useState, useEffect } from 'react'
import { getStoredUserIds, getCurrentUserId, getUserData, setCurrentUserId } from '../utils/userStorage'
import './UserList.css'

function UserList({ currentUserId, onSwitchUser }) {
  const [userIds, setUserIds] = useState([])

  useEffect(() => {
    setUserIds(getStoredUserIds())
  }, [currentUserId])

  const handleUserClick = (userId) => {
    if (userId === currentUserId) return
    const userData = getUserData(userId)
    if (userData) {
      setCurrentUserId(userId)
      onSwitchUser(userData)
    }
  }

  if (userIds.length === 0) return null

  return (
    <aside className="user-list" aria-label="유저 목록">
      <div className="user-list-title">유저</div>
      <ul className="user-list-ul">
        {userIds.map((id) => (
          <li key={id}>
            <button
              type="button"
              className={`user-list-item ${id === currentUserId ? 'user-list-item--current' : ''}`}
              onClick={() => handleUserClick(id)}
            >
              {id}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default UserList
