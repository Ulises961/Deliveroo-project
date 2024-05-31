import Intention from "../intentions/Intention.js";

/**
 * Represents a plan that can be executed by the agent.
 * A plan can execute subintentions, which are plans themselves.
 * The main behavior is in the execute() method, which should be overridden by the subclasses.
 * The plan can be stopped with the stop() method, all the sub-intentions will be stopped as well.
 */
export default class Plan {
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

    /**
     * Stop the plan, and all the sub-intentions.
     */
    stop() {
        for (const i of this.#sub_intentions) {
            i.stop();
        }
        this.#stopped = true;
    }

    #sub_intentions = [];

    /**
     * Achieve a sub-intention.
     */
    async subIntention(desire, args, score, id) {
        const sub_intention = new Intention(desire, [...args], score, id);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }
}

