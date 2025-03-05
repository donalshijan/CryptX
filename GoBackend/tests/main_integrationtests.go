package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCreateBuyOrder(t *testing.T) {
	// Start the server
	go main() // Assuming your main function starts the server
	time.Sleep(2 * time.Second) // Give the server some time to start

	order := Order{
		Type:   "buy",
		Amount: 10,
		Price:  100,
		UserId: 1,
		Crypto: "BTC",
	}
	orderJSON, _ := json.Marshal(order)

	req, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(orderJSON))
	assert.NoError(t, err)

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(createOrder)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	// Check the database
	// Your code to check the order in the database
}

func TestCreateSellOrder(t *testing.T) {
	order := Order{
		Type:   "sell",
		Amount: 10,
		Price:  100,
		UserId: 2,
		Crypto: "BTC",
	}
	orderJSON, _ := json.Marshal(order)

	req, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(orderJSON))
	assert.NoError(t, err)

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(createOrder)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	// Check the database
	// Your code to check the order in the database
}

func TestCreateAndFulfillOrders(t *testing.T) {
	// Create a buy order
	buyOrder := Order{
		Type:   "buy",
		Amount: 10,
		Price:  100,
		UserId: 1,
		Crypto: "BTC",
	}
	buyOrderJSON, _ := json.Marshal(buyOrder)

	buyReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(buyOrderJSON))
	assert.NoError(t, err)
	buyRR := httptest.NewRecorder()
	buyHandler := http.HandlerFunc(createOrder)
	buyHandler.ServeHTTP(buyRR, buyReq)
	assert.Equal(t, http.StatusCreated, buyRR.Code)

	// Create a matching sell order
	sellOrder := Order{
		Type:   "sell",
		Amount: 10,
		Price:  100,
		UserId: 2,
		Crypto: "BTC",
	}
	sellOrderJSON, _ := json.Marshal(sellOrder)

	sellReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(sellOrderJSON))
	assert.NoError(t, err)
	sellRR := httptest.NewRecorder()
	sellHandler := http.HandlerFunc(createOrder)
	sellHandler.ServeHTTP(sellRR, sellReq)
	assert.Equal(t, http.StatusCreated, sellRR.Code)

	// Wait for the orders to be fulfilled
	time.Sleep(5 * time.Second)

	// Check the fulfilled_orders table
	// Your code to check the fulfilled orders in the database
}

func TestCreateBuyOrderWithHigherDemand(t *testing.T) {
	// Create a buy order
	buyOrder := Order{
		Type:   "buy",
		Amount: 20,
		Price:  100,
		UserId: 1,
		Crypto: "BTC",
	}
	buyOrderJSON, _ := json.Marshal(buyOrder)

	buyReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(buyOrderJSON))
	assert.NoError(t, err)
	buyRR := httptest.NewRecorder()
	buyHandler := http.HandlerFunc(createOrder)
	buyHandler.ServeHTTP(buyRR, buyReq)
	assert.Equal(t, http.StatusCreated, buyRR.Code)

	// Create a sell order with lower amount
	sellOrder := Order{
		Type:   "sell",
		Amount: 10,
		Price:  100,
		UserId: 2,
		Crypto: "BTC",
	}
	sellOrderJSON, _ := json.Marshal(sellOrder)

	sellReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(sellOrderJSON))
	assert.NoError(t, err)
	sellRR := httptest.NewRecorder()
	sellHandler := http.HandlerFunc(createOrder)
	sellHandler.ServeHTTP(sellRR, sellReq)
	assert.Equal(t, http.StatusCreated, sellRR.Code)

	// Wait for the orders to be fulfilled
	time.Sleep(5 * time.Second)

	// Check the database for the new buy order with remaining amount
	// Your code to check the remaining buy order in the database
}

func TestCreateSellOrderWithHigherSupply(t *testing.T) {
	// Create a sell order
	sellOrder := Order{
		Type:   "sell",
		Amount: 20,
		Price:  100,
		UserId: 2,
		Crypto: "BTC",
	}
	sellOrderJSON, _ := json.Marshal(sellOrder)

	sellReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(sellOrderJSON))
	assert.NoError(t, err)
	sellRR := httptest.NewRecorder()
	sellHandler := http.HandlerFunc(createOrder)
	sellHandler.ServeHTTP(sellRR, sellReq)
	assert.Equal(t, http.StatusCreated, sellRR.Code)

	// Create a buy order with lower amount
	buyOrder := Order{
		Type:   "buy",
		Amount: 10,
		Price:  100,
		UserId: 1,
		Crypto: "BTC",
	}
	buyOrderJSON, _ := json.Marshal(buyOrder)

	buyReq, err := http.NewRequest("POST", "http://localhost:8080/order", bytes.NewBuffer(buyOrderJSON))
	assert.NoError(t, err)
	buyRR := httptest.NewRecorder()
	buyHandler := http.HandlerFunc(createOrder)
	buyHandler.ServeHTTP(buyRR, buyReq)
	assert.Equal(t, http.StatusCreated, buyRR.Code)

	// Wait for the orders to be fulfilled
	time.Sleep(5 * time.Second)

	// Check the database for the new sell order with remaining amount
	// Your code to check the remaining sell order in the database
}
