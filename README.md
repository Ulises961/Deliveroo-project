# Deliveroo Autonomous Agent

The aim of the project is to develop an agent that plays autonomously the Deliveroo game.
It implements a BDI loop and decides over a set of possible plans to execute based on the state of the environment, including other game participants, strategy chosen and topology of the world perceived.

This project is created for the course "Autonomous Software Agents", UNITN, a.y. 2023/2024 by:

* [Ulises Emiliano Sosa](https://github.com/Ulises961)
* [Lorenzo Fumi](https://github.com/DeeJack)

## How to use

### Requirements

To run it requires a running environment of the [Deliveroo game](https://deliveroojs.onrender.com). You can also run the game locally by cloning the [repository](https://github.com/unitn-ASA/Deliveroo.js).

Software requirements include:

* NodeJS (developed on NodeJS v18.18.2): to run the code
* Git: to clone the repository

### Getting started

* Clone the repository: `git clone https://github.com/Ulises961/Deliveroo-project/`
* Enter the source code directory: `cd src`

### Configurations

Create a new file in the `src` directory called `.env`.
Insert the configuration options:

* `TOKEN=[VALUE]`, replacing "[VALUE]" with the token obtained from the Deliveroo.js site.
* `URL=[VALUE]`, where "[VALUE]" is for example `https://deliveroojs.onrender.com`

### Run the code

* Install the dependencies: `npm install`
* Launch the application: `npm run start`