export default class {
    constructor(client) {
        this.client = client
        this.name = "restart"
        this.help = ".b restart"
    };
    async execute(msg, args) {
         this.client.cleanShutdown()
    };
};
