import Plan from '../Plan.js';
import client from '../../utils/client.js';

export default class RandomMove extends Plan {

    constructor() {
        super('go_random');
    }

    isApplicableTo(go_random) {
        return go_random == 'go_random';
    }

    async execute(go_random) {
        console.log('Executing RandomMove')
        let moves = 10
        while (moves > 0) {
            if (this.stopped) throw ['stopped']; // if stopped then quit
            const directions = ['up', 'down', 'left', 'right'];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            await client.move(direction);
            moves -= 1
        }
        if (this.stopped) throw ['stopped']; // if stopped then quit
        return true;
    }
}