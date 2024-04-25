import Plan from './Plan.js';
import { me, map, euclideanDistance, getAgentsMap, validCells, updateAgentsMap, agentsMap } from '../utils/utils.js';
import client from '../utils/client.js';

export default class AStar extends Plan {
    constructor() {
        super('a_star');
    }

    isApplicableTo(desire) {
        return desire == 'a_star';
    }

    /**
     * Check if an agent is in a cell, in case avoid it!
     */
    isAgentInCell(x, y) {
        updateAgentsMap();
        const isInCell = getAgentsMap().find(agent => agent.x === x && agent.y === y)
        return !!isInCell;
    }

    /**
     * Get the neighbours of a cell
     * @param {Cell} cell
     * @returns {Cell[]} - The neighbours of the cell
     */
    getNeighbours(cell) {
        let neighbours = []
        // Sometimes the map is not loaded yet
        if (map.length == 0)
        return []
        if (cell.x > 0 && !map[cell.x - 1][cell.y].fakeFloor && !this.isAgentInCell(cell.x - 1, cell.y)) {
            neighbours.push(new Cell(cell.x - 1, cell.y))
        }
        if (cell.x < map.length - 1 && !map[cell.x + 1][cell.y].fakeFloor && !this.isAgentInCell(cell.x + 1, cell.y)) {
            neighbours.push(new Cell(cell.x + 1, cell.y))
        }
        if (cell.y > 0 && !map[cell.x][cell.y - 1].fakeFloor && !this.isAgentInCell(cell.x, cell.y - 1)) {
            neighbours.push(new Cell(cell.x, cell.y - 1))
        }
        if (cell.y < map[0].length - 1 && !map[cell.x][cell.y + 1].fakeFloor && !this.isAgentInCell(cell.x, cell.y + 1)) {
            neighbours.push(new Cell(cell.x, cell.y + 1))
        }

        return neighbours
    }

    /**
     * Reconstruct the path from the cameFrom map
     */
    reconstructPath(cameFrom, current) {
        let totalPath = [current]
        while (cameFrom.has(current)) {
            current = cameFrom.get(current)
            totalPath.unshift(current)
        }
        return totalPath
    }

    /**
     * Execute the A* algorithm
     * @param {number} x - The x coordinate of the destination
     * @param {number} y - The y coordinate of the destination
     */
    async execute(x, y) {
        let promise = new Promise(res => client.onYou(res))
        // Wait for the client to update the agent's position
        if (me.x % 1 != 0 || me.y % 1 != 0)
            await promise
        let agentPosition = { x: me.x, y: me.y }

        let closedSet = new Set(); // Add this line

        let queue = [new Cell(x, y)]
        let cameFrom = new Map()

        let gScore = new Map()
        gScore.set(queue[0], 0)

        let fScore = new Map()
        fScore.set(queue[0], euclideanDistance(queue[0], new Cell(agentPosition.x, agentPosition.y)))

        const MAX_SIZE = validCells.length;
        while (queue.length > 0 && queue.length < MAX_SIZE) {
            let current = queue[0]
            if (current.x == agentPosition.x && current.y == agentPosition.y) {
                return this.reconstructPath(cameFrom, current)
            }

            queue = queue.slice(1)
            closedSet.add(current.toString())

            for (let neighbour of this.getNeighbours(current)) {
                let tentativeGScore = gScore.get(current) + 1

                if (tentativeGScore < (gScore.get(neighbour) || Number.MAX_VALUE)) {
                    cameFrom.set(neighbour, current)
                    gScore.set(neighbour, tentativeGScore)
                    fScore.set(neighbour, gScore.get(neighbour) + euclideanDistance(neighbour, new Cell(agentPosition.x, agentPosition.y)))

                    if (!includesNeighbour(queue,neighbour) && !closedSet.has(neighbour.toString())) {
                        queue.push(neighbour)
                    }
                }
            }

            queue.sort((a, b) => fScore.get(a) - fScore.get(b))
            await new Promise(res => setImmediate(res));
        }
        return []
    }

}

function includesNeighbour(queue, neighbour) {
    return queue.some(cell => cell.x === neighbour.x && cell.y === neighbour.y);
}

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `${this.x},${this.y}`; // Add this method
    }
}