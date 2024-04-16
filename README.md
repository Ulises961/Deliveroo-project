# Deliveroo Autonomous Agent
The aim of the project is to develop an agent that plays autonomously the Deliveroo game. 
It implements a BDI loop and decides over a set of possible plans to execute based on the 
state of the environment, including other game participants, strategy chosen and topology of the world perceived

## How to use

### Requirements 
To run it requires a running environment of the game [link: https://deliveroojs.onrender.com]

### Instructions
* Clone this repository
* Install dependencies
* In src/utils/client.js insert the url to the application of the first parameter of the config object of the Deliveroo object
* Inside the browser generate a new token on the application copy it and paste it into the second value of the Deliveroo object instantiation in the client.js file
* Launch the application by running in the command line in the root folder of the project (src/) ```node index.js```