\c cryptx;

CREATE SCHEMA crypto;

CREATE TABLE crypto.orders (
    order_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), 
    order_type VARCHAR(10) NOT NULL,
    order_crypto VARCHAR(10) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    order_price DECIMAL(18, 8)
);

CREATE TABLE crypto.fulfilled_orders (
    order_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    order_type VARCHAR(10) NOT NULL,
    order_crypto VARCHAR(10) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    fulfillment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    order_price DECIMAL(18, 8)
);
