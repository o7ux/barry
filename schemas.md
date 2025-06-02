### user memory schema

```javascript
userMemory = {
  userID: {
    lastMessage: 171717171717
    messages: [
      {
        key: "user",
        value: "Hello, how are you?",
        timestamp: 1717171717171,
      },
      {
        key: "assistant",
        value: "I'm fine, thank you!",
        timestamp: 1717171717171,
      },
    ],
    conversation_summary: {
        first_message: 171717171717,
        topic_interests: [
            "money",
            "technology"
        ]
    }
  },
};
```

### blacklisted users schema

```javascript
blacklisted = [
    {
        id: 1717171717171,
        blacklisted: false
        infractions: 4
    },
    {
        id: 1717171717171,
        blacklisted: true
        infractions: 5
    }
]
```
