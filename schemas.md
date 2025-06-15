### user memory schema

```javascript
userMemory = {
  userID: {
    names: [user, nickname, nickname2, nickname3] //for user retrevial + search system. try different search patterns, on sucess, add name to names[] for easier retrevial next time
    forgetting: {
      lastForget: 171717171717,
      step: 0
    }
    messages: [  // purge short term memory overtime (forgetting)
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
    long_term_memory: {
      directives: [
        "do not call me dude"
      ],
      bits: [
        "the user makes minimum wage"
      ],
      overrides: [
        "barry should not call the user a dude"
      ],
      facts: [
        "the user owns a mazda miata"
        "the user works at arbys"
      ]
    }, // needs to be able to be accessed by external user's tool calls (user1: "user2 is happy" => user2's long term memory gets updated with "is happy"), reference names[]
    conversation_summary: {
        last_message: 171717171717,
        first_message: 171717171717,
        topic_interests: [
            "money",
            "technology"
        ]
    },
    sharedServers: {
      "serverID": "serverName"
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

### server memory schema

```javascript
serverMemory = {
  serverID: {
    serverName: [default, nickname, nickname2],
    barryNicknames: ["barry", "nickname1"]
    knownMembers: {
      "userID": [
        "username",
        "nickname1",
        "nickname2"
      ]
    },
    blacklistedWords: [
      "faggot",
      "nigger"
    ],
    rejectedMessages: [ //infer blacklisted words, need X sample size
      "barry is a nigger",
      "barry is not a nigger", //bingo
      "barry is a faggot",
      "barry is a fagot" //unknown
    ]
    memes: [
      "user1 is fat",
      "user2 types bad",
      "user3 shoots photography"
    ]
  }
}
