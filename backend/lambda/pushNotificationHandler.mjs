/**
 * Lambda function to handle push notification token registration
 *
 * Expected API Gateway endpoints:
 * POST /notifications/register   - Register a push token for a user
 * POST /notifications/unregister - Remove a push token for a user
 *
 * DynamoDB Table: PushNotificationTokens
 * Schema:
 * - userId (String, Primary Key)
 * - tokens (StringSet) - Set of push tokens for this user
 * - updatedAt (String)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PUSH_TOKENS_TABLE || "PushNotificationTokens";

export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };

  try {
    const path = event.path || event.rawPath;
    const body = JSON.parse(event.body || "{}");
    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "userId and pushToken are required" }),
      };
    }

    // Register token
    if (path.includes("/register")) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: "ADD tokens :token SET updatedAt = :timestamp",
          ExpressionAttributeValues: {
            ":token": docClient.createSet([pushToken]),
            ":timestamp": new Date().toISOString(),
          },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Push token registered successfully" }),
      };
    }

    // Unregister token
    if (path.includes("/unregister")) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: "DELETE tokens :token SET updatedAt = :timestamp",
          ExpressionAttributeValues: {
            ":token": docClient.createSet([pushToken]),
            ":timestamp": new Date().toISOString(),
          },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Push token removed successfully" }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Error handling push token:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
