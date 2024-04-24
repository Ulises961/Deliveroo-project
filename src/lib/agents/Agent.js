import Intention from '../intentions/Intention.js';
import client from '../utils/client.js';
import { updateMe } from '../utils/utils.js';

/**
 * Intention revision / execution loop
 */
class Agent {
    /**
     * @type {Array<Intention>} intention_queue the queue of intentions, ordered by score
     */
    intention_queue = new Array();

    constructor() {
    }
    count = 0;
    /**
     * Pushes a new intention to the queue
     * @param {{desire: string, args: [Object], score: number}} option the intention to be pushed
     */
    async push(option) {
        // If the intention is already queued
        let sameIntention = this.intention_queue.find((i) =>{
            return i.id === option.id
        });

        if (sameIntention) {
            // Update the score
            sameIntention.score = option.score;
            this.sortIntentions()
            return;
        }

        const intention = new Intention(option.desire, option.args, option.score, option.id);
        this.intention_queue.push(intention);

        // Check if already queued

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

    get intention_queue() {
        return this.intention_queue;
    }

    emptyIntentions() {
        return this.intention_queue = new Array();
    }

    changeIntentionScore(desire, args, newScore, id) {
        let intention = this.intention_queue.find((i) => i.id === id);
        if (intention) {
            intention.score = newScore;
        } else {
            this.push({ desire: desire, args: args, score: newScore, id: id });
        }
        this.sortIntentions()
    }

    async loop() {
        this.emptyIntentions(); // Empty intentions queue


        // Default intention, if there are no parcels or if the score for the others is negative, use this. 
        this.intention_queue.push(new Intention('go_random', [], 1, 'go_random'));
        this.intention_queue.push(new Intention('go_deliver', [], 0, 'go_deliver')); // Update score based on parcels held

     
        const fixedIntentions = ['go_random', 'go_deliver'];

        while (true) {
            // Consumes intention_queue if not empty
            if (this.intention_queue.length > 0) {
                // Current intention
                const intention = this.intention_queue[0];

                if (intention.score <= 0) {
                    console.log('AgentLoop. Skipping intention because no more valid', intention.desire)
                    if (!fixedIntentions.includes(intention.desire)) {
                        this.intention_queue = this.intention_queue.filter(i => i.id !== intention.id);
                    }
                }

                // Start achieving intention
                const achieved = await intention.achieve()
                // Catch eventual error and continue
                .catch(error => {
                    console.log('Failed intention', intention.predicate, 'with error:', error);
                });

                updateMe();
                
                // Remove failed intentions from the queue    
                if(!achieved){
                    console.log('Failed intention');
                    // this.intention_queue = this.intention_queue.filter(i => i.id !== intention.id);                    
                }
                // Remove from the queue
                if (!fixedIntentions.includes(intention.desire))
                    this.intention_queue = this.intention_queue.filter(i => i.id !== intention.id);
                // this.intention_queue.shift();
            }
            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }
}

export default Agent;