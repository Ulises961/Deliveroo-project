import Intention from "../intentions/Intention.js";

export default class Plan {

    // This is used to stop the plan
    #stopped = false;
    get stopped() {
        return this.#stopped;
    }

    set stopped(value) {
        this.#stopped = value;
    }

    #name;
    get name() {
        return this.#name;
    }

    constructor(name) {
        this.#name = name;
    }

    stop() {
        for (const i of this.#sub_intentions) {
            i.stop();
        }
        this.#stopped = true;
    }


    #sub_intentions = [];

    async subIntention(desire, args, score, id) {
        const sub_intention = new Intention(desire, [...args], score, id);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

