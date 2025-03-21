// Create notification sound
const notificationSound = new Audio('/notification.mp3');

export const playNotificationSound = () => {
  notificationSound.play().catch(error => {
    console.log('Error playing notification sound:', error);
  });
};

export const showNotification = (title, body) => {
  // Check if the browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return;
  }

  // Check if we already have permission
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
  // Otherwise, ask for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
}; 