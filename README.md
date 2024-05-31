# Deliveroo Autonomous Agent

The aim of the project is to develop an agent that plays autonomously the Deliveroo game.
It implements a BDI loop and decides over a set of possible plans to execute based on the state of the environment, including other game participants, strategy chosen and topology of the world perceived.

A PDDL planner has been used to perform path finding.

This project is created for the course "Autonomous Software Agents", UNITN, a.y. 2023/2024 by:

* [Ulises Emiliano Sosa](https://github.com/Ulises961)
* [Lorenzo Fumi](https://github.com/DeeJack)

## How to use

### Requirements

To run it requires a running environment of the [Deliveroo game](https://deliveroojs.onrender.com). You can also run the game locally by cloning the [repository](https://github.com/unitn-ASA/Deliveroo.js) and using the URL <http://locahost:8080/>.

Software requirements include:

* NodeJS (developed on NodeJS v18.18.2): to run the code
* Git: to clone the repository

### Getting started

* Clone the repository: `git clone https://github.com/Ulises961/Deliveroo-project/`
* Enter the source code directory: `cd Deliveroo-project/src`

### Configurations

Create a new file in the `src` directory called `.env`. A template file `.env-example` has been provided in the `src` directory.
Insert the configuration options:

* `TOKEN=[VALUE]`, replacing "[VALUE]" with the token obtained from the Deliveroo.js site.
* `URL=[VALUE]`, where "[VALUE]" is for example `https://deliveroojs.onrender.com`, or `http://locahost:8080/`
* Set `DEBUG=true` if you want to have console.logs about what the agent is doing.
* Set `DEBUG_LEVEL=3` to get console.logs with priority >= 3.
* You can choose to use either the PDDL planner or the "A*" algorithm for path finding by setting line 9 in the `index.js` file:
    `import './lib/plans/other/Library.js'`: for A*
    `import './lib/plans/other/Library.js'`: for PDDL planner.
* To use the planner, you need to add the following line to the `.env`:
    `PAAS_PATH='/package/dual-bfws-ffparser/solve'`
* If you are hosting the [planner yourself](https://github.com/AI-Planning/planning-as-a-service), set the planner's URL in the `.env`:
    `PAAS_HOST='http://localhost:5001'`

### Run the code

* Install the dependencies: `npm install`
* Launch the application: `npm run start`
* [OPTIONAL]: to have different tokens at the same time, you can add them all in the .env file with different names.
  Then, run an instance of the program with each of them by calling `node index.js key_name`, where "key_name" is the name assigned to the token in the ".env" file.
