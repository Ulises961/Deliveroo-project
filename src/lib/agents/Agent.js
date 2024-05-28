import Intention from '../intentions/Intention.js';
import { logDebug, updateMe } from '../utils/utils.js';

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
     * @param {{desire: string, args: [Object], score: number, id: string}} option the intention to be pushed
     */
    push(option) {
        // If the intention is already queued
        let sameIntention = this.intention_queue.find((i) => {
            return i.id === option.id
        });

        if (sameIntention) {
            // Update the score
            this.changeIntentionScore(option.desire, option.args, option.score, option.id);
            return;
        }
        logDebug(0, 'Pushing intention', option.desire, option.args, option.score, option.id, sameIntention)
        if (option.score < 0)
            return;
        
        const intention = new Intention(option.desire, option.args, option.score, option.id);
        this.intention_queue.push(intention);
        this.sortIntentions()
    }

    sortIntentions() {
        // Stop all intentions except the first one, in case they have started before discovering this new intention
        let currentIntention = this.intention_queue[0];

        // Remove intentions with negative score!
        this.intention_queue = this.intention_queue.filter(i => i.score >= 0);
        // Order the intentions by score (decreasing)
        this.intention_queue.sort((a, b) => b.score - a.score);

        if (currentIntention.id !== this.intention_queue[0].id && currentIntention.id === 'go_random' && this.intention_queue[0].id !== 'go_random') {
            // stop the last intention if the difference between the first one in the queue and the last intention is more than 10%
            if (currentIntention.score < this.intention_queue[0].score * 0.9) {
                logDebug(3, 'Stopping intention', currentIntention.desire, currentIntention.score, 'because of new intention', this.intention_queue[0].desire, this.intention_queue[0].score);
                currentIntention.stop();
            }
        }
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
            if (newScore === intention.score)
                return;
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
                    if (!fixedIntentions.includes(intention.desire)) {
                        this.intention_queue = this.intention_queue.filter(i => i.id !== intention.id);
                    }
                }

                // Start achieving intention
                const achieved = await intention.achieve()
                    // Catch eventual error and continue
                    .catch(async error => {
                        logDebug(0, 'Failed intention', intention.toString(), 'with error:', error);

                        if (intention.id === 'go_deliver') {
                            this.changeIntentionScore(intention.desire, [...intention.predicate], 0, intention.id);
                        } else if (intention.id === 'go_random') {
                            this.changeIntentionScore(intention.desire, [...intention.predicate], 1, intention.id);
                        }
                    });

                // Remove from the queue
                if (!fixedIntentions.includes(intention.desire))
                    this.intention_queue = this.intention_queue.filter(i => i.id !== intention.id);
                else
                    intention.stop();
            }

            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }
}

export default Agent;