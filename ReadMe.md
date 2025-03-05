# CryptX
 A fullstack cryptocurrency exchange web application, follows the microservice architecture with upto 8 microservices containerized and run using docker containers, managed and orchestrated with docker compose. 

 
## Frontend
 ReactJs

 Vite

 vanilla-CSS

 Visualization with charts from react-chartjs-2, to display wallet distributions in pie chart and asset price tracking chart.

 Real Time updates

 State management using jotai and React Hooks

 Nested Layouts and navigations

 OAuth and custom login

 JWT for authorization and session management

 UI Design

 Responsive UI with support for multiple screen sizes
 

## Backend

 ### NodeJs Server/MongoDB/RabbitMQ/WebSockets/AI
  Primary server which handles login and user wallet related information. User information is stored in mongo db atlas database. A rabbit MQ message queue is used, where each time when a client makes a request to initiate account verification from the frontend by sending a request to the nodejs server, the server will push that request to a rabbit mq message queue, and a consumer asynchronous function pulls the verification request from the queue and handles it. There is also a seperate server written in nodejs for websocket server which handles the websocket connections used for real time tracking of user info and wallet info, order status and transaction completion status in real time and update and reflect the changes to all clients that are logged in. Definitely an overkill, we don't need websockets here, because we are not using two way communication, webhooks would have worked fine. Verfication handling process involves utilizing Document AI service from google's GCP. Document AI performs optical character recognition task, in our case, to process the user's submitted Id documents and after that document gets parsed using Document AI we make use of another AI service, ChatGPT specifically and use it's API to interact with it's LLM and perform verification where we submit the parsed document and some queries to verify if they are present or valid in the parsed document as prompt to the LLM and then let the AI do the verification and it's response is then used to set the verification status.

 ### Go Server/PostgresDB/Kafka
  Handles tasks specific to orders and transactions, stores all order related data in a postgres db, a separate go routine looks up matching buy and sell orders data from the postgres db's orders table to execute a transaction, essentially referred to as `orderMatching and execution engine` within the system internally. Fraud detection is implemented with kafka service with two different channels for two separate topics, orders and transactions, used to keep track of last 100 transactions and monitor new orders made by users to see if any order's price seems suspicious, as in significantly deviating from the price of last 100 transactions order price, if so we conclude it as some kind of market manipulating malicious activity and flag it. Every new transaction and order when made, produces a new entry and gets ingested into the respective kafka topic and it is monitored and processed in real time in parallel in separate go routines, in conjunction with server request handlers for orders related endpoints.
 
## How To Run

Install Docker

Each one of the Folders in the project root directory, contains code and dockerfile to build and run a container for that particular sub system of the entire project as a microservice.
To run we will use docker compose, it will manage and spin up our services or containers and also manages all the necessary configurations to make them all work together as cohesive unit. 

Some of the folders contain a .env.example file, whose environment variable values have to be populated with valid API Keys or other specific sensitive informations, which should be easy to be inferred and figure out by reading the variable names in these .env.example file as they are well named and clearly indicate what service are we using, and where to avail it, and get an api key for it. Here is a quick list of all services whose credentials are to be exposed in .env file.

Oauth service from Google GCP
DocumentAI service from Google GCP
OpenAI API Key
MongoDB atlas Connection String to the your MongoDB Atlas cluster, which you have to set up.

After populating all these .env.example file rename them all to .env .

With that you should be finally ready to run.

Run the following command in the project root directory

    docker compose up