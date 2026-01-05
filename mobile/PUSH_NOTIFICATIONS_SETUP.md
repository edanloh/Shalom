# Push Notifications Setup

## Initial Setup

1. Follow the guide here: https://docs.expo.dev/push-notifications/fcm-credentials/
2. Modify the app.json, refer to zaiqin-app.json
3. Create firebase app etc from the guide in step 1.
4. Push notifications only work in development build, not Expo Go

## Sending Push Notifications

**Requirements:** Push token

### Method 1: Using Expo Dashboard

1. Send using https://expo.dev/notifications

### Method 2: Using Expo Push Notification API

- **Endpoint:** `POST https://exp.host/--/api/v2/push/send`
- **Headers:**
  ```
  Accept: application/json
  Accept-encoding: gzip, deflate
  Content-Type: application/json
  ```
- **JSON Body Example:**
  ```json
  {
    "to": "ExponentPushToken[FTfAcNOGE-F40iJdbijiQA]",
    "sound": "default",
    "title": "New Course Available!",
    "body": "A new course has been added that we think you might like! Come and check it out now!",
    "data": {
      "screen": "HomeScreen",
      "courseId": "123"
    }
  }
  ```
