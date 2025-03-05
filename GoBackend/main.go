package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"mymodule/db"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/confluentinc/confluent-kafka-go/kafka"
	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // Import PostgreSQL driver
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Transaction struct {
	Price float64 `json:"price"`
}

var recentTransactions []Transaction
var mutex sync.Mutex

// Order represents a simplified order structure for demonstration
type Order struct {
	ID     int
	Type   string
	Amount float64
	Price  float64
	Crypto string
	UserId string
}

type IngestedOrderForFraudDetection struct {
	ID     string  `json:"id"`
	Price  float64 `json:"price"`
	Amount float64 `json:"amount"`
}

type OrderStruct struct {
	Market string  `json:"market"`
	Price  float64 `json:"price"`
	Amount float64 `json:"amount"`
	Type   string  `json:"type"`
}
type ActiveOrder struct {
	OrderID     int     `json:"orderID"`
	UserID      string  `json:"userID"`
	OrderType   string  `json:"orderType"`
	OrderCrypto string  `json:"orderCrypto"`
	Amount      float64 `json:"amount"`
	CreatedDate string  `json:"createdDate"`
	OrderPrice  float64 `json:"orderPrice"`
}

type FulfilledOrder struct {
	OrderID         int     `json:"orderID"`
	UserID          string  `json:"userID"`
	OrderType       string  `json:"orderType"`
	OrderCrypto     string  `json:"orderCrypto"`
	Amount          float64 `json:"amount"`
	FulfillmentDate string  `json:"fulfillmentDate"`
	OrderPrice      float64 `json:"orderPrice"`
}

func subscribeWithRetry(c *kafka.Consumer, topics []string) error {
	for {
		err := c.SubscribeTopics(topics, nil)
		if err != nil {
			log.Printf("Failed to subscribe to topics: %v, retrying in 5 seconds...\n", err)
			time.Sleep(5 * time.Second)
			continue
		}
		log.Printf("Subscribed to topics: %v\n", topics)
		return nil
	}
}

func startTransactionConsumer() {
	var c *kafka.Consumer
	var err error
	maxRetries := 5
	retries := 0
	for retries < maxRetries {
		c, err = kafka.NewConsumer(&kafka.ConfigMap{
			"bootstrap.servers": "kafka:9092",
			"group.id":          "transaction-group",
			"auto.offset.reset": "earliest",
		})
		if err != nil {
			fmt.Printf("Error initializing Kafka consumer: %v\n", err)
			fmt.Println("Retrying...")
			retries++
			time.Sleep(5 * time.Second) // Wait before retrying
		} else {
			fmt.Println("Kafka consumer initialized successfully.")
			break
		}
	}

	if retries == maxRetries {
		panic("Failed to initialize Kafka consumer after max retries.")
	}
	log.Println("Kafka consumer created successfully")
	subscribeWithRetry(c, []string{"transactions-topic"})
	run := true
	for run {
		msg, err := c.ReadMessage(-1)
		if err == nil {
			var transaction Transaction
			json.Unmarshal(msg.Value, &transaction)
			mutex.Lock()
			recentTransactions = append(recentTransactions, transaction)
			if len(recentTransactions) > 100 {
				recentTransactions = recentTransactions[1:]
			}
			mutex.Unlock()
			// Commit the message offset after processing
			_, commitErr := c.CommitMessage(msg)
			if commitErr != nil {
				fmt.Printf("Failed to commit message: %v\n", commitErr)
			}
		} else {
			fmt.Printf("Consumer error: %v (%v)\n", err, msg)
		}
	}

	c.Close()
}

func getRecentTransactions() []Transaction {
	mutex.Lock()
	defer mutex.Unlock()
	return recentTransactions
}

func detectFraud(order IngestedOrderForFraudDetection, recentTransactions []Transaction) {
	var sum float64
	for _, tx := range recentTransactions {
		sum += tx.Price
	}
	averagePrice := sum / float64(len(recentTransactions))
	isLargeOrder := order.Amount > 1000
	isSignificantDeviation := math.Abs(order.Price-averagePrice)/averagePrice > 0.1

	if isLargeOrder && isSignificantDeviation {
		fmt.Printf("Fraud detected for order %s\n", order.ID)
		// Handle fraud (e.g., flag the order, notify admins, etc.)
	}
}

func startOrderConsumer() {
	var c *kafka.Consumer
	var err error
	maxRetries := 5
	retries := 0
	for retries < maxRetries {
		c, err = kafka.NewConsumer(&kafka.ConfigMap{
			"bootstrap.servers": "kafka:9092",
			"group.id":          "transaction-group",
			"auto.offset.reset": "earliest",
		})
		if err != nil {
			fmt.Printf("Error initializing Kafka consumer: %v\n", err)
			fmt.Println("Retrying...")
			retries++
			time.Sleep(5 * time.Second) // Wait before retrying
		} else {
			fmt.Println("Kafka consumer initialized successfully.")
			break
		}
	}

	if retries == maxRetries {
		panic("Failed to initialize Kafka consumer after max retries.")
	}

	log.Println("Kafka consumer created successfully")

	subscribeWithRetry(c, []string{"orders-topic"})
	run := true
	for run {
		msg, err := c.ReadMessage(-1)
		if err == nil {
			var order IngestedOrderForFraudDetection
			json.Unmarshal(msg.Value, &order)
			recentTransactions := getRecentTransactions()
			detectFraud(order, recentTransactions)
			// Commit the message offset after processing
			_, commitErr := c.CommitMessage(msg)
			if commitErr != nil {
				fmt.Printf("Failed to commit message: %v\n", commitErr)
			}
		} else {
			fmt.Printf("Consumer error: %v (%v)\n", err, msg)
		}
	}

	c.Close()
}

func createProducer() (*kafka.Producer, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": "kafka:9092",
	})
	if err != nil {
		return nil, err
	}
	return p, nil
}

func produceTransactionMessage(p *kafka.Producer, transaction Transaction) error {
	transactionJSON, err := json.Marshal(transaction)
	if err != nil {
		return err
	}
	topic := "transactions-topic"
	message := kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value:          transactionJSON,
	}
	err = p.Produce(&message, nil)
	if err != nil {
		return err
	}
	return nil
}

func produceOrderMessage(p *kafka.Producer, order IngestedOrderForFraudDetection) error {
	orderJSON, err := json.Marshal(order)
	if err != nil {
		return err
	}
	topic := "orders-topic"
	message := kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value:          orderJSON,
	}
	err = p.Produce(&message, nil)
	if err != nil {
		return err
	}
	return nil
}

func startOrderMatchingEngine(postgresDB *sql.DB, mongoClient *mongo.Client) {
	producer, err := createProducer()
	if err != nil {
		fmt.Println("Error creating Kafka producer:", err)
		return
	}
	defer producer.Close()
	for {
		// Fetch all buy orders from the database
		buyOrders, err := fetchBuyOrders(postgresDB)
		if err != nil {
			fmt.Println("Error fetching buy orders:", err)
			continue
		}

		// Fetch all sell orders from the database
		sellOrders, err := fetchSellOrders(postgresDB)
		if err != nil {
			fmt.Println("Error fetching sell orders:", err)
			continue
		}

		// Match and execute orders
		for _, buyOrder := range buyOrders {
			for i, sellOrder := range sellOrders {
				if (buyOrder.Price == sellOrder.Price) && (buyOrder.Crypto == sellOrder.Crypto) && (buyOrder.UserId != sellOrder.UserId) {
					err := makeTransaction(postgresDB, mongoClient, buyOrder, sellOrder)
					if err != nil {
						fmt.Println("Error processing transaction:", err)
					} else {
						transaction := Transaction{
							Price: buyOrder.Price,
						}
						err = produceTransactionMessage(producer, transaction)
						if err != nil {
							fmt.Println("Error producing transaction message:", err)
						}

						if err := deleteOrder(postgresDB, sellOrder.ID); err != nil {
							fmt.Println("Error deleting sell order:", err)
						} else {
							// Remove the sell order from the slice
							sellOrders = append(sellOrders[:i], sellOrders[i+1:]...)
						}

						if err := deleteOrder(postgresDB, buyOrder.ID); err != nil {
							fmt.Println("Error deleting buy order:", err)
						} else {
							// Remove the buy order from the slice
							buyOrders = buyOrders[1:]
						}
					}
					break
				}
			}
		}

		// Wait for a while before checking again
		time.Sleep(time.Second * 5)
	}
}

func deleteOrder(postgresDB *sql.DB, orderId int) error {
	_, err := postgresDB.Exec("DELETE FROM crypto.orders WHERE order_id = $1", orderId)
	return err
}
func fetchBuyOrders(postgresDB *sql.DB) ([]Order, error) {
	// Query to fetch buy orders from the database
	query := `
        SELECT order_id, order_type, amount, order_price,order_crypto,user_id
        FROM crypto.orders
        WHERE order_type = 'buy'
    `

	// Execute the query and fetch the rows
	rows, err := postgresDB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Iterate through the rows and populate the buyOrders slice
	var buyOrders []Order
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.Type, &order.Amount, &order.Price, &order.Crypto, &order.UserId); err != nil {
			return nil, err
		}
		buyOrders = append(buyOrders, order)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buyOrders, nil
}

func fetchSellOrders(postgresDB *sql.DB) ([]Order, error) {
	// Query to fetch sell orders from the database
	query := `
        SELECT order_id, order_type, amount, order_price,order_crypto,user_id
        FROM crypto.orders
        WHERE order_type = 'sell'
    `

	// Execute the query and fetch the rows
	rows, err := postgresDB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Iterate through the rows and populate the sellOrders slice
	var sellOrders []Order
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.Type, &order.Amount, &order.Price, &order.Crypto, &order.UserId); err != nil {
			return nil, err
		}
		sellOrders = append(sellOrders, order)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return sellOrders, nil
}

func makeTransaction(postgresDB *sql.DB, mongoClient *mongo.Client, buyOrder, sellOrder Order) error {
	var postgresTx *sql.Tx
	var rollbackPostgres bool
	// Fetch buyer's crypto wallet info
	buyerFiatAmount, buyerCryptoWallet, err := db.FetchUserFiatWalletFieldAndCryptoField(mongoClient, buyOrder.UserId, buyOrder.Crypto)
	if err != nil {
		fmt.Println("Error while calling FetchUserFiatWalletFieldAndCryptoField (buyer)", err)
		return err
	}

	// Fetch seller's crypto wallet info
	sellerFiatAmount, sellerCryptoWallet, err := db.FetchUserFiatWalletFieldAndCryptoField(mongoClient, sellOrder.UserId, sellOrder.Crypto)
	if err != nil {
		fmt.Println("Error while calling FetchUserFiatWalletFieldAndCryptoField (seller)", err)
		return err
	}

	// Deduct crypto from seller's wallet and add to buyer's wallet
	amountToTransfer := buyOrder.Amount
	if amountToTransfer > sellOrder.Amount {
		// Seller doesn't have enough crypto to fullfill buyers demand, transfer all available
		amountToTransfer = sellOrder.Amount
		remainingAmount := buyOrder.Amount - amountToTransfer

		postgresTx, err = postgresDB.Begin()
		if err != nil {
			return fmt.Errorf("failed to start Postgres transaction: %v", err)
		}
		_, err = postgresTx.Exec("INSERT INTO crypto.orders (user_id, order_crypto, order_type, amount, order_price) VALUES ($1, $2, $3, $4, $5)",
			buyOrder.UserId, buyOrder.Crypto, "buy", remainingAmount, buyOrder.Price)
		if err != nil {
			postgresTx.Rollback()
			fmt.Println("Error while inserting remaining amount order for buyer", err)
			return err
		}

		fmt.Printf("Created new buy order for remaining amount: %f crypto\n", remainingAmount)
		buyOrder.Amount = amountToTransfer
	}

	if amountToTransfer < sellOrder.Amount {
		//Buyer can't fulfill the demand of the seller so the seller transfers buyer demand and creates a new sell order
		amountToTransfer = buyOrder.Amount
		remainingAmount := sellOrder.Amount - amountToTransfer

		if postgresTx == nil {
			postgresTx, err = postgresDB.Begin()
			if err != nil {
				return fmt.Errorf("failed to start Postgres transaction: %v", err)
			}
		}
		_, err = postgresTx.Exec("INSERT INTO crypto.orders (user_id, order_crypto, order_type, amount, order_price) VALUES ($1, $2, $3, $4, $5)",
			sellOrder.UserId, sellOrder.Crypto, "sell", remainingAmount, sellOrder.Price)
		if err != nil {
			postgresTx.Rollback()
			fmt.Println("Error while inserting remaining amount order for seller", err)
			return err
		}

		fmt.Printf("Created new sell order for remaining amount: %f crypto\n", remainingAmount)
		sellOrder.Amount = amountToTransfer
	}

	// Update crypto wallets
	buyerCryptoWallet += amountToTransfer
	sellerCryptoWallet -= amountToTransfer

	// Update fiat wallets
	buyerFiatAmount -= amountToTransfer * buyOrder.Price
	sellerFiatAmount += amountToTransfer * sellOrder.Price

	session, err := mongoClient.StartSession()
	if err != nil {
		if postgresTx != nil {
			postgresTx.Rollback()
		}
		return fmt.Errorf("failed to start MongoDB session: %v", err)
	}
	defer session.EndSession(context.Background())

	// Define context with a timeout to ensure the transaction does not hang indefinitely
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Execute the transaction
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		if err := session.StartTransaction(); err != nil {
			return fmt.Errorf("failed to start transaction: %v", err)
		}

		err = db.UpdateUserFiatWallet(sc, mongoClient, buyOrder.UserId, buyerFiatAmount)
		if err != nil {
			session.AbortTransaction(sc)
			fmt.Println("Error while calling UpdateUserFiatWallet (buyer)", err)
			return err
		}
		err = db.UpdateUserFiatWallet(sc, mongoClient, sellOrder.UserId, sellerFiatAmount)
		if err != nil {
			session.AbortTransaction(sc)
			fmt.Println("Error while calling UpdateUserFiatWallet (seller)", err)
			return err
		}
		err = db.UpdateUserCryptoWallet(sc, mongoClient, buyOrder.UserId, buyOrder.Crypto, buyerCryptoWallet)
		if err != nil {
			session.AbortTransaction(sc)
			fmt.Println("Error while calling UpdateUserCryptoWallet (buyer)", err)
			return err
		}
		err = db.UpdateUserCryptoWallet(sc, mongoClient, sellOrder.UserId, sellOrder.Crypto, sellerCryptoWallet)
		if err != nil {
			session.AbortTransaction(sc)
			fmt.Println("Error while calling UpdateUserCryptoWallet (seller)", err)
			return err
		}

		// Commit the transaction
		if err := session.CommitTransaction(sc); err != nil {
			session.AbortTransaction(sc)
			return fmt.Errorf("failed to commit transaction: %v", err)
		}

		return nil
	})

	if err != nil {
		if postgresTx != nil {
			rollbackPostgres = true
		}
		fmt.Println("Transaction error:", err)
	}

	if rollbackPostgres && postgresTx != nil {
		postgresTx.Rollback()
		return fmt.Errorf("transaction failed and rolled back Postgres operations: %v", err)
	}

	if postgresTx != nil {
		err = postgresTx.Commit()
		if err != nil {
			return fmt.Errorf("failed to commit Postgres transaction: %v", err)
		}
	}

	// Convert the buyOrder struct to a JSON byte slice
	buyOrderJSON, err := json.Marshal(buyOrder)
	if err != nil {
		return err
	}
	// Create a new buffer with the JSON data
	buyOrderbuffer := bytes.NewBuffer(buyOrderJSON)
	_, err = http.Post("http://localhost:8080/createFullfilledOrders", "application/json", buyOrderbuffer)
	if err != nil {
		fmt.Println("Error while making post request to createFullfilledOrders endpoint (buyer)", err)
		return err
	}
	// Convert the buyOrder struct to a JSON byte slice
	sellOrderJSON, err := json.Marshal(sellOrder)
	if err != nil {
		return err
	}
	// Create a new buffer with the JSON data
	sellOrderbuffer := bytes.NewBuffer(sellOrderJSON)
	_, err = http.Post("http://localhost:8080/createFullfilledOrders", "application/json", sellOrderbuffer)
	if err != nil {
		fmt.Println("Error while making post request to createFullfilledOrders endpoint (seller)", err)
		return err
	}
	return nil
}

func createOrder(postgresDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract the username from the authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte("potato"), nil // Use the same secret key used for signing the JWT
		})
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		username := claims["username"].(string)
		// Parse the request data (assuming JSON)
		var order OrderStruct
		err = json.NewDecoder(r.Body).Decode(&order)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Begin a transaction
		tx, err := postgresDB.Begin()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Defer a rollback if there's an error
		defer func() {
			if err != nil {
				tx.Rollback()
				return
			}
			// Commit the transaction if there's no error
			err = tx.Commit()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}()

		// Perform database operations
		// _, err = tx.Exec("INSERT INTO crypto.orders (user_id, order_crypto, order_type, amount,order_price) VALUES ($1, $2, $3, $4,$5)", username, order.Market, order.Type, order.Amount,order.Price)
		// Perform database operations and return the ID of the new order
		var orderID string
		err = tx.QueryRow("INSERT INTO crypto.orders (user_id, order_crypto, order_type, amount, order_price) VALUES ($1, $2, $3, $4, $5) RETURNING order_id", username, order.Market, order.Type, order.Amount, order.Price).Scan(&orderID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Create and produce the order message
		producer, err := createProducer()
		if err != nil {
			http.Error(w, "Error creating Kafka producer", http.StatusInternalServerError)
			return
		}
		defer producer.Close()

		ingestedOrder := IngestedOrderForFraudDetection{
			ID:     orderID,
			Price:  order.Price,
			Amount: order.Amount,
		}
		err = produceOrderMessage(producer, ingestedOrder)
		if err != nil {
			http.Error(w, "Error producing Kafka message", http.StatusInternalServerError)
			return
		}

		// Return a success response
		w.WriteHeader(http.StatusCreated)
		fmt.Fprintf(w, "Order created successfully!")
	}
}

func createFulfilledOrder(postgresDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		// Parse the request data (assuming JSON)
		var order Order
		err := json.NewDecoder(r.Body).Decode(&order)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Perform database operations
		_, err = postgresDB.Exec("INSERT INTO crypto.fulfilled_orders (user_id, order_crypto, order_type, amount,order_price) VALUES ($1, $2, $3, $4, $5)", order.UserId, order.Crypto, order.Type, order.Amount, order.Price)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Return a success response
		w.WriteHeader(http.StatusCreated)
		fmt.Fprintf(w, "Order created successfully!")
	}
}
func fetchActiveAndFulfilledOrders(postgresDB *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract the username from the authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte("potato"), nil // Use the same secret key used for signing the JWT
		})
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		username := claims["username"].(string)

		// Fetch active orders from crypto.orders table
		activeOrders, err := fetchActiveOrdersForUser(postgresDB, username)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch fulfilled orders from crypto.fulfilled_orders table
		fulfilledOrders, err := fetchFulfilledOrdersForUser(postgresDB, username)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Combine active and fulfilled orders into a single response
		response := struct {
			ActiveOrders    []ActiveOrder    `json:"activeOrders"`
			FulfilledOrders []FulfilledOrder `json:"fulfilledOrders"`
		}{
			ActiveOrders:    activeOrders,
			FulfilledOrders: fulfilledOrders,
		}

		// Convert the response to JSON and send it
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

func fetchActiveOrdersForUser(postgresDB *sql.DB, username string) ([]ActiveOrder, error) {
	var activeOrders []ActiveOrder

	rows, err := postgresDB.Query("SELECT order_id, user_id, order_type, order_crypto, amount,created_date, order_price FROM crypto.orders WHERE user_id = $1", username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var order ActiveOrder
		err := rows.Scan(&order.OrderID, &order.UserID, &order.OrderType, &order.OrderCrypto, &order.Amount, &order.CreatedDate, &order.OrderPrice)
		if err != nil {
			return nil, err
		}
		activeOrders = append(activeOrders, order)
	}

	return activeOrders, nil
}

func fetchFulfilledOrdersForUser(postgresDB *sql.DB, username string) ([]FulfilledOrder, error) {
	var fulfilledOrders []FulfilledOrder

	rows, err := postgresDB.Query("SELECT order_id, user_id, order_type, order_crypto, amount, fulfillment_date, order_price FROM crypto.fulfilled_orders WHERE user_id = $1", username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var fulfilledOrder FulfilledOrder
		err := rows.Scan(&fulfilledOrder.OrderID, &fulfilledOrder.UserID, &fulfilledOrder.OrderType, &fulfilledOrder.OrderCrypto, &fulfilledOrder.Amount, &fulfilledOrder.FulfillmentDate, &fulfilledOrder.OrderPrice)
		if err != nil {
			return nil, err
		}
		fulfilledOrders = append(fulfilledOrders, fulfilledOrder)
	}

	return fulfilledOrders, nil
}

func main() {
	// Load environment variables from .env
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	mongoURI := os.Getenv("MONGO_URI")
	// Use the SetServerAPIOptions() method to set the Stable API version to 1
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(mongoURI).SetServerAPIOptions(serverAPI)
	// Create a new client and connect to the server
	mongoClient, err := mongo.Connect(context.TODO(), opts)
	if err != nil {
		panic(err)
	}
	defer func() {
		if err = mongoClient.Disconnect(context.TODO()); err != nil {
			panic(err)
		}
	}()
	//  Send a ping to confirm a successful connection
	if err := mongoClient.Database("admin").RunCommand(context.TODO(), bson.D{{"ping", 1}}).Err(); err != nil {
		panic(err)
	}
	fmt.Println("Pinged your deployment. You successfully connected to MongoDB!")
	// Connect to the PostgreSQL database
	// PostgreSQL Connection
	postgresConnectionString := fmt.Sprintf(
		"host=%s port=%s user=%s dbname=%s password=%s sslmode=%s",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_DB"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_SSLMODE"),
	)

	postgresDb, err := sql.Open("postgres", postgresConnectionString)
	if err != nil {
		panic(err)
	}
	if err := postgresDb.Ping(); err != nil {
		log.Fatal("PostgreSQL ping error:", err)
	} else {
		fmt.Println("Pinged your deployment. You successfully connected to PostgreSQL!")
	}

	defer postgresDb.Close()

	// Start the order matching engine in the background
	go startOrderMatchingEngine(postgresDb, mongoClient)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		startTransactionConsumer()
	}()

	go func() {
		defer wg.Done()
		startOrderConsumer()
	}()

	router := mux.NewRouter()

	// Create a CORS handler
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	// Create an HTTP handler for the createorder function
	router.HandleFunc("/createorder", createOrder(postgresDb)).Methods("POST")
	router.HandleFunc("/createFullfilledOrders", createFulfilledOrder(postgresDb)).Methods("POST")
	router.HandleFunc("/fetchActiveAndFulfilledOrders", fetchActiveAndFulfilledOrders(postgresDb)).Methods("GET")
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, Go Backend!")
	}).Methods("GET")

	// Start the HTTP server
	port := 8080
	go func() {
		fmt.Printf("App listening on port %d\n", port) // Print the message to the console
		log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), corsHandler(router)))
	}()

	// Wait for interrupt signal to gracefully shutdown the consumers
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, os.Interrupt, syscall.SIGTERM)
	<-sigchan

	wg.Wait()
	fmt.Println("Shutting down gracefully")
}
