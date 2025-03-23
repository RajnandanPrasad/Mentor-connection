// Create audio element for notification sound
const notificationSound = new Audio('/notification.mp3');

export const playNotificationSound = () => {
  notificationSound.play().catch(error => {
    console.log('Error playing notification sound:', error);
  });
};

export const showNotification = (title, message) => {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/logo.png'
        });
      }
    });
  }
}; 