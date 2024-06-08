import fetch from 'node-fetch' // import fetch from 'node-fetch';
import { logDebug } from '../../utils/utils.js';

const HOST = process.env.PAAS_HOST || 'https://solver.planning.domains:5001';
const PATH = process.env.PAAS_PATH || '/package/lama-first/solve';

/**
 * @typedef { { parallel: boolean, action: string, args: string [] } } pddlPlanStep
 */


/**
 * @param {String} pddlDomain 
 * @param {String} pddlProblem 
 * @returns { Promise < pddlPlanStep [] > }
 */
export default async function onlineSolver(pddlDomain, pddlProblem) {
    var startTime = Date.now();
    var responseCheckUrl = await postRequest(pddlDomain, pddlProblem);
    logDebug(4, 'POST REQUEST IN ', Date.now() - startTime, 'ms');
    var json = await getResult(responseCheckUrl);
    logDebug(4, 'GET RESULT IN ', Date.now() - startTime, 'ms');
    var plan = parsePlan(json);
    logDebug(4, 'Plan found in', Date.now() - startTime, 'ms');
    return plan;
}


async function postRequest(pddlDomain, pddlProblem) {

    if (typeof pddlDomain !== 'string' && !pddlDomain instanceof String)
        throw new Error('pddlDomain is not a string');

    if (typeof pddlProblem !== 'string' && !pddlProblem instanceof String)
        throw new Error('pddlProblem is not a string');


    console.log('POSTING planning request to', HOST + PATH);

    var res = await fetch(HOST + PATH, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: pddlDomain, problem: pddlProblem, number_of_plans: "1" })
    })

    if (res.status != 200) {
        throw new Error(`Error at ${HOST + PATH} ${await res.text()}`);
    }

    var json = await res.json();

    if (!json.result) {
        console.log(res);
        throw new Error(`No value "result" from ${HOST + PATH} ` + res);
    }

    return HOST + json.result;
}


async function getResult(responseCheckUrl) {

    while (true) {

        let res = await fetch(responseCheckUrl, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (res.status != 200) {
            throw new Error(`Received HTTP error from ${HOST + res.result} ` + await res.text());
        }

        var json = await res.json();

        if (json.status == 'PENDING') {
            await new Promise((res, rej) => setTimeout(res, 100));
        }
        else
            break;
    }

    if (json.status != 'ok') {
        logDebug(4, json);
        throw new Error(`Invalid 'status' in response body from ${responseCheckUrl}`);
    }

    if (!json.result) {
        logDebug(4, json);
        throw new Error(`No 'result' in response body from ${responseCheckUrl}`);
    }

    if (! 'stdout' in json.result) {
        logDebug(4, json);
        throw new Error(`No 'result.stdout' in response from ${responseCheckUrl}`);
    }

    return json;
}


async function parsePlan(json) {
    /**@type {[string]}*/
    var lines = [];
    if (json.result.output.plan)
        lines = json.result.output.plan.split('\n');

    // PARSING plan from /package/dual-bfws-ffparser/solve
    if (json.result.stdout.split('\n').includes(' --- OK.')) {
        logDebug(3, 'Using parser for /package/dual-bfws-ffparser/solve');

        lines = lines.map(line => line.replace('(', '').replace(')', '').split(' '));
        lines = lines.slice(0, -1);
    } else if (json.result.output.sas_plan) {
        logDebug(3, 'Using parser for /package/lama-first/solve')
        // PARSING plan from /package/lama-first/solve
        if (json.result.output.sas_plan) {
            lines = json.result.output.sas_plan.split('\n');
            // Remove the last one
            lines = lines.slice(0, -2);
            lines = lines.map(line => line.replace('(', '').replace(')', '').split(' '));
        }
    } else {
        // ERROR
        logDebug(3, json);
        console.error('Plan not found!')
        return;
    }

    var plan = []

    logDebug(3, 'Plan found:')

    for (let /**@type {string}*/ line of lines) {

        logDebug(3, '- ' + line);

        // var number = line.shift()
        var action = line.shift()
        var args = line

        plan.push({ parallel: false/*number==previousNumber*/, action: action, args: args });
    }

    return plan;
}