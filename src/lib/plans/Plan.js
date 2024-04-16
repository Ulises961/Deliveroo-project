import Intention from "../intentions/Intention.js";

export default class Plan {

    // This is used to stop the plan
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }
    
    #name;
    get name () {
        return this.#name;
    }

    constructor ( name ) {
        this.#name = name;
    }

    stop () {
        console.log( 'stop plan and all sub intentions');
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }


    #sub_intentions = [];

    async subIntention ( desire, args ) {
        console.log('subIntention', desire, args);
        const sub_intention = new Intention( desire, [...args] );
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

