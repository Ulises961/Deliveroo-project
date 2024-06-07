import { onlineSolver, Beliefset } from "@unitn-asa/pddl-client";
import PddlProblem from "./PddlProblem.js";
import { partner, map, me, validCells, getAgentsMap, isCellReachable, logDebug, updateMe } from "../../utils/utils.js";
import Plan from "../Plan.js";
import fs from 'fs';
import { getDirection, isCellAdjacent } from "./GoPartnerUtils.js";

let usedPaths = new Map();


export default class PathFinder extends Plan {
    domain = '';
    
    constructor() {
        super('find_path');
        this.domain = fs.readFileSync('./lib/plans/pddl/domain-path-find.pddl', 'utf-8');
    }

    isApplicableTo(desire) {
        return desire == 'find_path';
    }

    /**
     * Parse the action to get the from and to cells
     * @param {Object} action
     * @returns {Object} { from: { x, y }, to: { x, y } }
     */
    parseAction(action) {
        let args = action.args;
        let firstX = args[1].split('_')[0].substring(1);
        let firstY = args[1].split('_')[1];
        let secondX = args[2].split('_')[0].substring(1);
        let secondY = args[2].split('_')[1];
        let from = { x: parseInt(firstX), y: parseInt(firstY) };
        let to = { x: parseInt(secondX), y: parseInt(secondY) };
        return { from, to };
    }

    async execute(x, y, skipPartner) {
        if (isCellAdjacent(me, { x, y })) {
            let plan = [
                { action: getDirection(me, { x, y }), 
                    args: [
                        'me',
                        `t${me.x}_${me.y}`,
                        `t${x}_${y}`
                    ] }
            ]
            return plan;
        }

        if(me.x %1 != 0 || me.y %1 != 0) {
            await updateMe();
        }

        if(usedPaths.has(`${me.x} ${me.y} ${x} ${y}`)) {
            const path = usedPaths.get(`${me.x} ${me.y} ${x} ${y}`);
            logDebug(3, 'PathFinder: Reusing path', path, 'key', JSON.stringify([me.x, me.y, x, y]));
            return path;
        }
        
        /** Problem */
        const myBeliefset = new Beliefset();
        let filteredCells = validCells
            .filter(cell => !cell.fakeFloor)
            .filter(cell => isCellReachable(cell.x, cell.y))

        filteredCells.forEach(tile => {
            let directions = [
                { x: 1, y: 0, name: 'right' },
                { x: 0, y: 1, name: 'down' }
            ];
            directions.forEach(dir => {
                let newX = tile.x + dir.x;
                let newY = tile.y + dir.y;
                if (newX >= 0 && newX < map.length && newY >= 0 && newY < map[0].length && !map[newX][newY].fakeFloor && !this.isAgentInCell(newX, newY, skipPartner)) {
                    let neighbor = map[newX][newY];
                    myBeliefset.declare(`connected t${tile.x}_${tile.y} t${neighbor.x}_${neighbor.y}`);
                }
            });
        });

        getAgentsMap()
            .filter(agent => agent.id !== me.id && // Skip itself
                (!skipPartner || agent.id !== partner.id)) // If skipPartner is true, don't consider the partner
            .forEach(agent => {
                myBeliefset.declare(`occupied t${Math.ceil(agent.x)}_${Math.ceil(agent.y)}`);
            });


        if (me.x === null || me.y === null) 
            return []
        myBeliefset.declare(`at me t${me.x}_${me.y}`);
        myBeliefset.declare(`me me`);

        var pddlProblem = new PddlProblem(
            'path-finding',
            'path-find',
            myBeliefset.objects.join(' '),
            myBeliefset.toPddlString(),
            null
        );

        pddlProblem.goals = `at me t${x}_${y}`;
        let problem = pddlProblem.toPddlString();
        let plan = await onlineSolver(this.domain, problem);

        if (!plan) {
            return [];
        }

        // Set the direction for each move
        plan.forEach(action => {
            let parsedAction = this.parseAction(action);
            let direction = getDirection(parsedAction.from, parsedAction.to)
            action.action = direction;
        });

        usedPaths.set(`${me.x} ${me.y} ${x} ${y}`, plan);

        // Save all the parts of the path in the usedPaths
        for (let cell of plan) {
            let parsedAction = this.parseAction(cell);
            let key = `${parsedAction.from.x} ${parsedAction.from.y} ${parsedAction.to.x} ${parsedAction.to.y}`;
            if (!usedPaths.has(key)) {
                usedPaths.set(key, plan.slice(plan.indexOf(cell)));
            }
        }
        
        return plan;
    }

    /**
     * Check if an agent is in a cell, in case avoid it!
     */
    isAgentInCell(x, y, skipPartner) {
        const isInCell = getAgentsMap()
            .filter(agent => !skipPartner || agent.id !== partner.id)
            .find(agent => agent.x === x && agent.y === y)
        return !!isInCell;
    }
}