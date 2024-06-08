import { logDebug, plans } from '../utils/utils.js';
import Plan from '../plans/Plan.js';

/**
 * Represents an intention of the agent.
 * An intention is a desire that the agent wants to achieve.
 * The intention is achieved by executing a plan.
 * The intention can be stopped with the stop() method.
 * Each intention has a desire, an id, and a score.
 */
export default class Intention extends Promise {

    #resolve;
    #reject;
    /**
     * @type {number} the points assigned to this intention, used for sorting
     */
    #score

    /**
     * @type {number} the id used to identify an intention
     */
    #id

    /**
     * @type {Plan} the current plan that is being executed to achieve the intention
     */
    #current_plan;

    /**
     * @type {Boolean} if the intention has been stopped
     */
    #stopped = false;

    /**
     * @type {string} the desire that this intention is trying to achieve (e.g. 'go_random')
     */
    #desire;

    /**
     * @type {Array} the arguments for the intentions
     */
    #predicate;

    /**
     * @type {Boolean} if the intention has been started
     */
    #started = false;

    get stopped() {
        return this.#stopped;
    }

    stop() {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        this.#started = false;
        if (this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
    */
    get desire() {
        return this.#desire;
    }

    /**
     * predicate is in the form {desire, parcel}
    */
    get predicate() {
        return this.#predicate;
    }

    get score() {
        return this.#score;
    }

    set score(score) {
        this.#score = score;
    }

    get id() {
        return this.#id;
    }

    constructor(desire, predicate, score, id) {
        var resolve, reject;
        super(async (res, rej) => {
            resolve = res; reject = rej;
        })
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#predicate = predicate;
        this.#score = score;
        this.#id = id
    }

    toString() {
        return `Intention: { id: ${this.id}, desire: ${this.desire}, score: ${this.score} }`;
    }

    log(...args) {
        if (this.#desire && this.#desire.log) {
            this.#desire.log('\t', ...args)
        } else {
            logDebug(0, ...args)
        }
    }

    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {
        // Cannot start twice
        if (this.#started)
            return false;
        else {
            this.#stopped = false;
            this.#started = true;
        }
        // Trying all plans in the library
        for (const planClass of plans) {

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', this.desire];

            // if plan is applicable to the desire
            if (planClass.isApplicableTo(this.desire)) {

                // plan is instantiated
                this.#current_plan = planClass;

                // Achieve the plan
                const plan_res = await this.#current_plan.execute(...this.predicate);
                logDebug(0, 'succesful intention', planClass.name, 'with result:', plan_res);

                return plan_res
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        throw ['no plan satisfied the intention ', ...this.predicate]
    }
}