/**
 * Intention
 */
class Intention extends Promise {

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
    async achieve () {
    }

}