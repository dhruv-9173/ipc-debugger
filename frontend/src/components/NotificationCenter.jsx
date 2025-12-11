import { useEffect } from 'react'
import './NotificationCenter.css'

function NotificationCenter({ notifications }) {
  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        // This would require a removeNotification function in the store
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  if (notifications.length === 0) return null

  return (
    <div className="notification-center">
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.severity || 'info'}`}
        >
          <div className="notification-icon">
            {notification.severity === 'success' && '✅'}
            {notification.severity === 'error' && '❌'}
            {notification.severity === 'warning' && '⚠️'}
            {notification.severity === 'info' && 'ℹ️'}
            {!notification.severity && '📢'}
          </div>
          <div className="notification-content">
            <div className="notification-message">{notification.message}</div>
            {notification.timestamp && (
              <div className="notification-time">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
