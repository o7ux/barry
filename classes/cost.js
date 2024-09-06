export class Cost {
    constructor(client) {
        this.client = client
    }
    async getSince(timestamp, log) {
        let cost = 0
        try {
            Object.keys(log).forEach(async (key) => {
                let value = log[key]
                if (parseInt(key) <= parseInt(timestamp)) return;
                cost += value
            })
        } catch {
            console.log("  [ERROR] Unable to get cost from log.")
            return null
        }
        return cost
    }
}