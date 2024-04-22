import { plans, updateMe } from '../utils/utils.js';
/**
 * Intention
 */
export default class Intention extends Promise {

    #resolve;
    #reject;
    /**
     * @type {number} the points assigned to this intention
     */
    #score
    
    /**
     * @type {number} the id assigned to this intention
     */
    #id

    /**
     * @type {Plan} the current plan that is being executed
     */
    #current_plan;

    /**
     * @type {Boolean} if the intention has been stopped
     */
    #stopped = false;

    /**
     * @type {string} the desire that this intention is trying to achieve
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
        if (this.#desire && this.#desire.log)
            this.#desire.log('\t', ...args)
        else
            console.log(...args)
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
        console.log('Intention.achieve', this.desire);
        // Trying all plans in the library
        for (const planClass of plans) {
            // console.log( 'Intention.plans', planClass.name, this.predicate, planClass.isApplicableTo( this.parent ) );

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', this.desire];

            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(this.desire)) {

                // plan is instantiated
                this.#current_plan = planClass;
                this.log('achieving intention',  planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await this.#current_plan.execute(...this.predicate);
                    this.log('succesful intention',  planClass.name, 'with result:', plan_res);
                    updateMe();
                    console.log("--------------------------------------------------------------------------------------\n\n\n\n");
                    
                    return plan_res
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    console.log(error)
                    this.log('failed intention', ...this.predicate, 'with plan', planClass.name, 'with error:', ...error);
                    return false;
                }
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate]
    }



    /**
     * TODO:
     * Go through the plans library and find the plan that:
     * 1. Is applicable to the desire
     * 2. Has the highest priority
     * 3. Can achieve the desire
     * 4. Execute the plan
     * 5.a If the plan fails, try the next plan
     * 5.b If the plan fails, insist on the intention
     * 6. If all plans fail, reject the intention
     * 7. If the plan succeeds, resolve the intention
     */
}