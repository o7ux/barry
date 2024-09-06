export default class {
    constructor(client) {
        this.client = client;
    }
    async execute(msg) {
        this.client.messageCreateClass.checkUpdate(msg)
    }
}