export default class ErrorExtended extends Error {
    constructor(name, message) {
        super(name, message)
        this.name = name;
        this.message = message;
    }
}
