import {log, wait} from "../functions/util.js"

// issues with captcha on accepting friend request, not working. i do not plan to fix this.
export default class {
    constructor(client) {
        this.client = client;
    }
    async execute(userId) {
        let user = await this.client.users.fetch(userId)
        if (user.relationships != "PENDING_INCOMING") return;
        log(`  [AI] Received friend request from ${user.username}`)

        let waitTimer = (Math.floor(Math.random() * 10) + 1) * 1000;
        if (!this.client.debug) log(`  [AI] Waiting ${waitTimer / 1000} seconds before accepting.`, false)
        if (!this.client.debug) await wait(waitTimer)

        await user.sendFriendRequest()
            .then(x => {
                if (x) {
                    log(`  [AI] Accepted friend request from ${user.username}`)
                } else {
                    console.log(x)
                }
            })
            .catch(x => {
                console.error(x)
            })
    }
}






