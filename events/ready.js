export default class {
    constructor(client) {
        this.client = client;
    }
    async execute() {
        this.client.user.setStatus("away")
        this.client.user.setActivity("with my balls", {
            type: "PLAYING"
        })
        this.client.utils.log(`[LOGIN] Logged into Discord as ${this.client.user.username}`, true)
    }

}
