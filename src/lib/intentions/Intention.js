import {plans} from '../utils/utils.js';
/**
 * Intention
 */
export default class Intention extends Promise {

    #resolve;
    #reject;

    // Plan currently used for achieving the intention 
    #current_plan;
    
    // This is used to stop the intention
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }
    stop () {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if ( this.#current_plan)
            this.#current_plan.stop();
    }

    
    /**
     * #parent refers to caller
    */
   #parent;
   get parent(){
       return this.#parent;
   }

    /**
     * predicate is in the form {desire, parcel}
    */
    #predicate;
    get predicate () {
        return this.#predicate;
    }

    constructor ( parent, predicate ) {
        var resolve, reject;
        super( async (res, rej) => {
            resolve = res; reject = rej;
        } )
        this.#resolve = resolve
        this.#reject = reject
        this.#parent = parent;
        this.#predicate = predicate;
    }

    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve () {
        // Cannot start twice
        if ( this.#started)
            return this;
        else
            this.#started = true;
        console.log( 'Intention.achieve', this.parent, ...this.predicate);
        // Trying all plans in the library
        for (const planClass of plans) {
            console.log( 'Intention.plans', planClass.name, this.predicate, planClass.isApplicableTo( this.parent ) );

            // if stopped then quit
            if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

            // if plan is 'statically' applicable
            if ( planClass.isApplicableTo( this.parent ) ) {

                // plan is instantiated
                this.#current_plan = planClass;
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await this.#current_plan.execute( ...this.predicate );
                    this.log( 'succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', ...this.predicate,'with plan', planClass.name, 'with error:', ...error );
                }
            }

        }

        // if stopped then quit
        if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate ]
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