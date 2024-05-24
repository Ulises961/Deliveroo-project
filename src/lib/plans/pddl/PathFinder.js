import { onlineSolver, Beliefset } from "@unitn-asa/pddl-client";
import PddlProblem from "./PddlProblem.js";
import { agentsMap, map, me, parcels, validCells } from "../../utils/utils.js";
import Plan from "../Plan.js";
import fs from 'fs';

export default class PathFinder extends Plan {
    constructor() {
        super('find_path');
    }

    isApplicableTo(desire) {
        return desire == 'find_path';
    }

    readFile(path) {

        return new Promise((res, rej) => {

            fs.readFile(path, 'utf8', (err, data) => {
                if (err) rej(err)
                else res(data)
            })

        })

    }
    async execute(x, y) {
        let domain = await this.readFile('./lib/plans/pddl/domain-path-find.pddl');


        /** Problem */
        const myBeliefset = new Beliefset();
        validCells.forEach(tile => {
            myBeliefset.declare(`tile t${tile.x}_${tile.y}`);
            if (tile.delivery)
                myBeliefset.declare('delivery t' + x + '_' + y);
            let right = tile.x < map.length - 1 && !map[tile.x + 1][tile.y].fakeFloor ? map[tile.x + 1][tile.y] : null;
            if (right) {
                myBeliefset.declare(`right t${tile.x}_${tile.y} t${right.x}_${right.y}`)
            }
            let left = tile.x > 0 && !map[tile.x - 1][tile.y].fakeFloor ? map[tile.x - 1][tile.y] : null;
            if (left) {
                myBeliefset.declare(`left t${tile.x}_${tile.y} t${left.x}_${left.y}`)
            }
            let up = tile.y < map[0].length - 1 && !map[tile.x][tile.y + 1].fakeFloor ? map[tile.x][tile.y + 1] : null;
            if (up) {
                myBeliefset.declare(`up t${tile.x}_${tile.y} t${up.x}_${up.y}`)
            }
            let down = tile.y > 0 && !map[tile.x][tile.y - 1].fakeFloor ? map[tile.x][tile.y - 1] : null;
            if (down) {
                myBeliefset.declare(`down t${tile.x}_${tile.y} t${down.x}_${down.y}`)
            }
        });

        agentsMap.forEach(agent => {
            myBeliefset.declare(`agent agent_${agent.id}`);
            myBeliefset.declare(`at agent_${agent.id} t${Math.round(agent.x)}_${Math.round(agent.y)}`);
        });


        myBeliefset.declare(`at me t${me.x}_${me.y}`);
        myBeliefset.declare(`me me`);

        parcels.forEach(parcel => {
            myBeliefset.declare(`parcel t${parcel.x}_${parcel.y}`);
            if (parcel.carriedBy) {
                myBeliefset.declare(`not (free t${parcel.x}_${parcel.y})`);
            } else {
                myBeliefset.declare(`free t${parcel.x}_${parcel.y}`);
            }
        });


        var pddlProblem = new PddlProblem(
            'path-finding',
            'path-find',
            myBeliefset.objects.join(' '),
            myBeliefset.toPddlString(),
            null
        );

        pddlProblem.goals = `at me t${x}_${y}`;
        let problem = pddlProblem.toPddlString();
        let plan = await onlineSolver(domain, problem);
        if (!plan) {
            throw ['no plan found'];
        }
        return plan.map(p => p.action.toLowerCase());
    }
}