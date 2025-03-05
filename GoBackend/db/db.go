package db

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type User struct {
	Id                 primitive.ObjectID `bson:"_id,omitempty"`
	Username 			string `bson:"username,omitempty"`
	Password       		string `bson:"password,omitempty"`
	SignupType 			string `bson:"signupType,omitempty"`
	FiatWallet       	float64 `bson:"fiatWallet,omitempty"`
	VerificationStatus 	string `bson:"verificationStatus,omitempty"`
	UserCryptoWalletId 	primitive.ObjectID `bson:"userCryptoWalletId,omitempty"`
}

type CryptoWallet struct {
	Id   primitive.ObjectID  	`bson:"_id,omitempty"`
	BTC  float64				`bson:"BTC,omitempty"`
	ETH  float64				`bson:"ETH,omitempty"`
	LTC  float64				`bson:"LTC,omitempty"`
}

func UpdateUserCryptoWallet(ctx mongo.SessionContext,client *mongo.Client, userID string, cryptoFieldName string, newCryptoValue float64) error {

	db := client.Database("cryptx") // Change to your database name
	usersCollection := db.Collection("users") // Change to your users collection name
	cryptoWalletsCollection := db.Collection("crypto_wallets") // Change to your crypto wallets collection name

	// Fetch user's crypto wallet ID
	var user User
	err := usersCollection.FindOne(ctx, bson.D{{Key: "username", Value: userID}}).Decode(&user)
	if err != nil {
		fmt.Println("Error in UpdateUserCryptoWallet while findind user document", err)
		return err
	}

	// Construct the update field
	updateField := bson.D{{Key: cryptoFieldName, Value: newCryptoValue}}
	// Update the specified crypto field in the crypto_wallets collection
	_, err = cryptoWalletsCollection.UpdateOne(
		ctx,
		bson.D{{Key: "_id", Value: user.UserCryptoWalletId}},
		bson.D{{Key: "$set", Value: updateField}},
	)
	if err != nil {
		fmt.Println("Error in UpdateUserCryptoWallet while updting user cryptowallet", err)
		return err
	}

	fmt.Printf("Updated %s balance for user %d\n", cryptoFieldName, userID)
	return nil
}

func UpdateUserFiatWallet(ctx mongo.SessionContext,client *mongo.Client, userID string, fiatAmount float64) error {

    db := client.Database("cryptx")
    usersCollection := db.Collection("users")

    _, err := usersCollection.UpdateOne(
        ctx,
		bson.D{{Key: "username", Value: userID}},
		bson.D{{Key: "$set", Value: bson.D{{Key: "fiatWallet", Value: fiatAmount}}}},
    )
    if err != nil {
		fmt.Println("Error in UpdateUserFiatWallet while updating user fiat amount", err)
        return err
    }
    return nil
}
func FetchUserFiatWalletFieldAndCryptoField(client *mongo.Client, userID string, cryptoFieldName string) (float64, float64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := client.Database("admin").RunCommand(context.TODO(), bson.D{{"ping", 1}}).Err(); err != nil {
		panic(err)
	  }
	fmt.Println("Pinged your deployment. You successfully connected to MongoDB!")
	db := client.Database("cryptx") // Change to your database name
	usersCollection := db.Collection("users") // Change to your users collection name
	cryptoWalletsCollection := db.Collection("crypto_wallets") // Change to your crypto wallets collection name

	var user User

	err := usersCollection.FindOne(ctx, bson.D{{Key: "username", Value: userID}}).Decode(&user)
	if err != nil {
		fmt.Println("Error in FetchUserFiatWalletFieldAndCryptoField for id :", userID)
		fmt.Println("Error in FetchUserFiatWalletFieldAndCryptoField while finding user document", err)
		return 0, 0, err
	}
	// Fetch user's crypto wallet
	var cryptoWallet CryptoWallet
	err = cryptoWalletsCollection.FindOne(ctx, bson.D{{Key: "_id", Value: user.UserCryptoWalletId}}).Decode(&cryptoWallet)
	if err != nil {
		fmt.Println("Error in FetchUserFiatWalletFieldAndCryptoField while finding cryptoWallet document:", err)
		return 0, 0, err
	}

	var fieldValue float64
	switch cryptoFieldName {
	case "BTC":
		fieldValue = cryptoWallet.BTC
	case "ETH":
		fieldValue = cryptoWallet.ETH
	case "LTC":
		fieldValue = cryptoWallet.LTC
	default:
		return 0, 0, fmt.Errorf("Invalid crypto field name")
	}

	return user.FiatWallet, fieldValue, nil
}
