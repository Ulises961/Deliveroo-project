import fs from 'fs';

export default class PddlProblem {
    
    static nextId = 0;

    constructor (name, domain="default", objects, init, goal) {
        this.name = 'problem-' + name + '-' + PddlProblem.nextId++;
        this.domain = domain;
        this.objects = objects;
        this.inits = init;
        this.goals = goal;
    }

    saveToFile () {
        var path = './tmp/'+this.name+'.pddl'
        
        return new Promise( (res, rej) => {

            fs.writeFile(path, this.toPddlString(), err => {
                if (err)
                    rej(err)
                else // console.log("File written successfully");
                    res(path)
            })

        })

    }

    toPddlString() {
        return `\
;; problem file: ${this.name}.pddl
(define (problem ${this.name})
    (:domain ${this.domain})
    (:objects ${this.objects})
    (:init ${this.inits})
    (:goal (${this.goals}))
)
`
    }

}
