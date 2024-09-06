import { cmdError } from "../classes/errorOverride.js"
import { exists } from "../functions/util.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "blacklist"
        this.type = "dev"
        this.help = ".b blacklist [add|rem] [userid]"
    };
    async execute(msg, args) {
        let noArgs = new cmdError("Invalid arguments", "Please supply an argument.")
        if(!exists(args[0]) || !exists(args[1])) throw noArgs;
        try {
            let tempy = await this.client.users.fetch(args[0])
            if(!exists(tempy)){
                let tempy = await msg.guild.members.fetch(args[0])
                if(!exists(tempy)) throw new Error("unable to find user in cache")
            } 
            var idUser = tempy.username;
        } catch (e) {
            var idUser = "unknown_user"
        }
        switch(args[0]){
            case "rem":
                if(!this.client.blacklist.includes(args[1])) throw new cmdError("User not in blacklist.", "User not in blacklist.")
                try {
                    let tempy = new Array(this.client.blacklist)
                    tempy.forEach(x => {
                        if(x != args[0].toString()) tempy.push(args[0])
                    })
                    if(tempy.length == this.client.blacklist) throw new cmdError("Failed to remove user from blacklist", "Failed to remove user from blacklist");
                    else { msg.reply(`Successfully removed ${idUser} from blacklist`); this.client.blacklist = tempy }
                } catch(e) {
                    throw new cmdError(e.name, e.message)
                }
                break;
            case "add":
                if(this.client.blacklist.includes(args[1])) throw new cmdError("User already in blacklist.", "User already in blacklist.")
                try { 
                    this.client.blacklist.push(args[1]); 
                    msg.reply(`Successfully added ${idUser} to blacklist.`)
                } catch(e) { 
                    throw new cmdError(e.name, e.message)
                }
                break;
            default:
                throw noArgs
        }
    };
};