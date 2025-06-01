export default class {
    constructor(client) {
        this.client = client;
    }
    async execute(message) {
        if(!message || !message.content || !message.author) return;
        this.client.createClass.checkUpdate(message)
    }
}
