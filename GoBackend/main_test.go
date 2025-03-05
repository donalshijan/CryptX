package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type OrderStruct struct {
	Market string  `json:"market"`
	Type   string  `json:"type"`
	Amount float64 `json:"amount"`
	Price  float64 `json:"price"`
}

type IngestedOrderForFraudDetection struct {
	ID     string
	Price  float64
	Amount float64
}

func createProducer() (*MockProducer, error) { 
	return &MockProducer{}, nil
}

type MockProducer struct{}

func (mp *MockProducer) Close() {}

func produceOrderMessage(producer *MockProducer, order IngestedOrderForFraudDetection) error {
	return nil
}

func TestCreateOrder(t *testing.T) {
	// Create a new SQL mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Mock the expected SQL queries
	mock.ExpectBegin()
	mock.ExpectQuery("INSERT INTO crypto.orders").
		WithArgs("testuser", "btc", "buy", 1.0, 50000.0).
		WillReturnRows(sqlmock.NewRows([]string{"order_id"}).AddRow("order123"))
	mock.ExpectCommit()

	// Create a test HTTP request
	order := OrderStruct{
		Market: "btc",
		Type:   "buy",
		Amount: 1.0,
		Price:  50000.0,
	}
	orderJSON, err := json.Marshal(order)
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "http://localhost:8080/createorder", bytes.NewBuffer(orderJSON))
	req.Header.Set("Authorization", "Bearer validtoken")
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder
	rr := httptest.NewRecorder()

	// Define the claims and token parsing logic
	jwt.Parse = func(tokenString string, keyFunc jwt.Keyfunc) (*jwt.Token, error) {
		return &jwt.Token{
			Valid: true,
			Claims: jwt.MapClaims{
				"username": "testuser",
			},
		}, nil
	}

	// Create the handler and serve the request
	handler := createOrder(db)
	handler.ServeHTTP(rr, req)

	// Check the response
	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "Order created successfully!", rr.Body.String())

	// Ensure all expectations were met
	err = mock.ExpectationsWereMet()
	require.NoError(t, err)
}

func TestDeleteOrder(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Set up the expected database operation
    orderId := 123
    mock.ExpectExec("DELETE FROM crypto.orders WHERE order_id = \\$1").
        WithArgs(orderId).
        WillReturnResult(sqlmock.NewResult(1, 1))

    // Call the function under test
    err = deleteOrder(db, orderId)

    // Check if the function returned an error
    assert.NoError(t, err, "Expected no error, but got one")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchBuyOrders function
func TestFetchBuyOrders(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Set up the expected database rows
    rows := sqlmock.NewRows([]string{"order_id", "order_type", "amount", "order_price", "order_crypto", "user_id"}).
        AddRow(1, "buy", 10.5, 5000.0, "BTC", "user1").
        AddRow(2, "buy", 20.0, 3000.0, "ETH", "user2")

    // Expect the query to be executed
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'buy'$").
        WillReturnRows(rows)

    // Call the function under test
    buyOrders, err := fetchBuyOrders(db)

    // Check if the function returned an error
    assert.NoError(t, err, "Expected no error, but got one")
    
    // Check if the returned orders match the expected orders
    expectedOrders := []Order{
        {ID: 1, Type: "buy", Amount: 10.5, Price: 5000.0, Crypto: "BTC", UserId: "user1"},
        {ID: 2, Type: "buy", Amount: 20.0, Price: 3000.0, Crypto: "ETH", UserId: "user2"},
    }
    assert.Equal(t, expectedOrders, buyOrders, "Expected orders do not match actual orders")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchBuyOrders function with query error
func TestFetchBuyOrdersQueryError(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Expect the query to be executed and return an error
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'buy'$").
        WillReturnError(sql.ErrConnDone)

    // Call the function under test
    buyOrders, err := fetchBuyOrders(db)

    // Check if the function returned an error
    assert.Error(t, err, "Expected an error, but got none")
    assert.Nil(t, buyOrders, "Expected no orders, but got some")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchBuyOrders function with row scan error
func TestFetchBuyOrdersRowScanError(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Set up the expected database rows with an invalid data type
    rows := sqlmock.NewRows([]string{"order_id", "order_type", "amount", "order_price", "order_crypto", "user_id"}).
        AddRow(1, "buy", "invalid_amount", 5000.0, "BTC", "user1")

    // Expect the query to be executed
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'buy'$").
        WillReturnRows(rows)

    // Call the function under test
    buyOrders, err := fetchBuyOrders(db)

    // Check if the function returned an error
    assert.Error(t, err, "Expected an error, but got none")
    assert.Nil(t, buyOrders, "Expected no orders, but got some")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchSellOrders function
func TestFetchSellOrders(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Set up the expected database rows
    rows := sqlmock.NewRows([]string{"order_id", "order_type", "amount", "order_price", "order_crypto", "user_id"}).
        AddRow(1, "sell", 10.5, 5000.0, "BTC", "user1").
        AddRow(2, "sell", 20.0, 3000.0, "ETH", "user2")

    // Expect the query to be executed
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'sell'$").
        WillReturnRows(rows)

    // Call the function under test
    sellOrders, err := fetchSellOrders(db)

    // Check if the function returned an error
    assert.NoError(t, err, "Expected no error, but got one")
    
    // Check if the returned orders match the expected orders
    expectedOrders := []Order{
        {ID: 1, Type: "sell", Amount: 10.5, Price: 5000.0, Crypto: "BTC", UserId: "user1"},
        {ID: 2, Type: "sell", Amount: 20.0, Price: 3000.0, Crypto: "ETH", UserId: "user2"},
    }
    assert.Equal(t, expectedOrders, sellOrders, "Expected orders do not match actual orders")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchSellOrders function with query error
func TestFetchSellOrdersQueryError(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Expect the query to be executed and return an error
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'sell'$").
        WillReturnError(sql.ErrConnDone)

    // Call the function under test
    sellOrders, err := fetchSellOrders(db)

    // Check if the function returned an error
    assert.Error(t, err, "Expected an error, but got none")
    assert.Nil(t, sellOrders, "Expected no orders, but got some")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

// Test for fetchSellOrders function with row scan error
func TestFetchSellOrdersRowScanError(t *testing.T) {
    // Mock the database connection
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("An error '%s' was not expected when opening a stub database connection", err)
    }
    defer db.Close()

    // Set up the expected database rows with an invalid data type
    rows := sqlmock.NewRows([]string{"order_id", "order_type", "amount", "order_price", "order_crypto", "user_id"}).
        AddRow(1, "sell", "invalid_amount", 5000.0, "BTC", "user1")

    // Expect the query to be executed
    mock.ExpectQuery("^SELECT order_id, order_type, amount, order_price, order_crypto, user_id FROM crypto.orders WHERE order_type = 'sell'$").
        WillReturnRows(rows)

    // Call the function under test
    sellOrders, err := fetchSellOrders(db)

    // Check if the function returned an error
    assert.Error(t, err, "Expected an error, but got none")
    assert.Nil(t, sellOrders, "Expected no orders, but got some")

    // Ensure all expectations were met
    if err := mock.ExpectationsWereMet(); err != nil {
        t.Errorf("There were unfulfilled expectations: %s", err)
    }
}

func TestCreateFulfilledOrder(t *testing.T) {
	// Initialize a mock PostgreSQL database connection
	db, err := sql.Open("postgres", "mock_db_connection_string")
	if err != nil {
		t.Fatalf("error opening database connection: %v", err)
	}
	defer db.Close()

	// Create a request body
	order := Order{
		UserID:     "testuser",
		Crypto:     "BTC",
		Type:       "buy",
		Amount:     1.5,
		Price:      40000.0,
	}
	orderJSON, err := json.Marshal(order)
	if err != nil {
		t.Fatalf("error marshalling JSON: %v", err)
	}

	// Create a mock HTTP request
	req := httptest.NewRequest("POST", "/createfulfilledorder", bytes.NewBuffer(orderJSON))
	req.Header.Set("Content-Type", "application/json")

	// Create a ResponseRecorder (which satisfies http.ResponseWriter) to record the response
	rr := httptest.NewRecorder()

	// Create the handler function using the mock database
	handler := createFulfilledOrder(db)

	// Serve the HTTP request
	handler.ServeHTTP(rr, req)

	// Check the status code
	assert.Equal(t, http.StatusCreated, rr.Code, "status code should be 201 Created")

	// Optionally, check the response body if needed
	expectedBody := "Order created successfully!"
	assert.Equal(t, expectedBody, rr.Body.String(), "response body should match expected")

}