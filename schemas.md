### user memory schema
```javascript
memory = {
    userID : [
        {
            key: "user",
            value: "Hello, how are you?",
            timestamp: 1717171717171
        },
        {
            key: "assistant",
            value: "I'm fine, thank you!",
            timestamp: 1717171717171
        }
    ]
}
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