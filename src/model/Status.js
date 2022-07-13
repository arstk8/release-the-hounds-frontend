export class Status {
    static DOGS_INSIDE = new Status('Dogs Inside')
    static DOGS_OUTSIDE = new Status('Dogs Outside')

    constructor(description) {
        this.description = description
    }

    toString() {
        return this.description
    }
}
