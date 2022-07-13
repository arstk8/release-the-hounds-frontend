export class Status {
    static DOGS_INSIDE = new Status('Dogs Inside', 'Release')
    static DOGS_OUTSIDE = new Status('Dogs Outside', 'Bring In')

    constructor(description, actionDescription) {
        this.description = description
        this.actionDescription = actionDescription
    }
}
