import Intention from '../intentions/Intention.js';
import { parcels } from '../utils/utils.js';
/**
 * Intention revision / execution loop
 */
class Agent {
    /**
     * @param {Array} intention_queue the queue of intentions, ordered by score
     */
    intention_queue = new Array();

    constructor() {
    }

    /**
     * Pushes a new intention to the queue
     * @param {{desire: string, args: [Object], score: number}} option the intention to be pushed
     */
    async push(option) {
        // If the intention is already queued
        let sameIntention = this.intention_queue.find((i) => i.predicate.join(' ') === option.args.join(' ') && i.desire === option.desire);
        if (sameIntention) {
            // Update the score
            sameIntention.score = option.score;
            this.sortIntentions()
            return;
        }

        console.log('Agent.push', option);
        const intention = new Intention(option.desire, option.args, option.score);
        this.intention_queue.push(intention);

        // Check if already queued
        // const last = this.intention_queue.at(this.intention_queue.length - 1);
        // if (last) {
        //     last.stop();
        //     console.log('STOPPING LAST INTENTION')
        // }
        this.sortIntentions()
    }

    sortIntentions() {
        // Stop all intentions except the first one, in case they have started before discovering this new intention
        this.intention_queue.forEach(i => i.stop());
        // Remove intentions with negative score!
        this.intention_queue = this.intention_queue.filter(i => i.score >= 0);
        // Order the intentions by score (decreasing)
        this.intention_queue.sort((a, b) => b.score - a.score);
    }

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    emptyIntentions() {
        return this.#intention_queue = new Array();
    }

    changeIntentionScore(desire, args, newScore) {
        // TODO: this is not going to work for parcels, because the reward changes every time. Add an ID for the intention?
        let intention = this.intention_queue.find((i) => i.predicate.join(' ') === args.join(' ') && i.parent === desire);
        if (intention) {
            intention.score = newScore;
            console.log('Updated intention score', intention.predicate, intention.score)
        } else {
            this.push({ desire: desire, args: args, score: newScore });
            // this.intention_queue.push(new Intention(desire, args, newScore));
        }
        this.sortIntentions()
    }

    async loop() {
        this.emptyIntentions(); // Empty intentions queue

        // Default intention, if there are no parcels or if the score for the others is negative, use this. 
        this.#intention_queue.push(new Intention('go_random', [], 1));
        this.#intention_queue.push(new Intention('go_deliver', [], 0)); // Update score based on parcels held

        const fixedIntentions = ['go_random', 'go_deliver'];

        while (true) {
            // Consumes intention_queue if not empty
            if (this.intention_queue.length > 0) {
                // console.log('Agent.loop');

                // Current intention
                const intention = this.intention_queue[0];

                // Is queued intention still valid? Do I still want to achieve it?
                // TODO: Reasons to drop an intention:
                // - A new intention has a higher priority -> postpone
                // - The intention is no longer valid -> drop
                if (intention.score <= 0) {
                    console.log('Skipping intention because no more valid', intention.desire)
                    if (!fixedIntentions.includes(intention.desire))
                        this.intention_queue = this.#intention_queue.filter(i => i !== intention);
                    continue;
                }

                // TODO this hard-coded implementation is an example OLD CODE
                // let id = intention.predicate.id;
                // let p = parcels.get(id)
                // if (p && p.carriedBy) {
                //     console.log('Skipping intention because no more valid', intention.predicate.desire)
                //     continue;
                // }

                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        console.log(error)
                        console.log('Failed intention', ...intention.predicate, 'with error:', ...error)
                    });

                // Remove from the queue
                if (!fixedIntentions.includes(intention.desire))
                    this.intention_queue = this.#intention_queue.filter(i => i !== intention);
                // this.intention_queue.shift();
            }
            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }
}

export default Agent;