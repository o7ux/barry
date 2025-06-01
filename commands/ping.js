export default class {
    constructor(client) {
        this.client = client
        this.name = "ping"
        this.help = ".b ping"
    };
    async execute(msg, args) {
        msg.reply(`🏓 ${Date.now() - msg.createdTimestamp}ms`)
    };
};
