import {plans} from '../utils/utils.js';
/**
 * Intention
 */
export default class Intention extends Promise {

    #current_plan;
    stop () {
        console.log( 'stop intention and current plan');
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;

    constructor ( desire, ...args ) {
        var resolve, reject;
        super( async (res, rej) => {
            resolve = res; reject = rej;
        } )
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
    }

    #started = false;

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
    async achieve () {
        if ( this.#started ) {
            return this;
        }
        this.#started = true;

        for ( const plan of plans ) {
            if ( plan.isApplicableTo( this.#desire ) ) {
                this.#current_plan = plan;
                console.log(`Achieving ${this.#desire} with ${plan.constructor.name} and arguments ${this.#args.join(', ')}`);
                try {
                    const result = await plan.execute( ...this.#args );
                
                    if ( result ) {
                        this.#resolve( result );
                        return;
                    } else {
                        this.#reject( new Error( 'Plan failed' ) );
                    }
                } catch (error) {
                    this.#reject( new Error( 'Plan failed', error) );
                }
                
            }
        }
    }
}